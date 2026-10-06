/** Resposta de uma leitura por intervalo, no formato que o Supabase devolve */
export interface RangeResponse<T> {
  data: T[] | null
  count: number | null
  error: unknown
}

/** Lê as linhas de `from` a `to` (inclusive) e o total, do mais recente para o mais antigo */
export type FetchRange<T> = (from: number, to: number) => PromiseLike<RangeResponse<T>>

export interface HistoryPage<T> {
  rows: T[]
  total: number
  /** Página que de fato veio; pode ser anterior à pedida se o histórico encolheu */
  page: number
}

export const lastPageIndex = (total: number, pageSize: number) =>
  Math.max(0, Math.ceil(total / pageSize) - 1)

async function readPage<T>(fetchRange: FetchRange<T>, page: number, pageSize: number): Promise<HistoryPage<T> | null> {
  const from = page * pageSize
  try {
    const { data, count, error } = await fetchRange(from, from + pageSize - 1)
    if (error) return null
    return { rows: data ?? [], total: count ?? 0, page }
  } catch {
    return null
  }
}

/**
 * Carrega uma página do histórico. Se a página pedida deixou de existir (o total encolheu por um
 * estorno, por exemplo), devolve a última que existe. Devolve null quando não dá para ler nada;
 * quem chama mantém na tela o que já estava.
 */
export async function loadHistoryPage<T>(
  fetchRange: FetchRange<T>,
  page: number,
  pageSize: number,
): Promise<HistoryPage<T> | null> {
  const wanted = await readPage(fetchRange, page, pageSize)
  if (wanted && page <= lastPageIndex(wanted.total, pageSize)) return wanted
  if (page === 0) return wanted

  // Pedir além do fim pode vir como erro, sem o total. A primeira página sempre existe e traz o
  // total atual, que diz qual é a última página de verdade.
  const first = await readPage(fetchRange, 0, pageSize)
  if (!first) return null
  const target = Math.min(page, lastPageIndex(first.total, pageSize))
  if (target === 0) return first
  const retry = await readPage(fetchRange, target, pageSize)
  return retry && target <= lastPageIndex(retry.total, pageSize) ? retry : first
}
