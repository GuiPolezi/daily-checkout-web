// Metas cooperativas da equipe (Fase 3): avaliação em funções puras.
// A meta é da equipe inteira — não há ranking nem números por pessoa. Quando a equipe bate a meta,
// todo mundo que contribuiu na semana recebe a mesma recompensa.
// Alvos e recompensas ficam em config.team.goals — os valores atuais são provisórios.

import type { GamificationConfig } from './config'
import { isWorkday } from './day'

/** XP de atividade (tarefa/rotina) de uma pessoa em um dia da semana */
export interface TeamWeekRow {
  userId: string
  day: string
  activityXp: number
}

export interface TeamWeekStats {
  /** Soma, entre todas as pessoas, dos dias úteis com atividade */
  activeDays: number
  /** XP de tarefas e rotinas da equipe na semana */
  activityXp: number
  /** Quantas pessoas tiveram atividade na semana */
  contributors: number
}

export type TeamGoalId = keyof GamificationConfig['team']['goals']

export interface TeamGoalProgress {
  id: TeamGoalId
  title: string
  description: string
  current: number
  target: number
  reward: number
  done: boolean
  /** Pessoas com atividade na semana; null enquanto o progresso está oculto */
  contributors: number | null
  /** true quando há poucas pessoas contribuindo e o total da equipe não é mostrado */
  progressHidden: boolean
  /** Quantas pessoas precisam contribuir para o progresso aparecer */
  minContributors: number
  /** O usuário contribuiu na semana (só quem contribui recebe a recompensa) */
  contributed: boolean
}

interface TeamGoal {
  id: TeamGoalId
  metric: keyof Pick<TeamWeekStats, 'activeDays' | 'activityXp'>
  title: string
  describe: (target: number) => string
}

export const TEAM_GOALS: TeamGoal[] = [
  {
    id: 'team_active_days',
    metric: 'activeDays',
    title: 'Semana em Conjunto',
    describe: target => `Somando todo mundo, a equipe chega a ${target} dias úteis ativos na semana.`,
  },
  {
    id: 'team_activity_xp',
    metric: 'activityXp',
    title: 'Colheita Coletiva',
    describe: target => `A equipe soma ${target} XP de tarefas e rotinas na semana.`,
  },
]

export const teamGoalSourceId = (id: string) => `team:${id}`

export function teamWeekStats(rows: TeamWeekRow[], config: GamificationConfig): TeamWeekStats {
  const active = rows.filter(row => row.activityXp > 0)
  return {
    activeDays: active.filter(row => isWorkday(row.day, config.workdays)).length,
    activityXp: active.reduce((sum, row) => sum + row.activityXp, 0),
    contributors: new Set(active.map(row => row.userId)).size,
  }
}

export const hasContributed = (rows: TeamWeekRow[], userId: string) =>
  rows.some(row => row.userId === userId && row.activityXp > 0)

export function teamGoalProgress(
  stats: TeamWeekStats,
  contributed: boolean,
  alreadyPaid: ReadonlySet<string>,
  config: GamificationConfig
): TeamGoalProgress[] {
  // Com poucas pessoas, "total da equipe menos o meu" é o número exato de um colega:
  // nesse caso só o estado (batida ou não) sai do servidor, nunca o total parcial.
  const minContributors = Math.max(1, Math.floor(config.team.minContributorsToShow))
  const progressHidden = stats.contributors < minContributors

  return TEAM_GOALS.filter(goal => config.team.goals[goal.id].target > 0).map(goal => {
    const { target, reward } = config.team.goals[goal.id]
    const done = alreadyPaid.has(goal.id) || stats[goal.metric] >= target
    const visibleCurrent = progressHidden ? 0 : Math.min(stats[goal.metric], target)
    return {
      id: goal.id,
      title: goal.title,
      description: goal.describe(target),
      current: done ? target : visibleCurrent,
      target,
      reward,
      done,
      contributors: progressHidden ? null : stats.contributors,
      progressHidden,
      minContributors,
      contributed,
    }
  })
}
