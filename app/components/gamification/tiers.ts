// Aparência do personagem por faixa de nível (mesma ordem dos títulos da configuração).
// A evolução é só visual: troca de cores no mesmo modelo, sem vantagem de jogo.

export interface TierLook {
  /** Cor principal do personagem */
  body: string
  /** Cor da aura e do pedestal */
  aura: string
}

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
