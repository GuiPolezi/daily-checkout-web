// Utilitários de "dia" (strings YYYY-MM-DD). Toda a gamificação raciocina em dias do fuso
// configurado, nunca em UTC — às 21h de Brasília o dia em UTC já virou.

import { DEFAULT_CONFIG } from './config'

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Mesmo vocabulário usado pela tela de Rotina em team_tasks.day_of_week
export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const EVERY_DAY = 'Todos'

export function isValidDay(value: unknown): value is string {
  if (typeof value !== 'string' || !DAY_PATTERN.test(value)) return false
  const parsed = new Date(`${value}T12:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Dia do calendário em que `instant` cai no fuso informado */
export function localDay(instant: Date | string, timeZone: string = DEFAULT_CONFIG.timeZone): string {
  const date = typeof instant === 'string' ? new Date(instant) : instant
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** "Hoje" para as telas, no mesmo fuso que o servidor usa */
export function todayLocal(timeZone: string = DEFAULT_CONFIG.timeZone): string {
  return localDay(new Date(), timeZone)
}

export function addDays(day: string, amount: number): string {
  const date = new Date(`${day}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

/** 0 = domingo … 6 = sábado */
export function weekdayIndex(day: string): number {
  return new Date(`${day}T12:00:00Z`).getUTCDay()
}

export function weekdayName(day: string): string {
  return WEEKDAY_NAMES[weekdayIndex(day)]
}

export function isWorkday(day: string, workdays: number[]): boolean {
  return workdays.includes(weekdayIndex(day))
}
