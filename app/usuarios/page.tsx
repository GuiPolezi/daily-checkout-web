'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase.from('user_task_stats').select('*')
    if (data) setUsers(data)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      <div className="max-w-6xl mx-auto p-6 md:p-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              Time <span className="text-blue-600">&</span> Performance
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Métricas e produtividade da equipe</p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            Voltar ao Início
          </Link>
        </header>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 text-sm font-medium">Carregando dados da equipe...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
            <p className="text-gray-500">Nenhum membro da equipe encontrado.</p>
          </div>
        ) : (
          /* Grid de Usuários */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {users.map((user) => (
              <div 
                key={user.id} 
                className="group bg-white border border-gray-200 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-300 relative overflow-hidden"
              >
                {/* Efeito de brilho sutil no topo do card */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                {/* Avatar */}
                <div className="relative w-24 h-24 mb-5">
                  <div className="absolute inset-0 bg-blue-100 rounded-full blur-md opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-md bg-gray-100 ring-2 ring-transparent group-hover:ring-blue-100 transition-all">
                    <img 
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} 
                      alt={`Perfil de ${user.email.split('@')[0]}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                {/* Info do Usuário */}
                <h2 className="font-bold text-lg text-gray-900 truncate w-full">
                  {user.email.split('@')[0]}
                </h2>
                <p className="text-[11px] text-gray-400 font-semibold tracking-wider mb-6 truncate w-full px-2">
                  {user.email}
                </p>

                {/* Estatísticas */}
                <div className="flex gap-3 w-full mt-auto pt-4 border-t border-gray-100">
                  <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center transition-colors group-hover:bg-blue-50/50">
                    <p className="text-2xl font-black text-gray-800 group-hover:text-blue-600 transition-colors">
                      {user.total_tasks}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 text-center">
                      Total
                    </p>
                  </div>
                  
                  <div className="flex-1 bg-gray-50 rounded-2xl p-3 flex flex-col items-center justify-center transition-colors group-hover:bg-green-50/50">
                    <p className="text-2xl font-black text-gray-800 group-hover:text-green-600 transition-colors">
                      {user.tasks_today}
                    </p>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-1 text-center">
                      Hoje
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}