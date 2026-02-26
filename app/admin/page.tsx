'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

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
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto p-6 md:p-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Painel de Controle</h1>
            </div>
            <p className="text-slate-500 text-sm md:text-base">Monitoramento de relatórios e entregas da equipe</p>
          </div>
          <Link 
            href="/" 
            className="group flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
          >
            <span className="group-hover:-translate-x-1 transition-transform">←</span> Voltar ao App
          </Link>
        </header>

        {/* Filtros */}
        <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mb-10">
          <div className="flex items-center gap-2 mb-4 text-indigo-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest">Filtros de Busca</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Colaborador</label>
              <input 
                type="text" 
                placeholder="Busque por e-mail..."
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 uppercase ml-1">Data do Relatório</label>
              <div className="flex gap-2">
                <input 
                  type="date" 
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 p-3.5 rounded-2xl outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all text-sm text-slate-600"
                />
                {filterDate && (
                  <button 
                    onClick={() => setFilterDate('')}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 rounded-2xl text-xs font-bold transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Listagem */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
              Registros Encontrados: <span className="text-indigo-600">{filteredReports.length}</span>
            </h2>
          </div>

          {loading ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium italic">Consultando base de dados...</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="bg-white py-20 rounded-3xl border border-dashed border-slate-300 text-center shadow-sm">
              <span className="text-4xl mb-4 block">🔍</span>
              <p className="text-slate-500 font-medium">Nenhum relatório corresponde aos filtros aplicados.</p>
              <button onClick={() => {setFilterEmail(''); setFilterDate('')}} className="mt-4 text-indigo-600 text-sm font-bold hover:underline">Limpar todos os filtros</button>
            </div>
          ) : (
            filteredReports.map((report) => {
              const totalTasks = report.summary.tasks.length;
              const completedTasks = report.summary.tasks.filter((t: any) => t.done).length;
              const percent = Math.round((completedTasks / totalTasks) * 100);

              return (
                <div key={report.id} className="group bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300">
                  <div className="p-6 md:p-8">
                    {/* Topo do Card */}
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-bold text-xl shadow-inner">
                          {report.user_email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-lg text-slate-800 leading-tight mb-1 group-hover:text-indigo-600 transition-colors">
                            {report.user_email}
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1">
                              📅 {new Date(report.summary.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </span>
                            <span className="text-[11px] text-slate-400 font-medium">
                              Enviado em: {new Date(report.created_at).toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-auto bg-slate-50 md:bg-transparent p-4 md:p-0 rounded-2xl flex flex-row md:flex-col items-center md:items-end justify-between gap-1">
                        <div className="text-3xl font-black text-indigo-600 tabular-nums">
                          {completedTasks}<span className="text-slate-300 text-lg font-medium mx-1">/</span>{totalTasks}
                        </div>
                        <div className="flex flex-col items-end">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Taxa de Conclusão</p>
                           <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${percent}%` }}></div>
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Lista de Tarefas Estilizada */}
                    <div className="grid grid-cols-1 gap-3">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 ml-1">Detalhes da Entrega</p>
                      {report.summary.tasks.map((task: any, index: number) => (
                        <div 
                          key={index} 
                          className={`flex items-center gap-4 p-3 rounded-2xl border transition-colors ${
                            task.done 
                              ? "bg-emerald-50/30 border-emerald-100/50" 
                              : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center shadow-sm ${
                            task.done ? "bg-emerald-500 text-white" : "bg-white border-2 border-slate-200 text-slate-300"
                          }`}>
                            {task.done ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <div className="w-1.5 h-1.5 bg-slate-200 rounded-full"></div>
                            )}
                          </div>
                          
                          <span className={`flex-1 text-sm font-semibold ${task.done ? "text-slate-700" : "text-slate-400 line-through decoration-slate-300"}`}>
                            {task.title}
                          </span>

                          {task.prio === 'Urgente' && (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-md bg-red-100 text-red-600 border border-red-200 uppercase tracking-tighter shadow-sm">
                              🔥 {task.prio}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
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