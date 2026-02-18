'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function AdminPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  
  useEffect(() => {
    fetchReports()
  }, [])

  async function fetchReports() {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
    console.error("Erro ao buscar:", error.message) // Veja isso no console do F12
    }

    console.log("Dados recebidos:", data) // Veja se o array vem vazio [] ou com dados
    if (data) setReports(data)
    setLoading(false)

  }

  if (loading) return <div className="p-10 text-center">Carregando relatórios...</div>

  return (
    <main className="max-w-4xl mx-auto p-6 text-black">
      <header className="flex justify-between items-center mb-10">
        <h1 className="text-3xl font-bold">Painel de Checkouts</h1>
        <Link href="/" className="text-blue-600 hover:underline">Voltar ao Início</Link>
      </header>

      <div className="space-y-6">
        {reports.length === 0 && <p className="text-gray-500 text-center">Nenhum checkout enviado ainda.</p>}
        
        {reports.map((report) => (
          <div key={report.id} className="border rounded-xl p-6 bg-white shadow-sm">
            <div className="flex justify-between items-start border-b pb-3 mb-4">
              <div>
                <p className="font-bold text-lg">{report.user_email}</p>
                <p className="text-sm text-gray-500">
                  {new Date(report.created_at).toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                  {report.summary.tasks.length} atividades
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {report.summary.tasks.map((task: any, index: number) => (
                <div key={index} className="flex items-center gap-3 text-sm">
                  <span className={task.done ? "text-green-500" : "text-gray-300"}>
                    {task.done ? "●" : "○"}
                  </span>
                  <span className={task.done ? "text-gray-800" : "text-gray-400 italic"}>
                    {task.title}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 ml-auto border px-1 rounded uppercase">
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