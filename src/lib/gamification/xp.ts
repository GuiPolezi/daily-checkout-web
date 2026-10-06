// Regras de XP: funções puras. Recebem o retrato do dia lido no servidor e devolvem
// quanto cada origem deveria valer. Nenhum valor vem do cliente.

import type { GamificationConfig } from './config'
import { EVERY_DAY, isWorkday, localDay, weekdayName } from './day'
import { dailyMissionAwards, dailyMissionStats } from './missions'
import { computeStreak, streakMultiplier } from './streak'
import type { Award, DaySnapshot, DayTask } from './types'

export const COMPLETED_STATUS = 'Concluída'

export const sourceIds = {
  task: (id: number) => `task:${id}`,
  routine: (id: number) => `routine:${id}`,
  checkout: 'checkout',
  perfectDay: 'perfect_day',
  streakMilestone: (days: number) => `streak_milestone:${days}`,
}

export interface TaskXpInput {
  base: number
  priorityMultiplier: number
  streakMultiplier: number
}

/** xp_tarefa = round(base × mult_prioridade × mult_sequencia) */
export function xpForTask({ base, priorityMultiplier, streakMultiplier: streak }: TaskXpInput): number {
  return Math.max(0, Math.round(base * priorityMultiplier * streak))
}

const normalizeTitle = (title: string) => title.trim().toLowerCase().replace(/\s+/g, ' ')

// Compara como instante, não como texto: o banco omite zeros finais na fração de segundo
const completionTime = (task: DayTask) => (task.completedAt ? Date.parse(task.completedAt) : 0)

const byCompletion = (a: DayTask, b: DayTask) => completionTime(a) - completionTime(b) || a.id - b.id

function taskAwards(day: string, tasks: DayTask[], streakDays: number, config: GamificationConfig): Award[] {
  const streakMult = streakMultiplier(streakDays, config.streak)
  const seenTitles = new Set<string>()
  // Teto 0 = sem teto (padrão): toda tarefa concluída rende XP
  let capRemaining = config.task.dailyCap > 0 ? config.task.dailyCap : Number.POSITIVE_INFINITY

  return tasks
    .filter(task => task.status === COMPLETED_STATUS)
    .sort(byCompletion)
    .map(task => {
      const sourceId = sourceIds.task(task.id)
      const zero = (reason: Award['reason']): Award => ({
        sourceId, kind: 'task', amount: 0, reason, metadata: { title: task.title, reason },
      })

      // Sem data de conclusão gravada pelo banco = concluída antes da gamificação existir
      if (!task.completedAt) return zero('legacy')
      // Só vale XP quando a conclusão acontece no próprio dia da tarefa
      if (localDay(task.completedAt, config.timeZone) !== day) return zero('outside_day')

      const elapsedMs = task.createdAt
        ? new Date(task.completedAt).getTime() - new Date(task.createdAt).getTime()
        : Number.POSITIVE_INFINITY
      // Com o tempo mínimo em 0 a regra fica desligada de fato (nem diferença de relógio a aciona)
      if (config.task.minSecondsToComplete > 0 && elapsedMs < config.task.minSecondsToComplete * 1000) return zero('too_fast')

      const title = normalizeTitle(task.title)
      if (config.task.dedupeTitles && seenTitles.has(title)) return zero('duplicate')
      seenTitles.add(title)

      const priorityMultiplier =
        config.task.priorityMultipliers[task.priority as keyof typeof config.task.priorityMultipliers] ?? 1
      const raw = xpForTask({ base: config.task.baseXp, priorityMultiplier, streakMultiplier: streakMult })
      const amount = Math.min(raw, Math.max(0, capRemaining))
      capRemaining -= amount
      const reason: Award['reason'] = amount < raw ? 'daily_cap' : 'ok'

      return {
        sourceId,
        kind: 'task',
        amount,
        reason,
        metadata: {
          title: task.title,
          base: config.task.baseXp,
          priority: task.priority,
          priorityMultiplier,
          streakDays,
          streakMultiplier: streakMult,
          raw,
          dailyCap: config.task.dailyCap,
          reason,
        },
      }
    })
}

function routineAwards(day: string, snapshot: DaySnapshot, streakDays: number, config: GamificationConfig) {
  const todayName = weekdayName(day)
  // Só contam as rotinas previstas para este dia da semana (ou "todos os dias")
  const scheduled = snapshot.routineTasks.filter(t => t.dayOfWeek === EVERY_DAY || t.dayOfWeek === todayName)
  const done = new Set(snapshot.completedRoutineIds)
  const streakMult = streakMultiplier(streakDays, config.streak)
  const raw = xpForTask({ base: config.task.routineBaseXp, priorityMultiplier: 1, streakMultiplier: streakMult })
  let capRemaining = config.task.routineDailyCap > 0 ? config.task.routineDailyCap : Number.POSITIVE_INFINITY

  const awards: Award[] = scheduled
    .filter(task => done.has(task.id))
    .sort((a, b) => a.id - b.id)
    .map(task => {
      const amount = Math.min(raw, Math.max(0, capRemaining))
      capRemaining -= amount
      const reason: Award['reason'] = amount < raw ? 'daily_cap' : 'ok'
      return {
        sourceId: sourceIds.routine(task.id),
        kind: 'routine',
        amount,
        reason,
        metadata: {
          base: config.task.routineBaseXp, streakDays, streakMultiplier: streakMult, weekday: todayName,
          raw, dailyCap: config.task.routineDailyCap, reason,
        },
      }
    })

  const isPerfectDay = scheduled.length > 0 && awards.length === scheduled.length
  return { awards, isPerfectDay, scheduledCount: scheduled.length }
}

export interface DesiredAwardsInput {
  day: string
  snapshot: DaySnapshot
  /** Dias (anteriores a `day`) em que o usuário teve XP de tarefa ou rotina */
  activeDaysBefore: string[]
  config: GamificationConfig
}

/** Calcula, do zero, tudo o que o dia deveria render de XP. */
export function computeDesiredAwards({ day, snapshot, activeDaysBefore, config }: DesiredAwardsInput): Award[] {
  const previousDays = activeDaysBefore.filter(d => d < day)
  // Sequência com que o usuário "entrou" no dia — o multiplicador não muda ao longo do dia
  const streakDays = computeStreak(previousDays, day, config).current

  const tasks = taskAwards(day, snapshot.tasks, streakDays, config)
  const routine = routineAwards(day, snapshot, streakDays, config)
  const awards: Award[] = [...tasks, ...routine.awards]

  const activityXp = awards.reduce((sum, award) => sum + award.amount, 0)

  // O bônus de checkout exige que o dia tenha rendido XP de verdade (tarefa ou rotina)
  if (snapshot.hasCheckout && activityXp > 0 && config.bonus.dailyCheckout > 0) {
    awards.push({
      sourceId: sourceIds.checkout, kind: 'checkout', amount: config.bonus.dailyCheckout, reason: 'ok',
      metadata: { bonus: 'daily_checkout' },
    })
  }

  if (routine.isPerfectDay && config.bonus.perfectDay > 0) {
    awards.push({
      sourceId: sourceIds.perfectDay, kind: 'perfect_day', amount: config.bonus.perfectDay, reason: 'ok',
      metadata: { bonus: 'perfect_day', routineTasks: routine.scheduledCount },
    })
  }

  if (activityXp > 0 && isWorkday(day, config.workdays) && config.streak.milestoneBonus > 0) {
    const streakAfter = computeStreak([...previousDays, day], day, config).current
    if (config.streak.milestones.includes(streakAfter)) {
      awards.push({
        sourceId: sourceIds.streakMilestone(streakAfter), kind: 'streak_milestone',
        amount: config.streak.milestoneBonus, reason: 'ok',
        metadata: { bonus: 'streak_milestone', streakDays: streakAfter },
      })
    }
  }

  // Missões diárias: contam só o que rendeu XP de tarefa/rotina, e são estornadas junto se isso for desfeito
  awards.push(...dailyMissionAwards(dailyMissionStats(awards, snapshot.hasCheckout), config))

  return awards
}
