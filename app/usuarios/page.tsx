'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import TopNav from '@/app/components/TopNav'

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
    <main className="min-h-screen pb-16">
      <TopNav />

      <div className="w-full px-4 sm:px-6 lg:px-10">

        {/* ─── HERO ─── */}
        <section className="rise pt-8 pb-6 sm:pt-10">
          <p className="eyebrow mb-2">Pessoas</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Equipe</h1>
          <p className="mt-2 text-sm text-ink-2">Métricas e produtividade de cada membro do time.</p>
        </section>

        {/* ─── ESTADOS ─── */}
        {loading ? (
          <div className="glass rounded-[1.75rem] px-6 py-20 text-center">
            <div className="mx-auto mb-5 h-9 w-9 animate-spin rounded-full border-[3px] border-fill-2 border-t-accent"></div>
            <p className="text-sm text-ink-2">Carregando dados da equipe...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="glass rounded-[1.75rem] border border-dashed border-ink-4 px-6 py-20 text-center">
            <svg className="mx-auto mb-4 text-ink-4" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <p className="text-sm text-ink-2">Nenhum membro da equipe encontrado.</p>
          </div>
        ) : (
          /* ─── GRID DE USUÁRIOS ─── */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {users.map((user, i) => (
              <div
                key={user.id}
                className="glass rise group flex flex-col items-center rounded-[1.75rem] p-6 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-18px_rgba(23,52,92,0.3)] sm:p-7"
                style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              >
                {/* Avatar com brilho aero */}
                <div className="relative mb-5 h-24 w-24">
                  <div className="absolute -inset-2 rounded-full bg-linear-to-b from-aero/40 to-success/30 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"></div>
                  <div className="relative h-full w-full overflow-hidden rounded-full bg-fill shadow-[0_10px_24px_-10px_rgba(23,52,92,0.35)] ring-4 ring-white/80 transition-all duration-300 group-hover:ring-accent/40 dark:ring-white/15">
                    <img
                      src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.email}&background=007AFF&color=fff&size=128`}
                      alt={`Perfil de ${user.email.split('@')[0]}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>

                {/* Identificação */}
                <h2 className="w-full truncate text-lg font-semibold capitalize tracking-tight text-ink">
                  {user.email.split('@')[0]}
                </h2>
                <p className="mb-6 mt-0.5 w-full truncate px-2 text-[12px] text-ink-3">
                  {user.email}
                </p>

                {/* Estatísticas */}
                <div className="mt-auto flex w-full gap-3 border-t border-separator pt-5">
                  <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-fill-soft px-3 py-4 transition-colors duration-300 group-hover:bg-accent/10">
                    <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-ink transition-colors group-hover:text-accent">
                      {user.total_tasks}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
                      Total
                    </p>
                  </div>

                  <div className="flex flex-1 flex-col items-center justify-center gap-1.5 rounded-2xl bg-fill-soft px-3 py-4 transition-colors duration-300 group-hover:bg-success/12">
                    <p className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-ink transition-colors group-hover:text-success">
                      {user.tasks_today}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
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
