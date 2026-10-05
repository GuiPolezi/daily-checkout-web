// Sequência (streak) "saudável": conta dias úteis ativos, usa escudos e nunca tira XP.
// É sempre recalculada a partir dos dias ativos do ledger — não há estado escondido.

import type { GamificationConfig } from './config'
import { addDays, isWorkday } from './day'

export interface StreakState {
  current: number
  best: number
  shields: number
  lastActiveDay: string | null
}

type StreakConfig = Pick<GamificationConfig, 'workdays' | 'streak'>

const EMPTY: StreakState = { current: 0, best: 0, shields: 0, lastActiveDay: null }

/**
 * Simula a sequência do primeiro dia ativo até `asOf`.
 * - Dias fora de `workdays` são neutros: não contam e não quebram.
 * - Dia útil sem atividade consome um escudo; sem escudo, zera o contador (o recorde fica).
 * - O próprio `asOf` ainda está "em aberto": se não tiver atividade, não quebra nada.
 */
export function computeStreak(activeDays: Iterable<string>, asOf: string, config: StreakConfig): StreakState {
  const active = new Set([...activeDays].filter(day => day <= asOf && isWorkday(day, config.workdays)))
  if (active.size === 0) return EMPTY

  const first = [...active].sort()[0]
  let current = 0
  let best = 0
  let shields = 0
  let lastActiveDay: string | null = null

  for (let day = first; day <= asOf; day = addDays(day, 1)) {
    if (!isWorkday(day, config.workdays)) continue
    if (active.has(day)) {
      current += 1
      best = Math.max(best, current)
      lastActiveDay = day
      if (config.streak.shieldEvery > 0 && current % config.streak.shieldEvery === 0) {
        shields = Math.min(shields + 1, config.streak.maxShields)
      }
    } else if (day !== asOf && current > 0) {
      if (shields > 0) shields -= 1
      else current = 0
    }
  }

  return { current, best, shields, lastActiveDay }
}

export function streakMultiplier(streakDays: number, config: GamificationConfig['streak']): number {
  return Math.min(1 + config.multiplierPerDay * Math.max(0, streakDays), config.multiplierMax)
}
