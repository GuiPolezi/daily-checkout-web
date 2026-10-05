import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../config'
import { addDays, isWorkday } from '../day'
import { reconcileDay } from '../reconcile'
import { syncDay, type GamificationRepo, type ProgressRow } from '../service'
import type { DayTask, DayTotal, NewEvent, RoutineTask } from '../types'

const USER = 'user-1'
const MONDAY = '2026-03-02'
const ACTIVITY_TYPES = ['TASK_COMPLETED', 'TASK_REVERTED', 'ROUTINE_COMPLETED', 'ROUTINE_REVERTED']

/** Meio-dia (15h UTC) do dia informado, no fuso de São Paulo */
const noon = (day: string) => new Date(`${day}T15:00:00Z`)

interface StoredTask extends DayTask {
  taskDate: string
}

// Banco em memória que imita as tabelas e a unicidade da idempotency_key
class FakeDb implements GamificationRepo {
  tasks: StoredTask[] = []
  routineTasks: RoutineTask[] = []
  completions: { teamTaskId: number; day: string }[] = []
  checkouts: string[] = []
  events: NewEvent[] = []
  progress: ProgressRow | null = null
  configOverride: unknown = null
  private nextTaskId = 1

  addTask(day: string, overrides: Partial<StoredTask> = {}): StoredTask {
    const task: StoredTask = {
      id: this.nextTaskId++,
      title: `Tarefa ${this.nextTaskId}`,
      priority: 'Normal',
      status: 'A Fazer',
      createdAt: `${day}T12:00:00Z`,
      completedAt: null,
      taskDate: day,
      ...overrides,
    }
    this.tasks.push(task)
    return task
  }

  // Mesmo comportamento do trigger gamification_stamp_task
  move(task: StoredTask, status: string, at: string) {
    task.completedAt = status === 'Concluída' ? (task.status === 'Concluída' ? task.completedAt : at) : null
    task.status = status
  }

  async loadConfigOverride() {
    return this.configOverride
  }

  async loadDay(userId: string, day: string) {
    return {
      tasks: this.tasks.filter(t => t.taskDate === day).map(t => ({ ...t })),
      routineTasks: [...this.routineTasks],
      completedRoutineIds: this.completions.filter(c => c.day === day).map(c => c.teamTaskId),
      hasCheckout: this.checkouts.includes(day),
      events: this.events
        .filter(e => e.userId === userId && e.day === day)
        .map(e => ({ sourceId: e.sourceId, type: e.type, amount: e.amount })),
    }
  }

  async loadDayTotals(userId: string): Promise<DayTotal[]> {
    const byDay = new Map<string | null, DayTotal>()
    for (const event of this.events.filter(e => e.userId === userId)) {
      const entry = byDay.get(event.day) ?? { day: event.day, totalXp: 0, activityXp: 0 }
      byDay.set(event.day, {
        day: event.day,
        totalXp: entry.totalXp + event.amount,
        activityXp: entry.activityXp + (ACTIVITY_TYPES.includes(event.type) ? event.amount : 0),
      })
    }
    return [...byDay.values()]
  }

  async insertEvents(events: NewEvent[]) {
    for (const event of events) {
      if (!this.events.some(e => e.idempotencyKey === event.idempotencyKey)) this.events.push(event)
    }
  }

  async saveProgress(_userId: string, progress: ProgressRow) {
    this.progress = progress
  }

  ledgerTotal() {
    return this.events.reduce((sum, e) => sum + e.amount, 0)
  }
}

let db: FakeDb
const sync = (day: string, now: Date = noon(day)) => syncDay(db, USER, day, now)

beforeEach(() => {
  db = new FakeDb()
})

describe('syncDay — concluir e estornar', () => {
  it('concluir uma tarefa gera XP uma única vez', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)

    const first = await sync(MONDAY)
    expect(first.delta).toBe(10)
    expect(first.events).toMatchObject([{ type: 'TASK_COMPLETED', amount: 10, sourceId: `task:${task.id}` }])
    expect(first.taskXp[task.id]).toEqual({ amount: 10, reason: 'ok' })

    const second = await sync(MONDAY)
    expect(second.delta).toBe(0)
    expect(second.events).toEqual([])
    expect(db.events).toHaveLength(1)
    expect(second.summary.totalXp).toBe(10)
  })

  it('desfazer a conclusão estorna o XP', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    await sync(MONDAY)

    db.move(task, 'Em Andamento', `${MONDAY}T14:10:00Z`)
    const reverted = await sync(MONDAY)
    expect(reverted.delta).toBe(-10)
    expect(reverted.events).toMatchObject([{ type: 'TASK_REVERTED', amount: -10 }])
    expect(reverted.summary.totalXp).toBe(0)
  })

  it('concluir → voltar → concluir de novo não duplica XP', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    await sync(MONDAY)
    db.move(task, 'A Fazer', `${MONDAY}T14:10:00Z`)
    await sync(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:20:00Z`)
    const again = await sync(MONDAY)

    expect(again.summary.totalXp).toBe(10)
    expect(db.ledgerTotal()).toBe(10)
    expect(db.events.map(e => e.amount)).toEqual([10, -10, 10])
    expect(new Set(db.events.map(e => e.idempotencyKey)).size).toBe(3)
  })

  it('apagar uma tarefa concluída estorna o XP', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    await sync(MONDAY)

    db.tasks = []
    const result = await sync(MONDAY)
    expect(result.delta).toBe(-10)
    expect(result.summary.totalXp).toBe(0)
  })

  it('duas sincronizações simultâneas não duplicam XP', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)

    await Promise.all([sync(MONDAY), sync(MONDAY)])
    expect(db.events).toHaveLength(1)
    expect(db.ledgerTotal()).toBe(10)
  })

  it('ao liberar espaço no teto, a tarefa cortada recebe o XP', async () => {
    db.configOverride = { task: { dailyCap: 10 } }
    const first = db.addTask(MONDAY)
    const second = db.addTask(MONDAY)
    db.move(first, 'Concluída', `${MONDAY}T14:00:00Z`)
    db.move(second, 'Concluída', `${MONDAY}T14:05:00Z`)
    const capped = await sync(MONDAY)
    expect(capped.summary.totalXp).toBe(10)
    expect(capped.taskXp[second.id]).toEqual({ amount: 0, reason: 'daily_cap' })

    db.move(first, 'A Fazer', `${MONDAY}T14:10:00Z`)
    const after = await sync(MONDAY)
    expect(after.summary.totalXp).toBe(10)
    expect(after.taskXp[second.id]).toEqual({ amount: 10, reason: 'ok' })
  })
})

describe('syncDay — bônus', () => {
  it('checkout gera bônus uma única vez, mesmo enviado várias vezes', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    db.checkouts.push(MONDAY)
    const first = await sync(MONDAY)
    expect(first.delta).toBe(30)

    db.checkouts.push(MONDAY, MONDAY)
    const second = await sync(MONDAY)
    expect(second.delta).toBe(0)
    expect(db.events.filter(e => e.type === 'DAILY_CHECKOUT')).toHaveLength(1)
  })

  it('dia perfeito gera bônus e é estornado ao desmarcar uma rotina', async () => {
    db.routineTasks = [{ id: 1, dayOfWeek: 'Todos' }, { id: 2, dayOfWeek: 'Segunda' }]
    db.completions = [{ teamTaskId: 1, day: MONDAY }, { teamTaskId: 2, day: MONDAY }]
    const perfect = await sync(MONDAY)
    expect(perfect.delta).toBe(8 + 8 + 30)

    db.completions = [{ teamTaskId: 1, day: MONDAY }]
    const undone = await sync(MONDAY)
    expect(undone.delta).toBe(-(8 + 30))
    expect(undone.summary.totalXp).toBe(8)
  })

  it('rotina e bônus de dia passado não geram XP novo', async () => {
    db.routineTasks = [{ id: 1, dayOfWeek: 'Todos' }]
    db.completions = [{ teamTaskId: 1, day: MONDAY }]
    db.checkouts.push(MONDAY)
    const result = await sync(MONDAY, noon(addDays(MONDAY, 1)))
    expect(result.delta).toBe(0)
    expect(db.events).toEqual([])
  })

  it('bônus de dia passado continua podendo ser estornado', async () => {
    db.routineTasks = [{ id: 1, dayOfWeek: 'Todos' }]
    db.completions = [{ teamTaskId: 1, day: MONDAY }]
    await sync(MONDAY)

    db.completions = []
    const result = await sync(MONDAY, noon(addDays(MONDAY, 1)))
    expect(result.delta).toBe(-(8 + 30))
  })
})

describe('syncDay — progresso e sequência', () => {
  /** Conclui uma tarefa por dia útil e sincroniza, devolvendo o último resultado */
  async function playWorkdays(count: number, from: string = MONDAY) {
    let day = from
    let done = 0
    let last = await sync(day)
    while (done < count) {
      if (isWorkday(day, DEFAULT_CONFIG.workdays)) {
        const task = db.addTask(day)
        db.move(task, 'Concluída', `${day}T14:00:00Z`)
        last = await sync(day)
        done += 1
      }
      if (done < count) day = addDays(day, 1)
    }
    return { last, day }
  }

  it('a sequência cresce por dia útil e paga o marco de 7 dias', async () => {
    const { last } = await playWorkdays(7)
    expect(last.summary.currentStreak).toBe(7)
    expect(last.summary.shields).toBe(1)
    expect(last.events.some(e => e.type === 'STREAK_BONUS' && e.amount === 50)).toBe(true)
    expect(db.progress).toMatchObject({ currentStreak: 7, bestStreak: 7, streakShields: 1 })
  })

  it('perder dias zera a sequência mas nunca remove XP', async () => {
    const { last, day } = await playWorkdays(3)
    const xpBefore = last.summary.totalXp

    // Volta duas semanas depois, sem ter feito nada no intervalo
    const later = addDays(day, 14)
    const result = await sync(later)
    expect(result.summary.currentStreak).toBe(0)
    expect(result.summary.bestStreak).toBe(3)
    expect(result.summary.totalXp).toBe(xpBefore)
    expect(db.events.every(e => e.amount > 0)).toBe(true)
  })

  it('sinaliza subida de nível e o total bate com o ledger', async () => {
    db.configOverride = { level: { coefficient: 10 } }
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const result = await sync(MONDAY)

    expect(result.leveledUp).toMatchObject({ from: 1, to: 2 })
    expect(result.summary.level).toBe(2)
    expect(result.summary.totalXp).toBe(db.ledgerTotal())
    expect(db.progress?.totalXp).toBe(db.ledgerTotal())
  })

  it('XP de hoje considera só o dia atual', async () => {
    const { last, day } = await playWorkdays(2)
    expect(last.summary.xpToday).toBe(10)
    expect(last.summary.today).toBe(day)
    expect(last.summary.totalXp).toBe(20)
  })
})

describe('reconcileDay', () => {
  it('ignora eventos sem origem conhecida (ex.: backfill)', () => {
    const events = reconcileDay({
      userId: USER,
      day: MONDAY,
      desired: [],
      events: [{ sourceId: null, type: 'BACKFILL', amount: 500 }, { sourceId: 'backfill:v1', type: 'BACKFILL', amount: 500 }],
      isToday: true,
    })
    expect(events).toEqual([])
  })
})
