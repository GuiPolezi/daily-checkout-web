import { describe, expect, it } from 'vitest'
import { lastPageIndex, loadHistoryPage, type FetchRange } from '../xpHistory'

const SIZE = 10

/** Banco em memória que responde como o Supabase, inclusive com erro ao pedir além do fim */
function fakeTable(initialTotal: number) {
  const state = { total: initialTotal, failing: false, throwing: false, calls: [] as [number, number][] }
  const fetchRange: FetchRange<number> = async (from, to) => {
    state.calls.push([from, to])
    if (state.throwing) throw new Error('queda de rede')
    if (state.failing) return { data: null, count: null, error: new Error('sem rede') }
    // O PostgREST responde 416 quando o início do intervalo passa do total
    if (from > 0 && from >= state.total) return { data: null, count: null, error: { code: 'PGRST103' } }
    const rows = Array.from({ length: state.total }, (_, index) => index).slice(from, to + 1)
    return { data: rows, count: state.total, error: null }
  }
  return { state, fetchRange }
}

describe('lastPageIndex', () => {
  it('calcula a última página', () => {
    expect(lastPageIndex(0, SIZE)).toBe(0)
    expect(lastPageIndex(1, SIZE)).toBe(0)
    expect(lastPageIndex(10, SIZE)).toBe(0)
    expect(lastPageIndex(11, SIZE)).toBe(1)
    expect(lastPageIndex(50, SIZE)).toBe(4)
  })
})

describe('loadHistoryPage', () => {
  it('lê a primeira página com o total', async () => {
    const { fetchRange, state } = fakeTable(25)
    expect(await loadHistoryPage(fetchRange, 0, SIZE)).toEqual({ rows: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], total: 25, page: 0 })
    expect(state.calls).toEqual([[0, 9]])
  })

  it('percorre todas as páginas sem pular nem repetir itens', async () => {
    const { fetchRange } = fakeTable(25)
    const seen: number[] = []
    for (let page = 0; page <= lastPageIndex(25, SIZE); page++) {
      const result = await loadHistoryPage(fetchRange, page, SIZE)
      expect(result?.page).toBe(page)
      seen.push(...(result?.rows ?? []))
    }
    expect(seen).toEqual(Array.from({ length: 25 }, (_, index) => index))
  })

  it('a última página pode vir incompleta', async () => {
    const { fetchRange } = fakeTable(25)
    expect(await loadHistoryPage(fetchRange, 2, SIZE)).toEqual({ rows: [20, 21, 22, 23, 24], total: 25, page: 2 })
  })

  it('histórico vazio devolve página vazia, não erro', async () => {
    const { fetchRange } = fakeTable(0)
    expect(await loadHistoryPage(fetchRange, 0, SIZE)).toEqual({ rows: [], total: 0, page: 0 })
  })

  it('se o total encolheu, devolve a última página que existe', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.total = 20
    expect(await loadHistoryPage(fetchRange, 3, SIZE)).toEqual({
      rows: [10, 11, 12, 13, 14, 15, 16, 17, 18, 19],
      total: 20,
      page: 1,
    })
  })

  it('se o total encolheu para uma página só, devolve a primeira', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.total = 4
    expect(await loadHistoryPage(fetchRange, 4, SIZE)).toEqual({ rows: [0, 1, 2, 3], total: 4, page: 0 })
  })

  it('se o histórico foi zerado, devolve a primeira página vazia', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.total = 0
    expect(await loadHistoryPage(fetchRange, 2, SIZE)).toEqual({ rows: [], total: 0, page: 0 })
  })

  it('devolve null quando a leitura responde com erro', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.failing = true
    expect(await loadHistoryPage(fetchRange, 0, SIZE)).toBeNull()
    expect(await loadHistoryPage(fetchRange, 2, SIZE)).toBeNull()
  })

  it('devolve null, sem estourar, quando a leitura lança exceção', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.throwing = true
    expect(await loadHistoryPage(fetchRange, 0, SIZE)).toBeNull()
    expect(await loadHistoryPage(fetchRange, 3, SIZE)).toBeNull()
  })

  it('faz no máximo três leituras por pedido', async () => {
    const { fetchRange, state } = fakeTable(50)
    state.total = 20
    await loadHistoryPage(fetchRange, 4, SIZE)
    expect(state.calls.length).toBeLessThanOrEqual(3)
  })
})
