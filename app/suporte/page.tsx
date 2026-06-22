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
      await supabase.from('team_task_completions').delete().eq('id', existingCheck.id)
    } else {
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
    setNewTask(''); 
    fetchData()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta rotina?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchData()
  }

  const filteredTasks = teamTasks.filter(t => 
    selectedDay === 'Todos' ? true : t.day_of_week === selectedDay || t.day_of_week === 'Todos'
  )

  // Função auxiliar para pegar a inicial do email para o avatar
  const getInitial = (email: string) => email.charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-zinc-800 font-sans selection:bg-zinc-200">
      <div className="max-w-3xl mx-auto p-5 md:p-10">
        
        {/* Header Minimalista */}
        <header className="flex justify-between items-end mb-12">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Rotina da Equipe</h1>
            <p className="text-zinc-500 mt-1 text-sm">{todayStr.split('-').reverse().join('/')}</p>
          </div>
          <Link 
            href="/" 
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← Voltar
          </Link>
        </header>

        {/* Abas de Dias (Pills) */}
        <nav className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide snap-x">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 whitespace-nowrap snap-start ${
                selectedDay === day 
                  ? 'bg-zinc-900 text-white shadow-md' 
                  : 'bg-white text-zinc-500 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-800'
              }`}
            >
              {day}
            </button>
          ))}
        </nav>

        {/* Input Unificado e Limpo */}
        <div className="relative mb-10 group">
          <input 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder={`Adicionar nova tarefa para ${selectedDay}...`}
            className="w-full pl-5 pr-32 py-4 bg-white border border-zinc-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-zinc-900 focus:border-transparent outline-none transition-all text-zinc-800 placeholder-zinc-400"
          />
          <button 
            onClick={addTask} 
            disabled={!newTask.trim()}
            className="absolute right-2 top-2 bottom-2 px-5 bg-zinc-900 text-white rounded-xl text-sm font-medium hover:bg-zinc-800 active:scale-95 transition-all disabled:opacity-0 disabled:pointer-events-none"
          >
            Criar
          </button>
        </div>

        {/* Lista de Tarefas */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-transparent rounded-2xl border-2 border-dashed border-zinc-200">
                <p className="text-zinc-400 text-sm">Tudo limpo para <strong>{selectedDay}</strong>.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const whoCompleted = completions.filter(c => c.team_task_id === task.id)
                const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

                return (
                  <div 
                    key={task.id} 
                    className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-2xl transition-all duration-300 ${
                      iDidIt 
                        ? 'bg-transparent border border-transparent opacity-60 hover:opacity-100' 
                        : 'bg-white border border-zinc-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Círculo de Check Minimalista */}
                      <button 
                        onClick={() => toggleCheck(task.id)}
                        className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                          iDidIt 
                            ? 'bg-zinc-800 border-zinc-800 text-white' 
                            : 'border-zinc-300 text-transparent hover:border-zinc-400'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      
                      {/* Título da Tarefa */}
                      <div className="flex flex-col">
                        <span className={`text-base font-medium transition-all duration-300 ${
                          iDidIt ? 'text-zinc-400 line-through' : 'text-zinc-800'
                        }`}>
                          {task.title}
                        </span>
                        {task.day_of_week !== 'Todos' && selectedDay === 'Todos' && (
                          <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider mt-0.5">
                            {task.day_of_week}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 pl-10 sm:pl-0">
                      {/* Avatares de quem concluiu */}
                      <div className="flex -space-x-2">
                        {whoCompleted.map((c) => (
                          <div 
                            key={c.id} 
                            title={c.user_email}
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white border-2 border-[#F8F9FA] shadow-sm ${
                              c.user_id === session?.user.id ? 'bg-zinc-900 z-10' : 'bg-zinc-400'
                            }`}
                          >
                            {getInitial(c.user_email)}
                          </div>
                        ))}
                      </div>

                      {/* Botão de Excluir (Aparece no Hover) */}
                      <button 
                        onClick={() => deleteTask(task.id)} 
                        className="text-zinc-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 p-1"
                        title="Remover rotina"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </main>
  )
}