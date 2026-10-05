// Tipos compartilhados entre as regras (puras), o serviço e as telas.

import type { AchievementProgress } from './achievements'
import type { AvatarState } from './avatar'
import type { MissionProgress } from './missions'
import type { TeamGoalProgress } from './team'
import type { GamificationConfig, LevelTitle } from './config'

export const EVENT_TYPES = {
  TASK_COMPLETED: 'TASK_COMPLETED',
  TASK_REVERTED: 'TASK_REVERTED',
  ROUTINE_COMPLETED: 'ROUTINE_COMPLETED',
  ROUTINE_REVERTED: 'ROUTINE_REVERTED',
  DAILY_CHECKOUT: 'DAILY_CHECKOUT',
  PERFECT_DAY: 'PERFECT_DAY',
  STREAK_BONUS: 'STREAK_BONUS',
  BONUS_REVERTED: 'BONUS_REVERTED',
  MISSION_COMPLETED: 'MISSION_COMPLETED',
  TEAM_GOAL: 'TEAM_GOAL',
  BACKFILL: 'BACKFILL',
  ACHIEVEMENT: 'ACHIEVEMENT',
} as const

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES]

export type AwardKind = 'task' | 'routine' | 'checkout' | 'perfect_day' | 'streak_milestone' | 'mission'

export type AwardReason =
  | 'ok'
  | 'daily_cap'
  | 'too_fast'
  | 'duplicate'
  | 'outside_day'
  | 'legacy'

export interface DayTask {
  id: number
  title: string
  priority: string
  status: string
  createdAt: string | null
  completedAt: string | null
}

export interface RoutineTask {
  id: number
  dayOfWeek: string
}

export interface LedgerEvent {
  sourceId: string | null
  type: string
  amount: number
}

/** Tudo o que o servidor leu do banco sobre um dia de um usuário */
export interface DaySnapshot {
  tasks: DayTask[]
  routineTasks: RoutineTask[]
  completedRoutineIds: number[]
  hasCheckout: boolean
  events: LedgerEvent[]
}

/** Quanto XP uma origem (tarefa, rotina, bônus) deveria ter no dia */
export interface Award {
  sourceId: string
  kind: AwardKind
  amount: number
  reason: AwardReason
  metadata: Record<string, unknown>
}

export interface NewEvent {
  userId: string
  type: EventType
  amount: number
  sourceId: string
  /** null = lançamento sem dia (conquistas, backfill): entra no total, fica fora da reconciliação diária */
  day: string | null
  idempotencyKey: string
  metadata: Record<string, unknown>
}

export interface DayTotal {
  /** null = eventos sem dia (ex.: backfill) */
  day: string | null
  totalXp: number
  activityXp: number
}

export interface ProgressSummary {
  totalXp: number
  level: number
  title: string
  tier: number
  xpIntoLevel: number
  xpForNext: number
  isMaxLevel: boolean
  currentStreak: number
  bestStreak: number
  shields: number
  maxShields: number
  xpToday: number
  today: string
  levelConfig: GamificationConfig['level']
  titles: LevelTitle[]
}

export interface SyncResult {
  day: string
  /** Soma do XP lançado nesta sincronização (negativo = estorno) */
  delta: number
  events: { type: EventType; amount: number; sourceId: string }[]
  leveledUp: { from: number; to: number; title: string } | null
  /** XP atual de cada tarefa concluída do dia, com o motivo quando é zero */
  taskXp: Record<string, { amount: number; reason: AwardReason }>
  /** Conquistas desbloqueadas nesta sincronização */
  unlocked: { id: string; title: string; description: string; xpReward: number }[]
  /** XP de conquista lançado de fato nesta sincronização (já incluído em `delta`) */
  achievementXp: number
  /** Catálogo com o progresso do usuário; null quando as conquistas não estão disponíveis */
  achievements: AchievementProgress[] | null
  /** Missões; null quando desligadas. `daily` só vem quando o dia sincronizado é hoje */
  missions: { daily: MissionProgress[] | null; weekly: MissionProgress[] | null } | null
  /** Metas cooperativas da semana (só números da equipe, nada por pessoa); null se desligadas ou indisponíveis */
  team: TeamGoalProgress[] | null
  /** Personagem: itens do catálogo e o que está equipado; null se indisponível */
  avatar: AvatarState | null
  summary: ProgressSummary
}
