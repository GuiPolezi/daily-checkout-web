// Missões (Fase 2): catálogo e avaliação, em funções puras.
// As recompensas ficam em config.missions.rewards — os valores atuais são provisórios.
//
// - Missões diárias fazem parte da reconciliação do dia: se o usuário desfaz o que cumpriu a
//   missão, o XP dela é estornado como qualquer outro.
// - Missões semanais são pagas uma vez por semana e não são retiradas depois.

import type { GamificationConfig } from './config'
import { addDays, isWorkday, weekdayIndex } from './day'
import type { Award, DayTotal } from './types'

export interface DailyMissionStats {
  /** Tarefas avulsas que renderam XP no dia */
  paidTasks: number
  /** Rotinas que renderam XP no dia */
  paidRoutines: number
  /** Passos do "dia redondo": tarefa com XP, rotina com XP e checkout enviado (0 a 3) */
  fullDaySteps: number
}

export interface WeeklyMissionStats {
  activeWorkdays: number
  weekXp: number
}

export type MissionId = keyof GamificationConfig['missions']['rewards']

interface MissionBase {
  id: MissionId
  title: string
  description: string
  target: number
}

export interface DailyMission extends MissionBase {
  period: 'daily'
  metric: keyof DailyMissionStats
}

export interface WeeklyMission extends MissionBase {
  period: 'weekly'
  metric: keyof WeeklyMissionStats
}

export interface MissionProgress {
  id: MissionId
  period: 'daily' | 'weekly'
  title: string
  description: string
  current: number
  target: number
  reward: number
  done: boolean
}

export const DAILY_MISSIONS: DailyMission[] = [
  { id: 'daily_tasks_3', period: 'daily', metric: 'paidTasks', target: 3, title: 'Três Notas', description: 'Conclua 3 tarefas que rendam XP hoje.' },
  { id: 'daily_routine_2', period: 'daily', metric: 'paidRoutines', target: 2, title: 'Ritual Duplo', description: 'Marque 2 tarefas de rotina hoje.' },
  { id: 'daily_full', period: 'daily', metric: 'fullDaySteps', target: 3, title: 'Dia Redondo', description: 'Conclua uma tarefa, marque uma rotina e envie o checkout.' },
]

export const WEEKLY_MISSIONS: WeeklyMission[] = [
  { id: 'weekly_active_3', period: 'weekly', metric: 'activeWorkdays', target: 3, title: 'Constância', description: 'Tenha 3 dias úteis ativos na semana.' },
  { id: 'weekly_active_5', period: 'weekly', metric: 'activeWorkdays', target: 5, title: 'Semana Cheia', description: 'Tenha 5 dias úteis ativos na semana.' },
  { id: 'weekly_xp_300', period: 'weekly', metric: 'weekXp', target: 300, title: 'Colheita da Semana', description: 'Some 300 XP na semana.' },
]

export const missionSourceId = (id: string) => `mission:${id}`

/** Contagens do dia a partir do que as regras de XP já calcularam */
export function dailyMissionStats(awards: Award[], hasCheckout: boolean): DailyMissionStats {
  const paidTasks = awards.filter(a => a.kind === 'task' && a.amount > 0).length
  const paidRoutines = awards.filter(a => a.kind === 'routine' && a.amount > 0).length
  return {
    paidTasks,
    paidRoutines,
    fullDaySteps: Number(paidTasks > 0) + Number(paidRoutines > 0) + Number(hasCheckout),
  }
}

export function dailyMissionProgress(stats: DailyMissionStats, config: GamificationConfig): MissionProgress[] {
  return DAILY_MISSIONS.map(({ metric, ...mission }) => ({
    ...mission,
    current: Math.min(stats[metric], mission.target),
    reward: config.missions.rewards[mission.id],
    done: stats[metric] >= mission.target,
  }))
}

/** XP de missão diária que o dia deveria ter (entra na reconciliação) */
export function dailyMissionAwards(stats: DailyMissionStats, config: GamificationConfig): Award[] {
  if (!config.missions.enabled) return []
  return dailyMissionProgress(stats, config)
    .filter(mission => mission.done && mission.reward > 0)
    .map(mission => ({
      sourceId: missionSourceId(mission.id),
      kind: 'mission',
      amount: mission.reward,
      reason: 'ok',
      metadata: { title: mission.title, mission: mission.id, target: mission.target },
    }))
}

/** Semana de segunda a domingo que contém `day` */
export function weekRange(day: string): { start: string; end: string } {
  const start = addDays(day, -((weekdayIndex(day) + 6) % 7))
  return { start, end: addDays(start, 6) }
}

export function weeklyMissionStats(totals: DayTotal[], today: string, config: GamificationConfig): WeeklyMissionStats {
  const { start, end } = weekRange(today)
  const week = totals.filter((t): t is DayTotal & { day: string } => t.day !== null && t.day >= start && t.day <= end)
  return {
    activeWorkdays: week.filter(t => t.activityXp > 0 && isWorkday(t.day, config.workdays)).length,
    weekXp: Math.max(0, week.reduce((sum, t) => sum + t.totalXp, 0)),
  }
}

export function weeklyMissionProgress(
  stats: WeeklyMissionStats,
  alreadyPaid: ReadonlySet<string>,
  config: GamificationConfig
): MissionProgress[] {
  return WEEKLY_MISSIONS.map(({ metric, ...mission }) => {
    const done = alreadyPaid.has(mission.id) || stats[metric] >= mission.target
    return {
      ...mission,
      current: done ? mission.target : Math.min(stats[metric], mission.target),
      reward: config.missions.rewards[mission.id],
      done,
    }
  })
}
