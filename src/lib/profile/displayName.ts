/** Chave do nome escolhido dentro de `user_metadata` (Supabase Auth) */
export const DISPLAY_NAME_KEY = 'display_name'
export const DISPLAY_NAME_MAX_LENGTH = 32

// Letras e símbolos que não desenham nada: preenchimentos do hangul e o braile vazio
const BLANK_LOOKALIKES = /[\u115f\u1160\u3164\uffa0\u2800]/g
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u

interface NamedUser {
  email?: string | null
  user_metadata?: Record<string, unknown> | null
}

/**
 * Limpa o nome digitado: tira caracteres de controle e invisíveis, junta espaços repetidos e
 * corta no limite. Devolve '' quando não sobra nada, o que significa "voltar ao nome padrão".
 */
export function normalizeDisplayName(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const clean = raw
    .replace(/\p{Cc}/gu, ' ')
    // Invisíveis (ex.: inversão de direção do texto) saem; o U+200D fica porque une emojis compostos
    .replace(/[^\P{Cf}\u200d]/gu, '')
    .replace(BLANK_LOOKALIKES, '')
    .replace(/\s+/g, ' ')
    .trim()
  // Corta por caractere inteiro, para não partir um emoji ao meio
  const cut = Array.from(clean).slice(0, DISPLAY_NAME_MAX_LENGTH).join('')
  // Um U+200D solto na ponta (sobra do corte, por exemplo) não une nada
  const name = cut.replace(/^[\u200d\s]+|[\u200d\s]+$/g, '')
  // Sem nenhum caractere visível o nome apareceria em branco na tela
  return VISIBLE.test(name) ? name : ''
}

/** Nome padrão: o trecho do e-mail antes do @, com a primeira letra maiúscula */
export function defaultDisplayName(email: string | null | undefined): string {
  const prefix = email?.split('@')[0] ?? ''
  return prefix.charAt(0).toUpperCase() + prefix.slice(1)
}

/** Nome a mostrar: o escolhido pela pessoa ou, na falta dele, o padrão vindo do e-mail */
export function resolveDisplayName(user: NamedUser | null | undefined): string {
  // O metadado é gravado pelo navegador, então é limpo de novo na leitura
  const chosen = normalizeDisplayName(user?.user_metadata?.[DISPLAY_NAME_KEY])
  return chosen || defaultDisplayName(user?.email)
}
