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

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-red-100 selection:text-red-900">
      <div className="max-w-4xl mx-auto p-6 md:p-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900">
              Suporte <span className="text-red-600">&</span> Rotina
            </h1>
            <p className="text-gray-500 mt-1 text-sm md:text-base">Gerenciamento de tarefas diárias fixas da equipe</p>
          </div>
          <Link 
            href="/" 
            className="inline-flex items-center justify-center bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            Voltar ao Início
          </Link>
        </header>

        {/* Seletor de Dia */}
        <nav className="flex gap-2 py-2 px-1 overflow-x-auto pb-4 mb-8 scrollbar-hide snap-x">
          {days.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap snap-start ${
                selectedDay === day 
                  ? 'bg-gray-900 text-white shadow-md ring-2 ring-gray-900 ring-offset-2 ring-offset-gray-50' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {day}
            </button>
          ))}
        </nav>

        {/* Adicionar nova rotina */}
        <div className="bg-white p-2 rounded-2xl mb-10 shadow-sm border border-gray-200 flex flex-col sm:flex-row gap-2 focus-within:ring-2 focus-within:ring-red-500 focus-within:border-red-500 transition-all">
          <input 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Ex: Fazer backup do banco de dados..."
            className="flex-1 px-4 py-3 outline-none text-sm md:text-base bg-transparent placeholder-gray-400"
          />
          <button 
            onClick={addTask} 
            disabled={!newTask.trim()}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Adicionar Rotina
          </button>
        </div>

        {/* Feedback de Loading */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-500 text-sm font-medium">Carregando rotinas...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-gray-300">
                <p className="text-gray-500">Nenhuma rotina encontrada para <strong>{selectedDay}</strong>.</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const whoCompleted = completions.filter(c => c.team_task_id === task.id)
                const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

                return (
                  <div 
                    key={task.id} 
                    className={`group bg-white border rounded-2xl p-5 md:p-6 transition-all duration-200 ${
                      iDidIt ? 'border-green-200 shadow-sm bg-green-50/30' : 'border-gray-200 shadow-sm hover:shadow-md hover:border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-5">
                      <div className="flex items-start gap-4 flex-1">
                        <button 
                          onClick={() => toggleCheck(task.id)}
                          className={`mt-1 shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                            iDidIt 
                              ? 'bg-green-500 border-green-500 text-white scale-110 shadow-sm' 
                              : 'bg-gray-50 border-gray-300 text-transparent hover:border-red-400 hover:bg-red-50'
                          }`}
                        >
                          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <div>
                          <h3 className={`font-semibold text-base md:text-lg transition-colors ${
                            iDidIt ? 'text-gray-400 line-through' : 'text-gray-900'
                          }`}>
                            {task.title}
                          </h3>
                          <span className="inline-block mt-1.5 px-2.5 py-0.5 rounded-md bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                            {task.day_of_week}
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteTask(task.id)} 
                        className="text-gray-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Remover rotina"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* LISTA DE QUEM MARCOU */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-4 border-t border-gray-100">
                      <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">
                        Status de hoje:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {whoCompleted.length === 0 ? (
                          <span className="text-[12px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            Pendente
                          </span>
                        ) : (
                          whoCompleted.map(c => (
                            <span 
                              key={c.id} 
                              className="inline-flex items-center gap-1.5 bg-green-100 text-green-800 text-[11px] font-bold px-3 py-1 rounded-full"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                              {c.user_email.split('@')[0]}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 p-6 md:p-8 bg-gray-900 rounded-3xl text-gray-300 shadow-xl">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💡</span>
            <h3 className="font-bold text-white text-lg">Como funciona?</h3>
          </div>
          <p className="text-sm text-gray-400 leading-relaxed max-w-3xl">
            Esta área serve para padronizar o trabalho. As tarefas criadas aqui são visíveis para todos. 
            Use para listar processos que <strong className="text-white">não podem ser esquecidos</strong> em dias específicos da semana.
          </p>
        </footer>

      </div>
    </main>
  )
}