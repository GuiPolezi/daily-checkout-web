'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [newTask, setNewTask] = useState('')
  const [selectedDay, setSelectedDay] = useState('Todos')
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toISOString().split('T')[0]
  const days = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchData()
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: tasks } = await supabase.from('team_tasks').select('*').order('created_at', { ascending: true })
    const { data: doneToday } = await supabase.from('team_task_completions').select('*').eq('completion_date', todayStr)

    if (tasks) setTeamTasks(tasks)
    if (doneToday) setCompletions(doneToday)
    setLoading(false)
  }

  const toggleCheck = async (taskId: number) => {
    if (!session) return
    const existingCheck = completions.find(c => c.team_task_id === taskId && c.user_id === session.user.id)

    if (existingCheck) {
      setCompletions(prev => prev.filter(c => c.id !== existingCheck.id))
      await supabase.from('team_task_completions').delete().eq('id', existingCheck.id)
    } else {
      const tempId = Math.random()
      setCompletions(prev => [...prev, { id: tempId, team_task_id: taskId, user_id: session.user.id, user_email: session.user.email, completion_date: todayStr }])
      await supabase.from('team_task_completions').insert([{
        team_task_id: taskId,
        user_id: session.user.id,
        user_email: session.user.email,
        completion_date: todayStr
      }])
    }
    fetchData()
  }

  const addTask = async () => {
    if (!newTask.trim() || !session) return
    await supabase.from('team_tasks').insert([{ title: newTask, day_of_week: selectedDay, created_by: session.user.email }])
    setNewTask('')
    fetchData()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta rotina?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchData()
  }

  // Lógica alterada: Se for 'Todos', mostra tudo. Se for um dia específico, isola estritamente as tarefas daquele dia.
  const filteredTasks = teamTasks.filter(t => 
    selectedDay === 'Todos' ? true : t.day_of_week === selectedDay
  )

  const pendingTasks = filteredTasks.filter(t => !completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id))
  const completedTasks = filteredTasks.filter(t => completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id))

  return (
    <main className="min-h-screen bg-[#FAFAFA] text-zinc-900 font-sans selection:bg-zinc-200">
      <div className="max-w-3xl mx-auto p-6 md:py-12">
        
        {/* Header Minimalista */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900">
              Rotina da Equipe
            </h1>
            <p className="text-zinc-500 mt-1 text-sm">Organize e acompanhe as tarefas fixas do dia a dia.</p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center bg-white border border-zinc-200 text-zinc-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-50 hover:text-zinc-900 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
        </header>

        {/* Seletor de Dia (Estilo "Pills") */}
        <nav className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide snap-x">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap snap-start ${
                selectedDay === day 
                  ? 'bg-zinc-900 text-white shadow-sm' 
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
              }`}
            >
              {day}
            </button>
          ))}
        </nav>

        {/* Input de Nova Tarefa Integrado */}
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 p-2 flex items-center mb-10 transition-shadow focus-within:ring-2 focus-within:ring-zinc-900 focus-within:border-zinc-900">
          <div className="pl-3 text-zinc-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <input 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder={`Adicionar nova rotina em "${selectedDay}"...`}
            className="flex-1 px-3 py-2 outline-none text-sm bg-transparent placeholder-zinc-400"
          />
          <button 
            onClick={addTask} 
            disabled={!newTask.trim()}
            className="bg-zinc-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar
          </button>
        </div>

        {/* Lista de Tarefas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
            <p className="text-zinc-400 text-sm">Sincronizando tarefas...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-zinc-300">
                <p className="text-zinc-500 text-sm">Nenhuma rotina configurada para <strong>{selectedDay}</strong>.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...pendingTasks, ...completedTasks].map(task => {
                  const whoCompleted = completions.filter(c => c.team_task_id === task.id)
                  const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

                  return (
                    <div 
                      key={task.id} 
                      className={`group flex items-center justify-between p-4 bg-white border rounded-xl transition-all duration-200 ${
                        iDidIt 
                          ? 'border-zinc-100 opacity-60 bg-zinc-50/50 hover:opacity-100' 
                          : 'border-zinc-200 shadow-sm hover:border-zinc-300'
                      }`}
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {/* Checkbox Customizado */}
                        <button 
                          onClick={() => toggleCheck(task.id)}
                          className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-200 ${
                            iDidIt 
                              ? 'bg-zinc-900 border-zinc-900 text-white' 
                              : 'bg-white border-zinc-300 text-transparent hover:border-zinc-400 hover:bg-zinc-50'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>

                        {/* Título e Badge */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 truncate">
                          <span className={`text-sm md:text-base font-medium truncate transition-colors ${
                            iDidIt ? 'text-zinc-400 line-through' : 'text-zinc-800'
                          }`}>
                            {task.title}
                          </span>
                          {selectedDay === 'Todos' && task.day_of_week !== 'Todos' && (
                            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-100 text-zinc-500 uppercase tracking-wide">
                              {task.day_of_week}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Lado Direito: Quem completou e Ações */}
                      <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="flex -space-x-2 overflow-hidden">
                          {whoCompleted.map(c => {
                            const initial = c.user_email.charAt(0).toUpperCase()
                            return (
                              <div 
                                key={c.id} 
                                title={c.user_email}
                                className="inline-block w-7 h-7 rounded-full bg-zinc-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-zinc-600"
                              >
                                {initial}
                              </div>
                            )
                          })}
                        </div>

                        <button 
                          onClick={() => deleteTask(task.id)} 
                          className="text-zinc-300 hover:text-red-500 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                          title="Excluir rotina"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer Minimalista */}
        <div className="mt-12 p-5 bg-white border border-zinc-200 rounded-xl flex gap-4 items-start shadow-sm">
          <div className="bg-zinc-100 p-2 rounded-lg shrink-0">
            <svg className="w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-zinc-900 text-sm">Como usar as Rotinas</h3>
            <p className="text-sm text-zinc-500 mt-1 leading-relaxed">
              Adicione processos recorrentes da equipe. Marque o círculo para confirmar a conclusão no dia atual. Tarefas concluídas descem para o final da lista para manter seu foco no que falta.
            </p>
          </div>
        </div>

      </div>
    </main>
  )
}