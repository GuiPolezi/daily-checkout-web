// Camada de serviço: orquestra leitura → regras → lançamento no ledger → projeção.
// Não conhece o Supabase; fala com o banco pela interface GamificationRepo (testável com um fake).

import { mergeConfig, type GamificationConfig } from './config'
import { localDay } from './day'
import { levelFromXp, tierForLevel, titleForLevel } from './levels'
import { reconcileDay } from './reconcile'
import { computeStreak, type StreakState } from './streak'
import type { DaySnapshot, DayTotal, NewEvent, ProgressSummary, SyncResult } from './types'
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
    summary,
  }
}
