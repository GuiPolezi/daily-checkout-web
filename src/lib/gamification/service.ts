// Camada de serviço: orquestra leitura → regras → lançamento no ledger → projeção.
// Não conhece o Supabase; fala com o banco pela interface GamificationRepo (testável com um fake).

import {
  achievementProgress,
  achievementSourceId,
  findNewAchievements,
  type AchievementDefinition,
  type AchievementStats,
} from './achievements'
import { mergeConfig, type GamificationConfig } from './config'
import { localDay } from './day'
import { levelFromXp, tierForLevel, titleForLevel } from './levels'
import { reconcileDay } from './reconcile'
import { computeStreak, type StreakState } from './streak'
import { EVENT_TYPES, type DaySnapshot, type DayTotal, type NewEvent, type ProgressSummary, type SyncResult } from './types'
import { computeDesiredAwards } from './xp'

export interface ProgressRow {
  totalXp: number
  currentStreak: number
  bestStreak: number
  streakShields: number
  lastActiveDay: string | null
}

export interface GamificationRepo {
  /** JSON de sobrescrita vindo de gamification_config (ou null) */
  loadConfigOverride(): Promise<unknown>
  loadDay(userId: string, day: string): Promise<DaySnapshot>
  loadDayTotals(userId: string): Promise<DayTotal[]>
  /** Deve ignorar eventos cuja idempotency_key já exista */
  insertEvents(events: NewEvent[]): Promise<void>
  saveProgress(userId: string, progress: ProgressRow): Promise<void>
  /** Contagens e conquistas já desbloqueadas; null se a estrutura de conquistas ainda não existe no banco */
  loadAchievementState(userId: string): Promise<AchievementState | null>
  unlockAchievements(userId: string, achievements: AchievementDefinition[]): Promise<void>
}

export interface AchievementState {
  counts: Pick<AchievementStats, 'tasksCompleted' | 'routinesCompleted' | 'checkouts' | 'perfectDays'>
  unlocked: { id: string; unlockedAt: string }[]
}

/**
 * Desbloqueia o que o usuário já conquistou. O XP da conquista entra no ledger com chave própria
 * (uma por usuário e conquista), então nunca é pago duas vezes.
 */
async function syncAchievements(
  repo: GamificationRepo,
  userId: string,
  extra: Pick<AchievementStats, 'bestStreak' | 'level'>,
  now: Date,
  config: GamificationConfig
): Promise<Pick<SyncResult, 'unlocked' | 'achievements'> & { paidXp: boolean }> {
  if (!config.achievements.enabled) return { unlocked: [], achievements: null, paidXp: false }
  const state = await repo.loadAchievementState(userId)
  if (!state) return { unlocked: [], achievements: null, paidXp: false }

  const stats: AchievementStats = { ...state.counts, ...extra }
  const fresh = findNewAchievements(stats, state.unlocked.map(item => item.id))
  const rewards: NewEvent[] = fresh
    .filter(item => item.xpReward > 0)
    .map(item => ({
      userId,
      type: EVENT_TYPES.ACHIEVEMENT,
      amount: item.xpReward,
      sourceId: achievementSourceId(item.id),
      day: null,
      idempotencyKey: `${userId}:achievement:${item.id}`,
      metadata: { title: item.title, metric: item.metric, target: item.target },
    }))

  if (fresh.length > 0) {
    // O XP vai primeiro: se o registro do desbloqueio falhar, a próxima sincronização repete os dois passos sem duplicar
    await repo.insertEvents(rewards)
    await repo.unlockAchievements(userId, fresh)
  }

  const unlockedAt = now.toISOString()
  return {
    unlocked: fresh.map(({ id, title, description, xpReward }) => ({ id, title, description, xpReward })),
    achievements: achievementProgress(stats, [...state.unlocked, ...fresh.map(item => ({ id: item.id, unlockedAt }))]),
    paidXp: rewards.length > 0,
  }
}

const sumXp = (totals: DayTotal[]) => Math.max(0, totals.reduce((sum, t) => sum + t.totalXp, 0))

const activeDays = (totals: DayTotal[]) =>
  totals.filter((t): t is DayTotal & { day: string } => t.day !== null && t.activityXp > 0).map(t => t.day)

export function buildSummary(totals: DayTotal[], streak: StreakState, today: string, config: GamificationConfig): ProgressSummary {
  const totalXp = sumXp(totals)
  const progress = levelFromXp(totalXp, config.level)
  return {
    totalXp,
    level: progress.level,
    title: titleForLevel(progress.level, config.titles),
    tier: tierForLevel(progress.level, config.titles),
    xpIntoLevel: progress.xpIntoLevel,
    xpForNext: progress.xpForNext,
    isMaxLevel: progress.isMaxLevel,
    currentStreak: streak.current,
    bestStreak: streak.best,
    shields: streak.shields,
    maxShields: config.streak.maxShields,
    xpToday: totals.find(t => t.day === today)?.totalXp ?? 0,
    today,
    levelConfig: config.level,
    titles: config.titles,
  }
}

/**
 * Sincroniza o XP de um dia do usuário com o estado real do banco.
 * É idempotente: chamar duas vezes seguidas não lança nada na segunda.
 */
export async function syncDay(repo: GamificationRepo, userId: string, day: string, now: Date = new Date()): Promise<SyncResult> {
  const config = mergeConfig(await repo.loadConfigOverride())
  const today = localDay(now, config.timeZone)

  const [snapshot, totalsBefore] = await Promise.all([repo.loadDay(userId, day), repo.loadDayTotals(userId)])

  const desired = computeDesiredAwards({ day, snapshot, activeDaysBefore: activeDays(totalsBefore), config })
  const newEvents = reconcileDay({ userId, day, desired, events: snapshot.events, isToday: day === today })

  let totalsAfter = totalsBefore
  if (newEvents.length > 0) {
    await repo.insertEvents(newEvents)
    // Relê do banco: se outra sincronização lançou os mesmos eventos, o total continua correto
    totalsAfter = await repo.loadDayTotals(userId)
  }

  const streak = computeStreak(activeDays(totalsAfter), today, config)
  const levelNow = levelFromXp(sumXp(totalsAfter), config.level).level
  const achievements = await syncAchievements(repo, userId, { bestStreak: streak.best, level: levelNow }, now, config)
  if (achievements.paidXp) totalsAfter = await repo.loadDayTotals(userId)

  const summary = buildSummary(totalsAfter, streak, today, config)

  // A projeção é regravada sempre: a sequência muda com o passar dos dias mesmo sem eventos novos
  await repo.saveProgress(userId, {
    totalXp: summary.totalXp,
    currentStreak: streak.current,
    bestStreak: streak.best,
    streakShields: streak.shields,
    lastActiveDay: streak.lastActiveDay,
  })

  const levelBefore = levelFromXp(sumXp(totalsBefore), config.level).level
  const delta = sumXp(totalsAfter) - sumXp(totalsBefore)

  return {
    day,
    delta,
    events: newEvents.map(({ type, amount, sourceId }) => ({ type, amount, sourceId })),
    leveledUp: summary.level > levelBefore ? { from: levelBefore, to: summary.level, title: summary.title } : null,
    taskXp: Object.fromEntries(
      desired
        .filter(award => award.kind === 'task')
        .map(award => [award.sourceId.split(':')[1], { amount: award.amount, reason: award.reason }])
    ),
    unlocked: achievements.unlocked,
    achievements: achievements.achievements,
    summary,
  }
}
