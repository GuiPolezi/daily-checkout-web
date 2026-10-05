// Reconciliação do ledger: compara o que o dia deveria valer com o que já está lançado
// e gera só a diferença. O ledger é imutável — correções entram como novos eventos (estornos).

import { EVENT_TYPES, type Award, type AwardKind, type EventType, type LedgerEvent, type NewEvent } from './types'

const TYPE_BY_KIND: Record<AwardKind, { gain: EventType; loss: EventType }> = {
  task: { gain: EVENT_TYPES.TASK_COMPLETED, loss: EVENT_TYPES.TASK_REVERTED },
  routine: { gain: EVENT_TYPES.ROUTINE_COMPLETED, loss: EVENT_TYPES.ROUTINE_REVERTED },
  checkout: { gain: EVENT_TYPES.DAILY_CHECKOUT, loss: EVENT_TYPES.BONUS_REVERTED },
  perfect_day: { gain: EVENT_TYPES.PERFECT_DAY, loss: EVENT_TYPES.BONUS_REVERTED },
  streak_milestone: { gain: EVENT_TYPES.STREAK_BONUS, loss: EVENT_TYPES.BONUS_REVERTED },
}

const KIND_BY_PREFIX: Record<string, AwardKind> = {
  task: 'task',
  routine: 'routine',
  checkout: 'checkout',
  perfect_day: 'perfect_day',
  streak_milestone: 'streak_milestone',
}

export function kindOfSource(sourceId: string): AwardKind | null {
  return KIND_BY_PREFIX[sourceId.split(':')[0]] ?? null
}

export interface ReconcileInput {
  userId: string
  day: string
  desired: Award[]
  events: LedgerEvent[]
  /**
   * Dia diferente de hoje: só tarefas podem ganhar XP novo (a data de conclusão é gravada pelo
   * banco). Rotina e bônus dependem de datas informadas pelo cliente, então no passado só estornam.
   */
  isToday: boolean
}

export function reconcileDay({ userId, day, desired, events, isToday }: ReconcileInput): NewEvent[] {
  const ledger = new Map<string, { net: number; count: number }>()
  for (const event of events) {
    if (!event.sourceId || !kindOfSource(event.sourceId)) continue
    const entry = ledger.get(event.sourceId) ?? { net: 0, count: 0 }
    ledger.set(event.sourceId, { net: entry.net + event.amount, count: entry.count + 1 })
  }

  const desiredBySource = new Map(desired.map(award => [award.sourceId, award]))
  const sources = new Set([...ledger.keys(), ...desiredBySource.keys()])
  const newEvents: NewEvent[] = []

  for (const sourceId of sources) {
    const kind = kindOfSource(sourceId)
    if (!kind) continue
    const award = desiredBySource.get(sourceId)
    const { net, count } = ledger.get(sourceId) ?? { net: 0, count: 0 }
    const wanted = award?.amount ?? 0
    const canIncrease = isToday || kind === 'task'
    const target = canIncrease ? wanted : Math.min(wanted, Math.max(net, 0))
    const delta = target - net
    if (delta === 0) continue

    newEvents.push({
      userId,
      type: delta > 0 ? TYPE_BY_KIND[kind].gain : TYPE_BY_KIND[kind].loss,
      amount: delta,
      sourceId,
      day,
      // Mesma origem + mesma sequência = mesma chave: duas sincronizações simultâneas não duplicam XP
      idempotencyKey: `${userId}:${day}:${sourceId}:${count}`,
      metadata: {
        ...(award?.metadata ?? { reason: 'source_removed' }),
        previousNet: net,
        target,
        ...(count > 0 ? { adjustment: true } : {}),
      },
    })
  }

  return newEvents
}
