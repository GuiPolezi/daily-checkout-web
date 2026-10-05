import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, mergeConfig } from '../config'
import { addDays, isValidDay, isWorkday, localDay, weekdayName } from '../day'
import { levelFromXp, tierForLevel, titleForLevel, totalXpForLevel, xpForLevel } from '../levels'
import { computeStreak, streakMultiplier } from '../streak'
import type { DaySnapshot, DayTask } from '../types'
import { computeDesiredAwards, xpForTask } from '../xp'

const config = DEFAULT_CONFIG
const MONDAY = '2026-03-02'

/** N dias úteis consecutivos a partir de uma segunda-feira */
function workdays(count: number, from: string = MONDAY): string[] {
  const days: string[] = []
  for (let day = from; days.length < count; day = addDays(day, 1)) {
    if (isWorkday(day, config.workdays)) days.push(day)
  }
  return days
}

let nextId = 1
function task(overrides: Partial<DayTask> = {}): DayTask {
  const id = nextId++
  return {
    id,
    title: `Tarefa ${id}`,
    priority: 'Normal',
    status: 'Concluída',
    createdAt: `${MONDAY}T12:00:00Z`,
    completedAt: `${MONDAY}T15:00:00Z`,
    ...overrides,
  }
}

function snapshot(overrides: Partial<DaySnapshot> = {}): DaySnapshot {
  return { tasks: [], routineTasks: [], completedRoutineIds: [], hasCheckout: false, events: [], ...overrides }
}

const awardsFor = (snap: DaySnapshot, activeDaysBefore: string[] = [], day = MONDAY, cfg = config) =>
  computeDesiredAwards({ day, snapshot: snap, activeDaysBefore, config: cfg })

describe('day', () => {
  it('usa o fuso configurado, não UTC', () => {
    // 22h de segunda em São Paulo já é terça em UTC
    expect(localDay('2026-03-03T01:00:00Z', 'America/Sao_Paulo')).toBe('2026-03-02')
    expect(localDay('2026-03-03T03:00:00Z', 'America/Sao_Paulo')).toBe('2026-03-03')
  })

  it('valida datas', () => {
    expect(isValidDay('2026-03-02')).toBe(true)
    expect(isValidDay('2026-02-30')).toBe(false)
    expect(isValidDay('02/03/2026')).toBe(false)
    expect(isValidDay(20260302)).toBe(false)
  })

  it('reconhece dia da semana e dia útil', () => {
    expect(weekdayName(MONDAY)).toBe('Segunda')
    expect(isWorkday(MONDAY, config.workdays)).toBe(true)
    expect(isWorkday(addDays(MONDAY, 5), config.workdays)).toBe(false)
  })
})

describe('levels', () => {
  it('xpForLevel segue round(coef × L^exp)', () => {
    expect(xpForLevel(1, config.level)).toBe(60)
    expect(xpForLevel(2, config.level)).toBe(170)
    expect(xpForLevel(4, config.level)).toBe(480)
  })

  it('levelFromXp devolve nível e progresso dentro do nível', () => {
    expect(levelFromXp(0, config.level)).toMatchObject({ level: 1, xpIntoLevel: 0, xpForNext: 60 })
    expect(levelFromXp(59, config.level)).toMatchObject({ level: 1, xpIntoLevel: 59 })
    expect(levelFromXp(60, config.level)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNext: 170 })
    expect(levelFromXp(1022, config.level).level).toBe(5)
    expect(levelFromXp(1021, config.level).level).toBe(4)
  })

  it('levelFromXp e totalXpForLevel são inversas', () => {
    for (const level of [1, 2, 5, 10, 20, 35]) {
      const total = totalXpForLevel(level, config.level)
      expect(levelFromXp(total, config.level)).toMatchObject({ level, xpIntoLevel: 0 })
    }
  })

  it('trata valores inválidos e respeita o nível máximo', () => {
    expect(levelFromXp(-50, config.level).level).toBe(1)
    expect(levelFromXp(Number.NaN, config.level).level).toBe(1)
    const capped = levelFromXp(1e12, { ...config.level, maxLevel: 10 })
    expect(capped).toMatchObject({ level: 10, isMaxLevel: true })
  })

  it('títulos e faixas por nível', () => {
    expect(titleForLevel(1, config.titles)).toBe('Aprendiz de Essências')
    expect(titleForLevel(4, config.titles)).toBe('Aprendiz de Essências')
    expect(titleForLevel(5, config.titles)).toBe('Perfumista Júnior')
    expect(titleForLevel(19, config.titles)).toBe('Perfumista')
    expect(titleForLevel(40, config.titles)).toBe('Nariz Lendário')
    expect(tierForLevel(1, config.titles)).toBe(0)
    expect(tierForLevel(35, config.titles)).toBe(4)
  })
})

describe('streak', () => {
  it('conta dias úteis consecutivos', () => {
    const days = workdays(3)
    expect(computeStreak(days, days[2], config)).toMatchObject({ current: 3, best: 3, shields: 0, lastActiveDay: days[2] })
  })

  it('fim de semana não quebra a sequência', () => {
    const days = workdays(6) // seg–sex + segunda seguinte
    expect(computeStreak(days, days[5], config).current).toBe(6)
  })

  it('o dia em aberto (hoje) ainda sem atividade não quebra', () => {
    const days = workdays(4)
    expect(computeStreak(days.slice(0, 3), days[3], config).current).toBe(3)
  })

  it('dia útil perdido sem escudo zera o contador e mantém o recorde', () => {
    const days = workdays(6)
    const active = [...days.slice(0, 3), days[4]] // falta o 4º dia
    expect(computeStreak(active, days[5], config)).toMatchObject({ current: 1, best: 3 })
  })

  it('ganha um escudo a cada 7 dias, até o máximo', () => {
    const days = workdays(21)
    expect(computeStreak(days.slice(0, 7), days[6], config).shields).toBe(1)
    expect(computeStreak(days.slice(0, 14), days[13], config).shields).toBe(2)
    expect(computeStreak(days, days[20], config).shields).toBe(2)
  })

  it('dia perdido consome um escudo em vez de zerar', () => {
    const days = workdays(10)
    const active = [...days.slice(0, 7), days[8]] // falta o 8º dia
    expect(computeStreak(active, days[9], config)).toMatchObject({ current: 8, shields: 0, best: 8 })
  })

  it('atividade em fim de semana é neutra', () => {
    const saturday = addDays(MONDAY, 5)
    expect(computeStreak([saturday], saturday, config).current).toBe(0)
  })

  it('multiplicador tem teto', () => {
    expect(streakMultiplier(0, config.streak)).toBe(1)
    expect(streakMultiplier(5, config.streak)).toBeCloseTo(1.1)
    expect(streakMultiplier(100, config.streak)).toBe(1.3)
  })
})

describe('xpForTask', () => {
  it('arredonda base × prioridade × sequência', () => {
    expect(xpForTask({ base: 10, priorityMultiplier: 1, streakMultiplier: 1 })).toBe(10)
    expect(xpForTask({ base: 10, priorityMultiplier: 1.3, streakMultiplier: 1.3 })).toBe(17)
    expect(xpForTask({ base: 8, priorityMultiplier: 1, streakMultiplier: 1.1 })).toBe(9)
  })
})

describe('computeDesiredAwards — tarefas avulsas', () => {
  it('tarefa concluída no próprio dia vale o XP base', () => {
    const t = task()
    expect(awardsFor(snapshot({ tasks: [t] }))).toMatchObject([{ sourceId: `task:${t.id}`, amount: 10, reason: 'ok' }])
  })

  it('tarefa não concluída não gera nada', () => {
    expect(awardsFor(snapshot({ tasks: [task({ status: 'Em Andamento', completedAt: null })] }))).toEqual([])
  })

  it('aplica o multiplicador de sequência', () => {
    const days = workdays(6)
    const t = task({ createdAt: `${days[5]}T12:00:00Z`, completedAt: `${days[5]}T15:00:00Z` })
    const [award] = awardsFor(snapshot({ tasks: [t] }), days.slice(0, 5), days[5])
    expect(award.amount).toBe(11) // round(10 × 1,10)
    expect(award.metadata).toMatchObject({ streakDays: 5, raw: 11 })
  })

  it('concluída em menos de N segundos não gera XP', () => {
    const t = task({ createdAt: `${MONDAY}T15:00:00Z`, completedAt: `${MONDAY}T15:00:30Z` })
    expect(awardsFor(snapshot({ tasks: [t] }))).toMatchObject([{ amount: 0, reason: 'too_fast' }])
  })

  it('a regra dos N segundos pode ser desligada na configuração', () => {
    const cfg = mergeConfig({ task: { minSecondsToComplete: 0 } })
    const t = task({ createdAt: `${MONDAY}T15:00:00Z`, completedAt: `${MONDAY}T15:00:01Z` })
    expect(awardsFor(snapshot({ tasks: [t] }), [], MONDAY, cfg)).toMatchObject([{ amount: 10, reason: 'ok' }])
  })

  it('título repetido no dia vale XP só uma vez', () => {
    const first = task({ title: 'Conferir estoque', completedAt: `${MONDAY}T15:00:00Z` })
    const second = task({ title: '  conferir   ESTOQUE ', completedAt: `${MONDAY}T16:00:00Z` })
    const awards = awardsFor(snapshot({ tasks: [second, first] }))
    expect(awards.find(a => a.sourceId === `task:${first.id}`)).toMatchObject({ amount: 10 })
    expect(awards.find(a => a.sourceId === `task:${second.id}`)).toMatchObject({ amount: 0, reason: 'duplicate' })
  })

  it('tarefa de outro dia concluída depois não gera XP', () => {
    const t = task({ completedAt: `${addDays(MONDAY, 1)}T15:00:00Z` })
    expect(awardsFor(snapshot({ tasks: [t] }))).toMatchObject([{ amount: 0, reason: 'outside_day' }])
  })

  it('conclusão às 22h de Brasília ainda pertence ao dia', () => {
    const t = task({ completedAt: '2026-03-03T01:00:00Z' })
    expect(awardsFor(snapshot({ tasks: [t] }))).toMatchObject([{ amount: 10, reason: 'ok' }])
  })

  it('tarefa concluída antes da gamificação (sem completed_at) não gera XP', () => {
    expect(awardsFor(snapshot({ tasks: [task({ completedAt: null })] }))).toMatchObject([{ amount: 0, reason: 'legacy' }])
  })

  it('respeita o teto diário', () => {
    const tasks = Array.from({ length: 12 }, (_, i) =>
      task({ completedAt: `${MONDAY}T15:${String(i).padStart(2, '0')}:00Z` })
    )
    const awards = awardsFor(snapshot({ tasks }))
    expect(awards.reduce((sum, a) => sum + a.amount, 0)).toBe(config.task.dailyCap)
    expect(awards.slice(0, 10).every(a => a.amount === 10)).toBe(true)
    expect(awards[10]).toMatchObject({ amount: 0, reason: 'daily_cap' })
  })

  it('o teto corta parcialmente a tarefa que o ultrapassa', () => {
    const cfg = mergeConfig({ task: { dailyCap: 15 } })
    const tasks = [task({ completedAt: `${MONDAY}T15:00:00Z` }), task({ completedAt: `${MONDAY}T15:01:00Z` })]
    const awards = awardsFor(snapshot({ tasks }), [], MONDAY, cfg)
    expect(awards.map(a => a.amount)).toEqual([10, 5])
    expect(awards[1].reason).toBe('daily_cap')
  })
})

describe('computeDesiredAwards — rotina e bônus', () => {
  const routineTasks = [
    { id: 1, dayOfWeek: 'Todos' },
    { id: 2, dayOfWeek: 'Segunda' },
    { id: 3, dayOfWeek: 'Terça' },
  ]

  it('rotina do dia vale XP e não entra no teto', () => {
    const cfg = mergeConfig({ task: { dailyCap: 0 } })
    const awards = awardsFor(snapshot({ routineTasks, completedRoutineIds: [1] }), [], MONDAY, cfg)
    expect(awards).toMatchObject([{ sourceId: 'routine:1', amount: 8 }])
  })

  it('rotina tem teto diário próprio', () => {
    const many = Array.from({ length: 15 }, (_, i) => ({ id: i + 1, dayOfWeek: 'Todos' }))
    const awards = awardsFor(snapshot({ routineTasks: many, completedRoutineIds: many.map(t => t.id) }))
    const routine = awards.filter(a => a.kind === 'routine')
    expect(routine.reduce((sum, a) => sum + a.amount, 0)).toBe(config.task.routineDailyCap)
    expect(routine[10]).toMatchObject({ sourceId: 'routine:11', amount: 0, reason: 'daily_cap' })
    expect(awards.find(a => a.kind === 'perfect_day')).toMatchObject({ amount: 30 })
  })

  it('ordena conclusões pelo instante, não pelo texto da data', () => {
    const cfg = mergeConfig({ task: { dailyCap: 10 } })
    // 500 ms vem depois de 490 ms, mas como texto ".5+00:00" ordena antes de ".49+00:00"
    const later = task({ completedAt: `${MONDAY}T15:00:00.5+00:00` })
    const earlier = task({ completedAt: `${MONDAY}T15:00:00.49+00:00` })
    const awards = awardsFor(snapshot({ tasks: [later, earlier] }), [], MONDAY, cfg)
    expect(awards.map(a => [a.sourceId, a.amount])).toEqual([[`task:${earlier.id}`, 10], [`task:${later.id}`, 0]])
  })

  it('rotina de outro dia da semana não vale XP', () => {
    expect(awardsFor(snapshot({ routineTasks, completedRoutineIds: [3] }))).toEqual([])
  })

  it('dia perfeito exige todas as rotinas previstas para o dia', () => {
    const partial = awardsFor(snapshot({ routineTasks, completedRoutineIds: [1] }))
    expect(partial.some(a => a.kind === 'perfect_day')).toBe(false)
    const full = awardsFor(snapshot({ routineTasks, completedRoutineIds: [1, 2] }))
    expect(full.find(a => a.kind === 'perfect_day')).toMatchObject({ amount: 30 })
  })

  it('sem rotina prevista não existe dia perfeito', () => {
    const awards = awardsFor(snapshot({ routineTasks: [{ id: 3, dayOfWeek: 'Terça' }], completedRoutineIds: [3] }))
    expect(awards).toEqual([])
  })

  it('checkout não vale bônus se nada do dia rendeu XP', () => {
    const fast = task({ createdAt: `${MONDAY}T15:00:00Z`, completedAt: `${MONDAY}T15:00:05Z` })
    expect(awardsFor(snapshot({ hasCheckout: true, tasks: [fast] })).some(a => a.kind === 'checkout')).toBe(false)
  })

  it('checkout vale bônus só com algo concluído', () => {
    expect(awardsFor(snapshot({ hasCheckout: true }))).toEqual([])
    const awards = awardsFor(snapshot({ hasCheckout: true, tasks: [task()] }))
    expect(awards.find(a => a.kind === 'checkout')).toMatchObject({ amount: 20 })
  })

  it('marco de sequência ao atingir 7 dias', () => {
    const days = workdays(7)
    const t = task({ createdAt: `${days[6]}T12:00:00Z`, completedAt: `${days[6]}T15:00:00Z` })
    const awards = awardsFor(snapshot({ tasks: [t] }), days.slice(0, 6), days[6])
    expect(awards.find(a => a.kind === 'streak_milestone')).toMatchObject({ sourceId: 'streak_milestone:7', amount: 50 })
    const sixth = task({ createdAt: `${days[5]}T12:00:00Z`, completedAt: `${days[5]}T15:00:00Z` })
    expect(awardsFor(snapshot({ tasks: [sixth] }), days.slice(0, 5), days[5]).some(a => a.kind === 'streak_milestone')).toBe(false)
  })

  it('dia sem XP de atividade não dispara marco', () => {
    const days = workdays(7)
    const fast = task({ createdAt: `${days[6]}T15:00:00Z`, completedAt: `${days[6]}T15:00:05Z` })
    expect(awardsFor(snapshot({ tasks: [fast] }), days.slice(0, 6), days[6]).some(a => a.kind === 'streak_milestone')).toBe(false)
  })
})

describe('mergeConfig', () => {
  it('sem sobrescrita devolve o padrão', () => {
    expect(mergeConfig(null)).toEqual(DEFAULT_CONFIG)
    expect(mergeConfig('lixo')).toEqual(DEFAULT_CONFIG)
  })

  it('sobrescreve só o que foi informado', () => {
    const cfg = mergeConfig({ bonus: { dailyCheckout: 25 }, level: { coefficient: 100 } })
    expect(cfg.bonus).toEqual({ dailyCheckout: 25, perfectDay: 30 })
    expect(cfg.level).toEqual({ coefficient: 100, exponent: 1.5, maxLevel: 200 })
    expect(cfg.task).toEqual(DEFAULT_CONFIG.task)
  })

  it('ignora valores com formato errado', () => {
    const cfg = mergeConfig({
      bonus: { dailyCheckout: '25', perfectDay: -5 },
      level: { coefficient: 0, exponent: 0.2 },
      timeZone: 'Marte/Olympus',
      workdays: ['seg'],
      titles: [{ nome: 'x' }],
    })
    expect(cfg).toEqual(DEFAULT_CONFIG)
  })

  it('aceita novos títulos e os ordena por nível', () => {
    const cfg = mergeConfig({ titles: [{ minLevel: 10, title: 'B' }, { minLevel: 1, title: 'A' }] })
    expect(cfg.titles.map(t => t.title)).toEqual(['A', 'B'])
  })
})
