import { describe, expect, it } from 'vitest'
import {
  DISPLAY_NAME_MAX_LENGTH,
  defaultDisplayName,
  normalizeDisplayName,
  resolveDisplayName,
} from '../displayName'

describe('normalizeDisplayName', () => {
  it('mantém o nome como foi digitado', () => {
    expect(normalizeDisplayName('GuiPolezi')).toBe('GuiPolezi')
    expect(normalizeDisplayName('gui')).toBe('gui')
  })

  it('tira espaços das pontas e junta os repetidos', () => {
    expect(normalizeDisplayName('  Gui   Polezi  ')).toBe('Gui Polezi')
  })

  it('troca quebras de linha por espaço', () => {
    expect(normalizeDisplayName('Gui\n\tPolezi')).toBe('Gui Polezi')
  })

  it('remove caracteres invisíveis, como a inversão de direção do texto', () => {
    expect(normalizeDisplayName('Gui\u200bPolezi\u202e')).toBe('GuiPolezi')
  })

  it('preserva emojis compostos', () => {
    expect(normalizeDisplayName('Gui 👨‍👩‍👧')).toBe('Gui 👨‍👩‍👧')
  })

  it('devolve vazio quando não sobra nada', () => {
    expect(normalizeDisplayName('')).toBe('')
    expect(normalizeDisplayName('   \n ')).toBe('')
  })

  it('devolve vazio quando o nome não teria nada visível', () => {
    expect(normalizeDisplayName('\u200d')).toBe('')
    expect(normalizeDisplayName('\u3164')).toBe('')
    expect(normalizeDisplayName('\u2800 \u2800')).toBe('')
    expect(normalizeDisplayName('\u0301\u0301')).toBe('')
  })

  it('não deixa um U+200D solto na ponta depois do corte', () => {
    const result = normalizeDisplayName('a\u200d'.repeat(DISPLAY_NAME_MAX_LENGTH))
    expect(result.endsWith('\u200d')).toBe(false)
    expect(result.startsWith('a')).toBe(true)
  })

  it('devolve vazio para o que não é texto', () => {
    expect(normalizeDisplayName(null)).toBe('')
    expect(normalizeDisplayName(undefined)).toBe('')
    expect(normalizeDisplayName(42)).toBe('')
    expect(normalizeDisplayName({ nome: 'Gui' })).toBe('')
  })

  it('corta no limite de caracteres', () => {
    const result = normalizeDisplayName('a'.repeat(DISPLAY_NAME_MAX_LENGTH + 10))
    expect(result).toBe('a'.repeat(DISPLAY_NAME_MAX_LENGTH))
  })

  it('não parte um emoji ao meio ao cortar', () => {
    const result = normalizeDisplayName('🚀'.repeat(DISPLAY_NAME_MAX_LENGTH + 5))
    expect(Array.from(result)).toHaveLength(DISPLAY_NAME_MAX_LENGTH)
    expect(result).toBe('🚀'.repeat(DISPLAY_NAME_MAX_LENGTH))
  })

  it('não deixa espaço sobrando no fim depois do corte', () => {
    const raw = `${'a'.repeat(DISPLAY_NAME_MAX_LENGTH - 1)} bcd`
    expect(normalizeDisplayName(raw)).toBe('a'.repeat(DISPLAY_NAME_MAX_LENGTH - 1))
  })
})

describe('defaultDisplayName', () => {
  it('usa o trecho do e-mail antes do @ com a primeira letra maiúscula', () => {
    expect(defaultDisplayName('guilherme.polezi@empresa.com')).toBe('Guilherme.polezi')
  })

  it('devolve vazio sem e-mail', () => {
    expect(defaultDisplayName(null)).toBe('')
    expect(defaultDisplayName(undefined)).toBe('')
  })
})

describe('resolveDisplayName', () => {
  const email = 'guilherme@empresa.com'

  it('prefere o nome escolhido', () => {
    expect(resolveDisplayName({ email, user_metadata: { display_name: 'Gui' } })).toBe('Gui')
  })

  it('cai no padrão sem nome escolhido', () => {
    expect(resolveDisplayName({ email, user_metadata: {} })).toBe('Guilherme')
    expect(resolveDisplayName({ email })).toBe('Guilherme')
    expect(resolveDisplayName({ email, user_metadata: null })).toBe('Guilherme')
  })

  it('cai no padrão quando o nome salvo é vazio, nulo ou não é texto', () => {
    expect(resolveDisplayName({ email, user_metadata: { display_name: '   ' } })).toBe('Guilherme')
    expect(resolveDisplayName({ email, user_metadata: { display_name: null } })).toBe('Guilherme')
    expect(resolveDisplayName({ email, user_metadata: { display_name: 7 } })).toBe('Guilherme')
  })

  it('limpa na leitura um nome salvo fora do padrão', () => {
    const saved = `  ${'x'.repeat(200)}\n`
    expect(resolveDisplayName({ email, user_metadata: { display_name: saved } })).toBe('x'.repeat(DISPLAY_NAME_MAX_LENGTH))
  })

  it('devolve vazio sem usuário', () => {
    expect(resolveDisplayName(null)).toBe('')
    expect(resolveDisplayName(undefined)).toBe('')
  })
})
