// Implementação do GamificationRepo sobre o Supabase. SOMENTE SERVIDOR:
// usa a service role key, que ignora RLS e é a única que pode escrever nas tabelas de XP.

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { GamificationRepo } from './service'
import type { DayTotal } from './types'

const PAGE_SIZE = 1000

export class GamificationNotConfiguredError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GamificationNotConfiguredError'
  }
}

let cachedClient: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient {
  if (cachedClient) return cachedClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    throw new GamificationNotConfiguredError('SUPABASE_SERVICE_ROLE_KEY não configurada')
  }
  cachedClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cachedClient
}

// PostgREST devolve estes códigos quando a tabela/view ainda não existe (migration não aplicada)
const MISSING_RELATION_CODES = new Set(['42P01', 'PGRST205', 'PGRST204', '42703'])

// PostgREST: função não encontrada no schema
const FUNCTION_NOT_FOUND = 'PGRST202'

const isMissingRelation = (error: { code?: string } | null) =>
  Boolean(error?.code && MISSING_RELATION_CODES.has(error.code))

function unwrap<T>(result: { data: T | null; error: { code?: string; message: string } | null }): T {
  if (result.error) {
    if (result.error.code && MISSING_RELATION_CODES.has(result.error.code)) {
      throw new GamificationNotConfiguredError(`Migration de gamificação não aplicada (${result.error.code})`)
    }
    throw new Error(`Falha ao acessar o banco (${result.error.code ?? 'sem código'})`)
  }
  return result.data as T
}

export function createSupabaseRepo(client: SupabaseClient = getServiceClient()): GamificationRepo {
  return {
    async loadConfigOverride() {
      const rows = unwrap(await client.from('gamification_config').select('params').eq('id', 1).limit(1))
      return (rows as { params: unknown }[])[0]?.params ?? null
    },

    async loadDay(userId, day) {
      const [tasks, routineTasks, completions, reports, events] = await Promise.all([
        client.from('tasks').select('id,title,priority,status,created_at,completed_at').eq('user_id', userId).eq('task_date', day),
        client.from('team_tasks').select('id,day_of_week'),
        client.from('team_task_completions').select('team_task_id').eq('user_id', userId).eq('completion_date', day),
        client.from('reports').select('id').eq('user_id', userId).eq('summary->>date', day).limit(1),
        client.from('xp_events').select('source_id,type,amount').eq('user_id', userId).eq('day', day),
      ])

      return {
        tasks: unwrap(tasks).map(t => ({
          id: t.id,
          title: t.title ?? '',
          priority: t.priority ?? 'Normal',
          status: t.status ?? '',
          createdAt: t.created_at ?? null,
          completedAt: t.completed_at ?? null,
        })),
        routineTasks: unwrap(routineTasks).map(t => ({ id: t.id, dayOfWeek: t.day_of_week ?? '' })),
        completedRoutineIds: unwrap(completions).map(c => c.team_task_id),
        hasCheckout: unwrap(reports).length > 0,
        events: unwrap(events).map(e => ({ sourceId: e.source_id, type: e.type, amount: e.amount })),
      }
    },

    async loadDayTotals(userId) {
      const totals: DayTotal[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const page = unwrap(
          await client
            .from('xp_day_totals')
            .select('day,total_xp,activity_xp')
            .eq('user_id', userId)
            .order('day', { ascending: true, nullsFirst: true })
            .range(from, from + PAGE_SIZE - 1)
        )
        totals.push(...page.map(row => ({ day: row.day, totalXp: row.total_xp, activityXp: row.activity_xp })))
        if (page.length < PAGE_SIZE) return totals
      }
    },

    async insertEvents(events) {
      if (events.length === 0) return
      const rows = events.map(event => ({
        user_id: event.userId,
        type: event.type,
        amount: event.amount,
        source_id: event.sourceId,
        day: event.day,
        idempotency_key: event.idempotencyKey,
        metadata: event.metadata,
      }))
      const { error } = await client
        .from('xp_events')
        .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
      unwrap({ data: null, error })
    },

    async loadAchievementState(userId) {
      const [stats, unlocked] = await Promise.all([
        client.from('xp_user_stats').select('tasks_completed,routines_completed,checkouts,perfect_days').eq('user_id', userId).limit(1),
        client.from('user_achievements').select('achievement_id,unlocked_at').eq('user_id', userId),
      ])
      // Sem a migration das conquistas, o resto da gamificação continua funcionando
      if (isMissingRelation(stats.error) || isMissingRelation(unlocked.error)) return null

      const row = unwrap(stats)[0]
      return {
        counts: {
          tasksCompleted: row?.tasks_completed ?? 0,
          routinesCompleted: row?.routines_completed ?? 0,
          checkouts: row?.checkouts ?? 0,
          perfectDays: row?.perfect_days ?? 0,
        },
        unlocked: unwrap(unlocked).map(item => ({ id: item.achievement_id, unlockedAt: item.unlocked_at })),
      }
    },

    async unlockAchievements(userId, achievements) {
      if (achievements.length === 0) return []
      // O catálogo vive no código; a tabela é espelhada sob demanda por causa da chave estrangeira
      const catalog = await client.from('achievements').upsert(
        achievements.map(item => ({ id: item.id, title: item.title, description: item.description, xp_reward: item.xpReward }))
      )
      unwrap({ data: null, error: catalog.error })
      // Com ignoreDuplicates o retorno traz só as linhas inseridas agora (não as que já existiam)
      const inserted = unwrap(
        await client
          .from('user_achievements')
          .upsert(
            achievements.map(item => ({ user_id: userId, achievement_id: item.id })),
            { onConflict: 'user_id,achievement_id', ignoreDuplicates: true }
          )
          .select('achievement_id')
      )
      return inserted.map(row => row.achievement_id)
    },

    async loadExistingKeys(keys) {
      if (keys.length === 0) return []
      const rows = unwrap(await client.from('xp_events').select('idempotency_key').in('idempotency_key', keys))
      return rows.map(row => row.idempotency_key)
    },

    async loadTeamWeek(start, end) {
      const rows: { userId: string; day: string; activityXp: number }[] = []
      for (let from = 0; ; from += PAGE_SIZE) {
        const page = unwrap(
          await client
            .from('xp_day_totals')
            .select('user_id,day,activity_xp')
            .gte('day', start)
            .lte('day', end)
            .order('day', { ascending: true })
            .order('user_id', { ascending: true })
            .range(from, from + PAGE_SIZE - 1)
        )
        rows.push(...page.map(row => ({ userId: row.user_id, day: row.day, activityXp: row.activity_xp })))
        if (page.length < PAGE_SIZE) return rows
      }
    },

    async loadAvatar(userId) {
      const rows = unwrap(await client.from('user_avatar').select('equipped').eq('user_id', userId).limit(1))
      return rows[0]?.equipped ?? null
    },

    async saveAvatarSlot(userId, slot, itemId, merged) {
      // Troca atômica de um slot (migration 004): duas trocas simultâneas não se sobrescrevem
      const atomic = await client.rpc('gamification_equip_avatar', { p_user_id: userId, p_slot: slot, p_item: itemId })
      if (!atomic.error) return
      if (atomic.error.code !== FUNCTION_NOT_FOUND) unwrap({ data: null, error: atomic.error })

      // Sem a função no banco, grava o estado completo (a última troca vence)
      const { error } = await client
        .from('user_avatar')
        .upsert({ user_id: userId, equipped: merged, updated_at: new Date().toISOString() })
      unwrap({ data: null, error })
    },

    async saveProgress(userId, progress) {
      const { error } = await client.from('user_progress').upsert({
        user_id: userId,
        total_xp: progress.totalXp,
        current_streak: progress.currentStreak,
        best_streak: progress.bestStreak,
        streak_shields: progress.streakShields,
        last_active_day: progress.lastActiveDay,
        updated_at: new Date().toISOString(),
      })
      unwrap({ data: null, error })
    },
  }
}
