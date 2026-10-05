// Aparência do personagem. Por padrão ela segue a faixa de nível (mesma ordem dos títulos da
// configuração); itens equipados em "Meu Perfil" substituem a cor automática.
// Tudo é só visual: troca de cores e de animação no mesmo modelo, sem vantagem de jogo.

import { findAvatarItem, type AvatarState } from '@/src/lib/gamification/avatar'

export interface TierLook {
  /** Cor principal do personagem */
  body: string
  /** Cor da aura e do pedestal */
  aura: string
}

export interface CharacterLook extends TierLook {
  /** Animação tocada a cada ganho de XP */
  celebration: string
}

const DEFAULT_CELEBRATION = 'ThumbsUp'

export const TIER_LOOKS: TierLook[] = [
  { body: '#5ac8fa', aura: '#32ade6' },
  { body: '#4cd964', aura: '#34c759' },
  { body: '#3a8dff', aura: '#007aff' },
  { body: '#c38bff', aura: '#af52de' },
  { body: '#ffd24a', aura: '#ffb300' },
]

export function lookForTier(tier: number): TierLook {
  return TIER_LOOKS[Math.min(Math.max(0, tier), TIER_LOOKS.length - 1)]
}

/** Junta a aparência da faixa com o que o usuário equipou (item "Automática" = cor da faixa) */
export function resolveLook(tier: number, avatar?: AvatarState | null): CharacterLook {
  const base = lookForTier(tier)
  const valueOf = (itemId: string | undefined) => findAvatarItem(itemId)?.value ?? null
  return {
    body: valueOf(avatar?.equipped.body) ?? base.body,
    aura: valueOf(avatar?.equipped.aura) ?? base.aura,
    celebration: valueOf(avatar?.equipped.celebration) ?? DEFAULT_CELEBRATION,
  }
}
