import { beforeEach, describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, findNewAchievements, type AchievementDefinition, type AchievementStats } from '../achievements'
import { DEFAULT_CONFIG } from '../config'
import { addDays, isWorkday } from '../day'
import { reconcileDay } from '../reconcile'
import { equipAvatarItem, syncDay, type AchievementState, type GamificationRepo, type ProgressRow } from '../service'
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
  // Desligado por padrão para os testes de XP não dependerem das conquistas
  achievementsAvailable = false
  unlocked: { id: string; unlockedAt: string }[] = []
  failNextUnlock = false
  // Missões também ficam desligadas por padrão, pelo mesmo motivo
  missionsEnabled = false
  avatar: unknown = null
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
    const override = (this.configOverride ?? {}) as Record<string, unknown>
    return { missions: { enabled: this.missionsEnabled }, ...override }
  }

  async loadExistingKeys(keys: string[]) {
    return this.events.map(e => e.idempotencyKey).filter(key => keys.includes(key))
  }

  async loadAvatar() {
    return this.avatar
  }

  async saveAvatar(_userId: string, equipped: Record<string, string>) {
    this.avatar = equipped
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

  // Mesma conta da view xp_user_stats: origens com saldo positivo, por tipo
  async loadAchievementState(userId: string): Promise<AchievementState | null> {
    if (!this.achievementsAvailable) return null
    const net = new Map<string, number>()
    for (const event of this.events.filter(e => e.userId === userId && e.day !== null)) {
      const key = `${event.day}|${event.sourceId}`
      net.set(key, (net.get(key) ?? 0) + event.amount)
    }
    const count = (kind: string) =>
      [...net.entries()].filter(([key, amount]) => amount > 0 && key.split('|')[1].split(':')[0] === kind).length
    return {
      counts: {
        tasksCompleted: count('task'),
        routinesCompleted: count('routine'),
        checkouts: count('checkout'),
        perfectDays: count('perfect_day'),
      },
      unlocked: [...this.unlocked],
    }
  }

  async unlockAchievements(_userId: string, achievements: AchievementDefinition[]) {
    if (this.failNextUnlock) {
      this.failNextUnlock = false
      throw new Error('falha simulada')
    }
    const inserted: string[] = []
    for (const item of achievements) {
      if (this.unlocked.some(u => u.id === item.id)) continue
      this.unlocked.push({ id: item.id, unlockedAt: '2026-03-02T15:00:00Z' })
      inserted.push(item.id)
    }
    return inserted
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

describe('syncDay — conquistas', () => {
  beforeEach(() => {
    db.achievementsAvailable = true
  })

  it('a primeira tarefa desbloqueia a conquista e paga o XP uma única vez', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)

    const first = await sync(MONDAY)
    expect(first.unlocked.map(a => a.id)).toEqual(['tasks_1'])
    expect(first.delta).toBe(10 + 10)
    expect(first.summary.totalXp).toBe(20)
    expect(first.achievements?.find(a => a.id === 'tasks_1')).toMatchObject({ current: 1, target: 1 })
    expect(first.achievements?.find(a => a.id === 'tasks_1')?.unlockedAt).not.toBeNull()

    const second = await sync(MONDAY)
    expect(second.unlocked).toEqual([])
    expect(second.delta).toBe(0)
    expect(db.events.filter(e => e.type === 'ACHIEVEMENT')).toHaveLength(1)
  })

  it('conquista desbloqueada é permanente, mesmo desfazendo a tarefa', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    await sync(MONDAY)

    db.move(task, 'A Fazer', `${MONDAY}T14:10:00Z`)
    const reverted = await sync(MONDAY)
    expect(reverted.summary.totalXp).toBe(10) // só o XP da conquista permanece
    expect(db.unlocked.map(u => u.id)).toEqual(['tasks_1'])

    // Refazer não paga a conquista de novo
    db.move(task, 'Concluída', `${MONDAY}T14:20:00Z`)
    const again = await sync(MONDAY)
    expect(again.unlocked).toEqual([])
    expect(again.summary.totalXp).toBe(20)
  })

  it('o XP da conquista não é tratado como origem do dia pela reconciliação', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    await sync(MONDAY)
    const reward = db.events.find(e => e.type === 'ACHIEVEMENT')
    expect(reward).toMatchObject({ day: null, amount: 10, sourceId: 'achievement:tasks_1' })

    const later = await sync(MONDAY)
    expect(later.events).toEqual([])
    expect(later.summary.xpToday).toBe(10)
  })

  it('se o registro do desbloqueio falhar, o XP do dia não cai junto e a nova tentativa não paga em dobro', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    db.failNextUnlock = true
    const failed = await sync(MONDAY)
    expect(failed.events).toMatchObject([{ type: 'TASK_COMPLETED', amount: 10 }])
    expect(failed.achievements).toBeNull()
    expect(failed.unlocked).toEqual([])
    expect(db.progress).not.toBeNull()

    const retry = await sync(MONDAY)
    expect(retry.unlocked.map(a => a.id)).toEqual(['tasks_1'])
    expect(db.events.filter(e => e.type === 'ACHIEVEMENT')).toHaveLength(1)
    expect(retry.summary.totalXp).toBe(20)
  })

  it('o bônus de uma conquista que sobe o nível libera a conquista de nível na mesma sincronização', async () => {
    // Com coeficiente 1 o nível 5 pede 17 XP: os 10 da tarefa não bastam, os 10 da conquista completam
    db.configOverride = { level: { coefficient: 1 } }
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const result = await sync(MONDAY)
    expect(result.summary.level).toBeGreaterThanOrEqual(5)
    expect(result.unlocked.map(a => a.id)).toEqual(['tasks_1', 'level_5'])
    expect(result.achievements?.find(a => a.id === 'level_5')?.unlockedAt).not.toBeNull()
    expect(db.events.filter(e => e.type === 'ACHIEVEMENT')).toHaveLength(1)
  })

  it('só avisa a conquista que esta sincronização registrou', async () => {
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const [a, b] = await Promise.all([sync(MONDAY), sync(MONDAY)])
    expect([...a.unlocked, ...b.unlocked].map(item => item.id)).toEqual(['tasks_1'])
    expect(db.events.filter(e => e.type === 'ACHIEVEMENT')).toHaveLength(1)
  })

  it('checkout e dia perfeito desbloqueiam as conquistas correspondentes', async () => {
    db.routineTasks = [{ id: 1, dayOfWeek: 'Todos' }]
    db.completions = [{ teamTaskId: 1, day: MONDAY }]
    db.checkouts.push(MONDAY)
    const result = await sync(MONDAY)
    expect(result.unlocked.map(a => a.id).sort()).toEqual(['checkout_1', 'perfect_1'])
    expect(result.summary.totalXp).toBe(8 + 30 + 20 + 10 + 10)
  })

  it('sem a estrutura de conquistas no banco, o XP funciona normalmente', async () => {
    db.achievementsAvailable = false
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const result = await sync(MONDAY)
    expect(result.delta).toBe(10)
    expect(result.achievements).toBeNull()
    expect(result.unlocked).toEqual([])
  })

  it('pode ser desligado pela configuração', async () => {
    db.configOverride = { achievements: { enabled: false } }
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const result = await sync(MONDAY)
    expect(result.delta).toBe(10)
    expect(result.achievements).toBeNull()
  })
})

describe('syncDay — missões', () => {
  beforeEach(() => {
    db.missionsEnabled = true
  })

  const completeTasks = (day: string, count: number) =>
    Array.from({ length: count }, (_, i) => {
      const task = db.addTask(day)
      db.move(task, 'Concluída', `${day}T14:${String(i).padStart(2, '0')}:00Z`)
      return task
    })

  it('missão diária paga uma vez e é estornada quando deixa de valer', async () => {
    const tasks = completeTasks(MONDAY, 3)
    const done = await sync(MONDAY)
    expect(done.delta).toBe(30 + 15)
    expect(done.missions?.daily?.find(m => m.id === 'daily_tasks_3')).toMatchObject({ done: true, current: 3, reward: 15 })

    expect((await sync(MONDAY)).delta).toBe(0)

    db.move(tasks[0], 'A Fazer', `${MONDAY}T14:30:00Z`)
    const undone = await sync(MONDAY)
    expect(undone.delta).toBe(-(10 + 15))
    expect(undone.missions?.daily?.find(m => m.id === 'daily_tasks_3')).toMatchObject({ done: false, current: 2 })
    expect(undone.summary.totalXp).toBe(20)
  })

  it('XP de missão não torna o dia ativo', async () => {
    completeTasks(MONDAY, 3)
    const result = await sync(MONDAY)
    expect(result.summary.currentStreak).toBe(1)
    const totals = await db.loadDayTotals(USER)
    expect(totals.find(t => t.day === MONDAY)).toMatchObject({ totalXp: 45, activityXp: 30 })
  })

  it('missão semanal paga uma vez por semana e de novo na semana seguinte', async () => {
    const weekDays = [MONDAY, addDays(MONDAY, 1), addDays(MONDAY, 2)]
    let last = await sync(MONDAY)
    for (const day of weekDays) {
      completeTasks(day, 1)
      last = await sync(day)
    }
    const weekly = () => db.events.filter(e => e.type === 'MISSION_COMPLETED' && e.day === null)
    expect(weekly().map(e => [e.sourceId, e.amount])).toEqual([['mission:weekly_active_3', 20]])
    expect(last.missions?.weekly?.find(m => m.id === 'weekly_active_3')).toMatchObject({ done: true, current: 3 })

    const again = await sync(weekDays[2])
    expect(weekly()).toHaveLength(1)
    expect(again.delta).toBe(0)
    expect(again.missions?.weekly?.find(m => m.id === 'weekly_active_3')).toMatchObject({ done: true })

    for (const day of weekDays.map(d => addDays(d, 7))) {
      completeTasks(day, 1)
      await sync(day)
    }
    expect(weekly()).toHaveLength(2)
    expect(new Set(weekly().map(e => e.idempotencyKey)).size).toBe(2)
  })

  it('ao sincronizar um dia passado, o progresso diário não é enviado', async () => {
    const result = await sync(MONDAY, noon(addDays(MONDAY, 1)))
    expect(result.missions).toMatchObject({ daily: null })
    expect(result.missions?.weekly).toHaveLength(3)
  })

  it('com missões desligadas nada é enviado nem pago', async () => {
    db.missionsEnabled = false
    completeTasks(MONDAY, 3)
    const result = await sync(MONDAY)
    expect(result.missions).toBeNull()
    expect(result.delta).toBe(30)
  })
})

describe('personagem', () => {
  it('a sincronização devolve o personagem com o padrão', async () => {
    const result = await sync(MONDAY)
    expect(result.avatar?.equipped).toEqual({ body: 'body_auto', aura: 'aura_auto', celebration: 'cel_thumbs' })
  })

  it('equipa item liberado e mantém os outros slots', async () => {
    const state = await equipAvatarItem(db, USER, 'aura', 'aura_blue')
    expect(state.equipped).toEqual({ body: 'body_auto', aura: 'aura_blue', celebration: 'cel_thumbs' })
    expect(db.avatar).toEqual(state.equipped)
    expect((await sync(MONDAY)).avatar?.equipped.aura).toBe('aura_blue')
  })

  it('recusa item que o nível não libera, de outro slot ou inexistente', async () => {
    await expect(equipAvatarItem(db, USER, 'body', 'body_onyx')).rejects.toMatchObject({ reason: 'locked' })
    await expect(equipAvatarItem(db, USER, 'body', 'aura_blue')).rejects.toMatchObject({ reason: 'wrong_slot' })
    await expect(equipAvatarItem(db, USER, 'body', 'xyz')).rejects.toMatchObject({ reason: 'unknown_item' })
    expect(db.avatar).toBeNull()
  })

  it('o nível que libera o item vem do ledger', async () => {
    db.configOverride = { level: { coefficient: 1 } }
    const task = db.addTask(MONDAY)
    db.move(task, 'Concluída', `${MONDAY}T14:00:00Z`)
    const result = await sync(MONDAY)
    expect(result.summary.level).toBeGreaterThanOrEqual(2)
    await expect(equipAvatarItem(db, USER, 'body', 'body_mint')).resolves.toMatchObject({ equipped: { body: 'body_mint' } })
  })
})

describe('findNewAchievements', () => {
  const stats = (overrides: Partial<AchievementStats> = {}): AchievementStats => ({
    tasksCompleted: 0, routinesCompleted: 0, checkouts: 0, perfectDays: 0, bestStreak: 0, level: 1, ...overrides,
  })

  it('nada é desbloqueado do zero', () => {
    expect(findNewAchievements(stats(), [])).toEqual([])
  })

  it('desbloqueia tudo o que já atingiu o alvo, menos o que já consta', () => {
    const fresh = findNewAchievements(stats({ tasksCompleted: 60, bestStreak: 7, level: 5 }), ['tasks_1'])
    expect(fresh.map(a => a.id)).toEqual(['tasks_50', 'streak_7', 'level_5'])
  })

  it('o catálogo tem ids únicos e alvos positivos', () => {
    expect(new Set(ACHIEVEMENTS.map(a => a.id)).size).toBe(ACHIEVEMENTS.length)
    expect(ACHIEVEMENTS.every(a => a.target > 0 && a.xpReward >= 0)).toBe(true)
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
