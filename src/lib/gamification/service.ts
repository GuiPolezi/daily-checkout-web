// Camada de serviço: orquestra leitura → regras → lançamento no ledger → projeção.
// Não conhece o Supabase; fala com o banco pela interface GamificationRepo (testável com um fake).

import {
  achievementProgress,
  achievementSourceId,
  findNewAchievements,
  type AchievementDefinition,
  type AchievementStats,
} from './achievements'
import { checkEquip, resolveAvatar, type AvatarSlot, type AvatarState, type EquipError } from './avatar'
import { mergeConfig, type GamificationConfig } from './config'
import { localDay } from './day'
import { levelFromXp, tierForLevel, titleForLevel } from './levels'
import {
  dailyMissionProgress,
  dailyMissionStats,
  missionSourceId,
  weeklyMissionProgress,
  weeklyMissionStats,
  weekRange,
  WEEKLY_MISSIONS,
} from './missions'
import { reconcileDay } from './reconcile'
import { hasContributed, TEAM_GOALS, teamGoalProgress, teamGoalSourceId, teamWeekStats, type TeamWeekRow } from './team'
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

export interface AchievementState {
  counts: Pick<AchievementStats, 'tasksCompleted' | 'routinesCompleted' | 'checkouts' | 'perfectDays'>
  unlocked: { id: string; unlockedAt: string }[]
}

export interface GamificationRepo {
  /** JSON de sobrescrita vindo de gamification_config (ou null) */
  loadConfigOverride(): Promise<unknown>
  loadDay(userId: string, day: string): Promise<DaySnapshot>
  loadDayTotals(userId: string): Promise<DayTotal[]>
  /** Deve ignorar eventos cuja idempotency_key já exista */
  insertEvents(events: NewEvent[]): Promise<void>
  /** Das chaves informadas, quais já existem no ledger */
  loadExistingKeys(keys: string[]): Promise<string[]>
  saveProgress(userId: string, progress: ProgressRow): Promise<void>
  /** Contagens e conquistas já desbloqueadas; null se a estrutura de conquistas ainda não existe no banco */
  loadAchievementState(userId: string): Promise<AchievementState | null>
  /** Registra os desbloqueios e devolve os ids que foram realmente inseridos agora */
  unlockAchievements(userId: string, achievements: AchievementDefinition[]): Promise<string[]>
  /** XP de atividade por pessoa e dia, de toda a equipe, no intervalo informado */
  loadTeamWeek(start: string, end: string): Promise<TeamWeekRow[]>
  /** O que o usuário tem equipado (JSON livre; é validado pelo serviço) */
  loadAvatar(userId: string): Promise<unknown>
  /** Troca um slot; `merged` é o estado completo esperado, usado quando a troca atômica não está disponível */
  saveAvatarSlot(userId: string, slot: AvatarSlot, itemId: string, merged: Record<AvatarSlot, string>): Promise<void>
}

const MAX_ACHIEVEMENT_PASSES = 3

const sumXp = (totals: DayTotal[]) => Math.max(0, totals.reduce((sum, t) => sum + t.totalXp, 0))

const levelOf = (totals: DayTotal[], config: GamificationConfig) => levelFromXp(sumXp(totals), config.level).level

const activeDays = (totals: DayTotal[]) =>
  totals.filter((t): t is DayTotal & { day: string } => t.day !== null && t.activityXp > 0).map(t => t.day)

/**
 * Conquistas, missões semanais e personagem são extras: se um deles falhar, o XP do dia
 * (que já foi lançado) não pode ser derrubado junto. A falha é registrada e o extra some da resposta.
 */
async function safely<T>(label: string, fallback: T, run: () => Promise<T>, onFailure?: () => void): Promise<T> {
  try {
    return await run()
  } catch (error) {
    console.error(`[gamification] ${label} falhou`, error instanceof Error ? error.message : error)
    onFailure?.()
    return fallback
  }
}

type AchievementsResult = Pick<SyncResult, 'unlocked' | 'achievements'> & {
  /** Há recompensa em XP entre as conquistas avaliadas (pode já ter sido paga antes) */
  paidXp: boolean
  /** XP que esta chamada realmente lançou no ledger */
  newXp: number
}

const NO_ACHIEVEMENTS: AchievementsResult = { unlocked: [], achievements: null, paidXp: false, newXp: 0 }

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
): Promise<AchievementsResult> {
  if (!config.achievements.enabled) return NO_ACHIEVEMENTS
  const state = await repo.loadAchievementState(userId)
  if (!state) return NO_ACHIEVEMENTS

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

  let inserted: string[] = []
  let newXp = 0
  if (fresh.length > 0) {
    // Numa nova tentativa o XP pode já estar no ledger: só o que ainda não existe conta como lançado agora
    const alreadyPaid = new Set(await repo.loadExistingKeys(rewards.map(reward => reward.idempotencyKey)))
    newXp = rewards.filter(reward => !alreadyPaid.has(reward.idempotencyKey)).reduce((sum, reward) => sum + reward.amount, 0)
    // O XP vai primeiro: se o registro do desbloqueio falhar, a próxima sincronização repete os dois passos sem duplicar
    await repo.insertEvents(rewards)
    inserted = await repo.unlockAchievements(userId, fresh)
  }

  const unlockedAt = now.toISOString()
  return {
    // Só o que esta sincronização registrou de fato: outra aba simultânea não repete o aviso
    unlocked: fresh
      .filter(item => inserted.includes(item.id))
      .map(({ id, title, description, xpReward }) => ({ id, title, description, xpReward })),
    achievements: achievementProgress(stats, [...state.unlocked, ...fresh.map(item => ({ id: item.id, unlockedAt }))]),
    paidXp: rewards.length > 0,
    newXp,
  }
}

/** Paga as missões semanais cumpridas (uma vez por semana cada) e devolve o progresso da semana. */
async function syncWeeklyMissions(repo: GamificationRepo, userId: string, totals: DayTotal[], today: string, config: GamificationConfig) {
  const week = weekRange(today)
  const stats = weeklyMissionStats(totals, today, config)
  const keyOf = (id: string) => `${userId}:mission:${id}:${week.start}`

  const existing = new Set(await repo.loadExistingKeys(WEEKLY_MISSIONS.map(mission => keyOf(mission.id))))
  const alreadyPaid = new Set(WEEKLY_MISSIONS.filter(mission => existing.has(keyOf(mission.id))).map(mission => mission.id as string))

  const rewards: NewEvent[] = WEEKLY_MISSIONS
    .filter(mission => !alreadyPaid.has(mission.id) && stats[mission.metric] >= mission.target && config.missions.rewards[mission.id] > 0)
    .map(mission => ({
      userId,
      type: EVENT_TYPES.MISSION_COMPLETED,
      amount: config.missions.rewards[mission.id],
      sourceId: missionSourceId(mission.id),
      day: null,
      idempotencyKey: keyOf(mission.id),
      metadata: { title: mission.title, mission: mission.id, weekStart: week.start, target: mission.target },
    }))

  if (rewards.length > 0) await repo.insertEvents(rewards)
  return { progress: weeklyMissionProgress(stats, alreadyPaid, config), paidXp: rewards.length > 0 }
}

/**
 * Metas da equipe: quando a equipe bate a meta da semana, cada pessoa que contribuiu recebe a
 * recompensa uma vez (na própria sincronização). A resposta só traz números agregados.
 */
async function syncTeamGoals(repo: GamificationRepo, userId: string, today: string, config: GamificationConfig) {
  const week = weekRange(today)
  const rows = await repo.loadTeamWeek(week.start, week.end)
  const stats = teamWeekStats(rows, config)
  const contributed = hasContributed(rows, userId)
  const keyOf = (id: string) => `${userId}:team:${id}:${week.start}`

  const existing = new Set(await repo.loadExistingKeys(TEAM_GOALS.map(goal => keyOf(goal.id))))
  const alreadyPaid = new Set(TEAM_GOALS.filter(goal => existing.has(keyOf(goal.id))).map(goal => goal.id as string))

  const rewards: NewEvent[] = TEAM_GOALS
    .filter(goal => {
      const { target, reward } = config.team.goals[goal.id]
      return contributed && !alreadyPaid.has(goal.id) && target > 0 && reward > 0 && stats[goal.metric] >= target
    })
    .map(goal => ({
      userId,
      type: EVENT_TYPES.TEAM_GOAL,
      amount: config.team.goals[goal.id].reward,
      sourceId: teamGoalSourceId(goal.id),
      day: null,
      idempotencyKey: keyOf(goal.id),
      metadata: { title: goal.title, goal: goal.id, weekStart: week.start, target: config.team.goals[goal.id].target },
    }))

  if (rewards.length > 0) await repo.insertEvents(rewards)
  return { progress: teamGoalProgress(stats, contributed, alreadyPaid, config), paidXp: rewards.length > 0 }
}

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

  // Um extra pode falhar depois de já ter lançado XP; nesse caso os totais são relidos antes do resumo
  let extraFailed = false
  const markFailure = () => { extraFailed = true }
  // true enquanto a última releitura tiver falhado: os totais em memória podem estar abaixo do ledger
  let totalsStale = false
  const reloadTotals = async (current: DayTotal[]) => {
    totalsStale = false
    return safely('releitura dos totais', current, () => repo.loadDayTotals(userId), () => { totalsStale = true })
  }

  // ── Missões ──
  let missions: SyncResult['missions'] = null
  if (config.missions.enabled) {
    const weekly = await safely('missões semanais', null, () => syncWeeklyMissions(repo, userId, totalsAfter, today, config), markFailure)
    if (weekly?.paidXp) totalsAfter = await reloadTotals(totalsAfter)
    missions = {
      // O progresso diário só faz sentido para hoje; ao sincronizar outro dia ele não é enviado
      daily: day === today ? dailyMissionProgress(dailyMissionStats(desired, snapshot.hasCheckout), config) : null,
      weekly: weekly?.progress ?? null,
    }
  }

  // ── Metas da equipe ──
  let team: SyncResult['team'] = null
  if (config.team.enabled) {
    const goals = await safely('metas da equipe', null, () => syncTeamGoals(repo, userId, today, config), markFailure)
    if (goals?.paidXp) totalsAfter = await reloadTotals(totalsAfter)
    team = goals?.progress ?? null
  }

  // ── Conquistas ──
  const streak = computeStreak(activeDays(totalsAfter), today, config)
  let achievements = NO_ACHIEVEMENTS
  const unlocked: SyncResult['unlocked'] = []
  let achievementXp = 0
  let level = levelOf(totalsAfter, config)
  for (let pass = 0; pass < MAX_ACHIEVEMENT_PASSES; pass += 1) {
    achievements = await safely(
      'conquistas',
      NO_ACHIEVEMENTS,
      () => syncAchievements(repo, userId, { bestStreak: streak.best, level }, now, config),
      markFailure
    )
    unlocked.push(...achievements.unlocked)
    achievementXp += achievements.newXp
    if (!achievements.paidXp) break
    totalsAfter = await reloadTotals(totalsAfter)
    // O bônus de uma conquista pode subir o nível e liberar outra: reavalia enquanto o nível mudar
    const levelAfter = levelOf(totalsAfter, config)
    if (levelAfter === level) break
    level = levelAfter
  }

  if (extraFailed || totalsStale) totalsAfter = await reloadTotals(totalsAfter)
  const summary = buildSummary(totalsAfter, streak, today, config)

  // A projeção é regravada sempre: a sequência muda com o passar dos dias mesmo sem eventos novos.
  // Se nem a releitura final funcionou, não grava um total que pode estar abaixo do ledger.
  if (!totalsStale) {
    await repo.saveProgress(userId, {
      totalXp: summary.totalXp,
      currentStreak: streak.current,
      bestStreak: streak.best,
      streakShields: streak.shields,
      lastActiveDay: streak.lastActiveDay,
    })
  }

  const avatar = await safely<AvatarState | null>('personagem', null, async () =>
    resolveAvatar(await repo.loadAvatar(userId), summary.level)
  )

  const levelBefore = levelOf(totalsBefore, config)
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
    unlocked,
    // Com totais defasados o delta não inclui o bônus; não o desconta para o aviso não esconder XP real
    achievementXp: totalsStale ? 0 : achievementXp,
    achievements: achievements.achievements,
    missions,
    team,
    avatar,
    summary,
  }
}

export class EquipAvatarError extends Error {
  constructor(public readonly reason: EquipError) {
    super(reason)
    this.name = 'EquipAvatarError'
  }
}

/**
 * Equipa um item do personagem. O servidor confere, pelo XP do ledger, se o nível do usuário
 * libera o item — o cliente não decide o que está desbloqueado.
 */
export async function equipAvatarItem(repo: GamificationRepo, userId: string, slot: AvatarSlot, itemId: string): Promise<AvatarState> {
  const config = mergeConfig(await repo.loadConfigOverride())
  const level = levelOf(await repo.loadDayTotals(userId), config)

  const problem = checkEquip(slot, itemId, level)
  if (problem) throw new EquipAvatarError(problem)

  const current = resolveAvatar(await repo.loadAvatar(userId), level)
  const equipped = { ...current.equipped, [slot]: itemId }
  await repo.saveAvatarSlot(userId, slot, itemId, equipped)
  return { ...current, equipped }
}
