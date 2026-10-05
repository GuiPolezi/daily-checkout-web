// Personalização do personagem (Fase 2): catálogo padrão e validação, em funções puras.
// Tudo aqui é cosmético — nenhum item dá vantagem de XP.

export const AVATAR_SLOTS = ['body', 'aura', 'celebration'] as const
export type AvatarSlot = (typeof AVATAR_SLOTS)[number]

export interface AvatarItem {
  id: string
  slot: AvatarSlot
  title: string
  minLevel: number
  /** Cor (body/aura) ou nome da animação (celebration). null = automático, segue a faixa de nível */
  value: string | null
}

export type Equipped = Record<AvatarSlot, string>

export interface AvatarState {
  equipped: Equipped
  items: (AvatarItem & { unlocked: boolean })[]
}

export const SLOT_LABELS: Record<AvatarSlot, string> = {
  body: 'Cor do personagem',
  aura: 'Cor da aura',
  celebration: 'Comemoração',
}

export const AVATAR_ITEMS: AvatarItem[] = [
  { id: 'body_auto', slot: 'body', title: 'Automática', minLevel: 1, value: null },
  { id: 'body_sky', slot: 'body', title: 'Céu', minLevel: 1, value: '#5ac8fa' },
  { id: 'body_mint', slot: 'body', title: 'Menta', minLevel: 2, value: '#4cd964' },
  { id: 'body_coral', slot: 'body', title: 'Coral', minLevel: 3, value: '#ff7a6b' },
  { id: 'body_violet', slot: 'body', title: 'Violeta', minLevel: 5, value: '#c38bff' },
  { id: 'body_gold', slot: 'body', title: 'Âmbar', minLevel: 8, value: '#ffd24a' },
  { id: 'body_onyx', slot: 'body', title: 'Ônix', minLevel: 12, value: '#48484a' },

  { id: 'aura_auto', slot: 'aura', title: 'Automática', minLevel: 1, value: null },
  { id: 'aura_blue', slot: 'aura', title: 'Azul', minLevel: 1, value: '#007aff' },
  { id: 'aura_green', slot: 'aura', title: 'Verde', minLevel: 2, value: '#34c759' },
  { id: 'aura_pink', slot: 'aura', title: 'Rosa', minLevel: 4, value: '#ff2d92' },
  { id: 'aura_purple', slot: 'aura', title: 'Lilás', minLevel: 6, value: '#af52de' },
  { id: 'aura_gold', slot: 'aura', title: 'Dourada', minLevel: 10, value: '#ffb300' },

  { id: 'cel_thumbs', slot: 'celebration', title: 'Joinha', minLevel: 1, value: 'ThumbsUp' },
  { id: 'cel_yes', slot: 'celebration', title: 'Sim!', minLevel: 2, value: 'Yes' },
  { id: 'cel_jump', slot: 'celebration', title: 'Pulo', minLevel: 4, value: 'Jump' },
  { id: 'cel_punch', slot: 'celebration', title: 'Soco no ar', minLevel: 6, value: 'Punch' },
  { id: 'cel_dance', slot: 'celebration', title: 'Dança', minLevel: 8, value: 'Dance' },
]

export const DEFAULT_EQUIPPED: Equipped = { body: 'body_auto', aura: 'aura_auto', celebration: 'cel_thumbs' }

export const isAvatarSlot = (value: unknown): value is AvatarSlot =>
  typeof value === 'string' && (AVATAR_SLOTS as readonly string[]).includes(value)

export function findAvatarItem(id: unknown, catalog: AvatarItem[] = AVATAR_ITEMS): AvatarItem | undefined {
  return typeof id === 'string' ? catalog.find(item => item.id === id) : undefined
}

export type EquipError = 'unknown_item' | 'wrong_slot' | 'locked'

/** Diz se o usuário pode equipar o item no slot; devolve o motivo quando não pode */
export function checkEquip(slot: AvatarSlot, itemId: unknown, level: number, catalog: AvatarItem[] = AVATAR_ITEMS): EquipError | null {
  const item = findAvatarItem(itemId, catalog)
  if (!item) return 'unknown_item'
  if (item.slot !== slot) return 'wrong_slot'
  if (item.minLevel > level) return 'locked'
  return null
}

/**
 * Monta o estado do personagem a partir do que está salvo. Qualquer coisa inválida ou
 * que o nível atual não libera (ex.: a curva de nível mudou) volta para o padrão do slot.
 */
export function resolveAvatar(saved: unknown, level: number, catalog: AvatarItem[] = AVATAR_ITEMS): AvatarState {
  const stored = typeof saved === 'object' && saved !== null ? (saved as Record<string, unknown>) : {}
  const equipped = Object.fromEntries(
    AVATAR_SLOTS.map(slot => [slot, checkEquip(slot, stored[slot], level, catalog) === null ? stored[slot] : DEFAULT_EQUIPPED[slot]])
  ) as Equipped

  return {
    equipped,
    items: catalog.map(item => ({ ...item, unlocked: item.minLevel <= level })),
  }
}
