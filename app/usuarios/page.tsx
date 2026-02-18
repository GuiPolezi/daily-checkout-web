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
    // Buscamos direto da VIEW que criamos no SQL
    const { data } = await supabase.from('user_task_stats').select('*')
    if (data) setUsers(data)
    setLoading(false)
  }

  return (
    <main className="max-w-4xl mx-auto p-6 text-black bg-white min-h-screen">
      <header className="mb-10 flex justify-between items-center">
        <h1 className="text-3xl font-black">Time do Sistema</h1>
        <Link href="/" className="text-blue-600 font-bold underline">Voltar</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div key={user.id} className="bg-gray-50 border-2 border-gray-100 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm">
            {/* Imagem de Perfil */}
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-4 bg-gray-200">
              <img 
                src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=random`} 
                alt="Perfil"
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="font-bold text-lg mb-1 truncate w-full">{user.email.split('@')[0]}</h2>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-4">{user.email}</p>

            <div className="grid grid-cols-2 gap-4 w-full border-t pt-4">
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{user.total_tasks}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Total de Tasks</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-green-500">{user.tasks_today}</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase">Criadas Hoje</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}