// Aparência do personagem. Por padrão ela segue a faixa de nível (mesma ordem dos títulos da
// configuração); itens equipados em "Meu Perfil" substituem a cor automática.
// Tudo é só visual: troca de cores e de animação no mesmo modelo, sem vantagem de jogo.

import { findAvatarItem, type AvatarState } from '@/src/lib/gamification/avatar'
import { defaultCharacter, findCharacter, type CharacterDefinition } from '@/src/lib/gamification/characters'

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

// Uma entrada por título, na ordem de `titles` em config.ts
export const TIER_LOOKS: TierLook[] = [
  { body: '#5ac8fa', aura: '#32ade6' }, // Bronze
  { body: '#4cd964', aura: '#34c759' }, // Prata
  { body: '#3a8dff', aura: '#007aff' }, // Ouro
  { body: '#c38bff', aura: '#af52de' }, // Platina
  { body: '#ffd24a', aura: '#ffb300' }, // Esmeralda
  { body: '#b8f0ff', aura: '#30b0c7' }, // Diamante
  { body: '#ff6b6b', aura: '#ff3b30' }, // Mestre
  { body: '#2c2c2e', aura: '#ffd60a' }, // Grão-Mestre
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

/** Personagem equipado (o robô quando não há nada salvo ou o item não existe mais) */
export function characterFor(avatar?: AvatarState | null): CharacterDefinition {
  return findCharacter(findAvatarItem(avatar?.equipped.character)?.value) ?? defaultCharacter()
}
