'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])
  const [filteredReports, setFilteredReports] = useState<any[]>([]) // Estado para os dados filtrados
  const [loading, setLoading] = useState(true)

  // Estados dos filtros
  const [filterEmail, setFilterEmail] = useState('')
  const [filterDate, setFilterDate] = useState('')

  useEffect(() => {
    fetchReports()
  }, [])

  // Toda vez que a lista original ou os filtros mudarem, atualizamos a lista visível
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
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setReports(data)
      setFilteredReports(data)
    }
    setLoading(false)
  }

  if (loading) return <div className="p-10 text-center font-mono">Carregando base de dados...</div>

  return (
    <main className="p-6 text-black bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-blue-900">Painel de Controle</h1>
          <p className="text-gray-500 text-sm">Gerenciamento de produtividade da equipe</p>
        </div>
        <Link href="/" className="bg-white border px-4 py-2 rounded-lg shadow-sm text-sm font-bold hover:bg-gray-50 transition">
          ← Voltar ao App
        </Link>
      </header>

      {/* --- BARRA DE FILTROS --- */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-gray-400">Buscar por Colaborador</label>
          <input 
            type="text" 
            placeholder="Ex: joao@empresa.com"
            value={filterEmail}
            onChange={(e) => setFilterEmail(e.target.value)}
            className="border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500 bg-gray-50"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold uppercase text-gray-400">Filtrar por Data do Checkout</label>
          <div className="flex gap-2">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="border p-3 rounded-xl outline-none focus:ring-2 ring-blue-500 bg-gray-50 flex-1"
            />
            {filterDate && (
              <button 
                onClick={() => setFilterDate('')}
                className="bg-gray-200 px-4 rounded-xl text-xs font-bold"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </section>

      {/* --- LISTAGEM --- */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-2">
          <p className="text-sm text-gray-500 italic">
            Mostrando <b>{filteredReports.length}</b> resultados
          </p>
        </div>

        {filteredReports.length === 0 && (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center">
            <p className="text-gray-400">Nenhum registro encontrado para esses filtros.</p>
          </div>
        )}
        
        {filteredReports.map((report) => (
          <div key={report.id} className="border-l-4 border-l-blue-600 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="font-black text-lg text-gray-900">{report.user_email}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                     📅 {new Date(report.summary.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                   </span>
                   <span className="text-[10px] text-gray-400 font-medium">
                     Enviado em: {new Date(report.created_at).toLocaleString('pt-BR')}
                   </span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-black text-blue-600">
                  {report.summary.tasks.filter((t: any) => t.done).length}
                  <span className="text-gray-300 text-sm font-normal"> / {report.summary.tasks.length}</span>
                </div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Tarefas Concluídas</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 bg-gray-50 p-4 rounded-xl">
              {report.summary.tasks.map((task: any, index: number) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full ${task.done ? "bg-green-500" : "bg-red-400"}`} />
                  <span className={`flex-1 ${task.done ? "text-gray-700" : "text-gray-400 line-through decoration-1"}`}>
                    {task.title}
                  </span>
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                    task.prio === 'Urgente' ? 'text-red-500 border-red-200' : 'text-gray-400 border-gray-200'
                  }`}>
                    {task.prio}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}