// Curva de nível: funções puras. O nível nunca é gravado — é sempre derivado do XP total.

import type { GamificationConfig, LevelTitle } from './config'

type LevelConfig = GamificationConfig['level']

/** XP necessário para sair do nível `level` e chegar ao seguinte */
export function xpForLevel(level: number, config: LevelConfig): number {
  return Math.max(1, Math.round(config.coefficient * Math.pow(Math.max(1, level), config.exponent)))
}

export interface LevelProgress {
  level: number
  /** XP já acumulado dentro do nível atual */
  xpIntoLevel: number
  /** XP total que o nível atual exige para subir */
  xpForNext: number
  isMaxLevel: boolean
}

export function levelFromXp(totalXp: number, config: LevelConfig): LevelProgress {
  let remaining = Math.max(0, Math.floor(Number.isFinite(totalXp) ? totalXp : 0))
  let level = 1
  while (level < config.maxLevel) {
    const needed = xpForLevel(level, config)
    if (remaining < needed) break
    remaining -= needed
    level += 1
  }
  const isMaxLevel = level >= config.maxLevel
  return { level, xpIntoLevel: remaining, xpForNext: xpForLevel(level, config), isMaxLevel }
}

/** XP total acumulado necessário para alcançar `level` */
export function totalXpForLevel(level: number, config: LevelConfig): number {
  let total = 0
  for (let current = 1; current < level; current += 1) total += xpForLevel(current, config)
  return total
}

export function titleForLevel(level: number, titles: LevelTitle[]): string {
  return titles.reduce((current, entry) => (level >= entry.minLevel ? entry.title : current), titles[0]?.title ?? '')
}

/** Faixa visual do personagem (0 = primeira faixa de títulos) */
export function tierForLevel(level: number, titles: LevelTitle[]): number {
  return titles.reduce((tier, entry, index) => (level >= entry.minLevel ? index : tier), 0)
}
