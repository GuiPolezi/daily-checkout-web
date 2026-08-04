'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import TopNav from '@/app/components/TopNav'

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])
  const [filteredReports, setFilteredReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [filterEmail, setFilterEmail] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    fetchReports()
  }, [])

  useEffect(() => {
    let result = reports

    if (filterEmail) {
      result = result.filter(r =>
        r.user_email?.toLowerCase().includes(filterEmail.toLowerCase())
      )
    }

    if (filterDate) {
      result = result.filter(r => r.summary.date === filterDate)
    }

    setFilteredReports(result)
  }, [filterEmail, filterDate, reports])

  async function fetchReports() {
    setLoading(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setReports(data)
      setFilteredReports(data)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen pb-16">
      <TopNav />

      <div className="w-full px-4 sm:px-6 lg:px-10">

        {/* ─── HERO ─── */}
        <section className="rise pt-8 pb-6 sm:pt-10">
          <p className="eyebrow mb-2">Relatórios</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Histórico</h1>
          <p className="mt-2 text-sm text-ink-2">Monitoramento de relatórios e entregas da equipe.</p>
        </section>

        {/* ─── FILTROS ─── */}
        <section className="glass rise mb-8 rounded-[1.75rem] p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div>
              <label htmlFor="filter-email" className="mb-2 ml-1 block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Colaborador
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
                <input
                  id="filter-email"
                  type="text"
                  placeholder="Buscar por e-mail..."
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  className="field rounded-full pl-11"
                />
              </div>
            </div>

            <div>
              <label htmlFor="filter-date" className="mb-2 ml-1 block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Data do relatório
              </label>
              <div className="flex gap-2.5">
                <input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="field date-input flex-1 cursor-pointer rounded-full"
                />
                {filterDate && (
                  <button
                    onClick={() => setFilterDate('')}
                    className="btn btn-secondary px-5 text-[13px]"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ─── LISTAGEM ─── */}
        <div className="space-y-5">
          <div className="flex items-center gap-2.5 px-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-3">
              Registros encontrados
            </h2>
            <span className="chip chip-accent tabular-nums">{filteredReports.length}</span>
          </div>

          {loading ? (
            <div className="glass rounded-[1.75rem] px-6 py-20 text-center">
              <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-[3px] border-fill-2 border-t-accent"></div>
              <p className="text-sm text-ink-2">Consultando base de dados...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="glass rounded-[1.75rem] border border-dashed border-ink-4 px-6 py-20 text-center">
              <svg className="mx-auto mb-4 text-ink-4" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
              <p className="text-sm text-ink-2">Nenhum relatório corresponde aos filtros aplicados.</p>
              <button
                onClick={() => { setFilterEmail(''); setFilterDate('') }}
                className="btn btn-secondary mx-auto mt-5 text-[13px]"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : (
            filteredReports.map((report, i) => {
              const totalTasks = report.summary.tasks.length;
              const completedTasks = report.summary.tasks.filter((t: any) => t.done).length;
              const percent = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <div
                  key={report.id}
                  className="glass rise rounded-[1.75rem] p-5 transition-all duration-300 hover:shadow-[0_20px_44px_-18px_rgba(23,52,92,0.28)] sm:p-7 lg:p-8"
                  style={{ animationDelay: `${Math.min(i, 6) * 50}ms` }}
                >
                  {/* Topo do card */}
                  <div className="mb-7 flex flex-col justify-between gap-5 md:flex-row md:items-start md:gap-8">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-linear-to-b from-[#3aa0ff] to-[#007aff] text-lg font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_18px_-8px_rgba(0,122,255,0.6)]">
                        {report.user_email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[15px] font-semibold text-ink">
                          {report.user_email}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2.5">
                          <span className="chip chip-neutral px-3 py-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="4"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            {new Date(report.summary.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </span>
                          <span className="chip chip-neutral px-3 py-1.5">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>
                            Enviado em {new Date(report.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Taxa de conclusão */}
                    <div className="flex w-full shrink-0 items-center justify-between gap-5 rounded-2xl bg-fill-soft px-5 py-4 md:w-auto">
                      <div className="text-2xl font-semibold tabular-nums tracking-tight text-ink">
                        {completedTasks}
                        <span className="mx-1 text-lg font-normal text-ink-4">/</span>
                        <span className="text-lg text-ink-2">{totalTasks}</span>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-3">
                          {percent}% concluído
                        </p>
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-fill">
                          <div
                            className="h-full rounded-full bg-linear-to-r from-accent to-aero"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Lista de tarefas */}
                  <div className="grid grid-cols-1 gap-2.5">
                    <p className="ml-1 mb-1 text-xs font-semibold uppercase tracking-widest text-ink-3">
                      Detalhes da entrega
                    </p>
                    {report.summary.tasks.map((task: any, index: number) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3.5 rounded-2xl border px-4 py-3 ${
                          task.done
                            ? 'border-success/20 bg-success/10'
                            : 'border-separator bg-fill-soft'
                        }`}
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          task.done
                            ? 'bg-success text-white shadow-[0_4px_10px_-3px_rgba(52,199,89,0.6)]'
                            : 'border-2 border-ink-4 bg-surface'
                        }`}>
                          {task.done && (
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7"/></svg>
                          )}
                        </div>

                        <span className={`min-w-0 flex-1 text-sm ${task.done ? 'font-medium text-ink' : 'text-ink-2'}`}>
                          {task.title}
                        </span>

                        {task.prio === 'Urgente' && (
                          <span className="chip chip-danger">Urgente</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  )
}
