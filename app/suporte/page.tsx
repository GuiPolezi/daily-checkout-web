'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([]) // Novo estado
  const [newTask, setNewTask] = useState('')
  const [selectedDay, setSelectedDay] = useState('Todos')
  const [loading, setLoading] = useState(true)

  const todayStr = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  const days = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

 useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchData()
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    
    // 1. Busca as tarefas fixas
    const { data: tasks } = await supabase.from('team_tasks').select('*').order('created_at', { ascending: true })
    
    // 2. Busca quem já deu check HOJE
    const { data: doneToday } = await supabase
      .from('team_task_completions')
      .select('*')
      .eq('completion_date', todayStr)

    if (tasks) setTeamTasks(tasks)
    if (doneToday) setCompletions(doneToday)
    setLoading(false)
  }

  // Função para dar ou tirar o Check
  const toggleCheck = async (taskId: number) => {
    if (!session) return

    const existingCheck = completions.find(c => c.team_task_id === taskId && c.user_id === session.user.id)

    if (existingCheck) {
      // Se já existe, ele quer desmarcar
      await supabase.from('team_task_completions').delete().eq('id', existingCheck.id)
    } else {
      // Se não existe, ele quer marcar
      await supabase.from('team_task_completions').insert([{
        team_task_id: taskId,
        user_id: session.user.id,
        user_email: session.user.email,
        completion_date: todayStr
      }])
    }
    fetchData() // Recarrega para mostrar as mudanças
  }

  const addTask = async () => {
    if (!newTask || !session) return
    await supabase.from('team_tasks').insert([{ title: newTask, day_of_week: selectedDay, created_by: session.user.email }])
    setNewTask(''); fetchData()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Remover rotina?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchData()
  }

  const filteredTasks = teamTasks.filter(t => 
    selectedDay === 'Todos' ? true : t.day_of_week === selectedDay || t.day_of_week === 'Todos'
  )

  return (
    <main className="p-6 text-black min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-red-600 italic">SUPORTE & ROTINA</h1>
          <p className="text-gray-500 text-sm">Tarefas diárias fixas da equipe</p>
        </div>
        <Link href="/" className="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold">VOLTAR</Link>
      </header>

      {/* Seletor de Dia */}
      <nav className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
        {days.map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
              selectedDay === day ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {day}
          </button>
        ))}
      </nav>

      {/* Adicionar nova rotina */}
      <div className="bg-white border-2 border-black p-4 rounded-2xl mb-8 flex gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <input 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Adicionar nova rotina de equipe..."
          className="flex-1 outline-none text-sm"
        />
        <button onClick={addTask} className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold border-2 border-black">
          ADICIONAR
        </button>
      </div>

      {/* Lista de Tarefas */}
      <div className="space-y-4">
        {filteredTasks.map(task => {
          // Filtra quem marcou esta tarefa específica
          const whoCompleted = completions.filter(c => c.team_task_id === task.id)
          const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

          return (
            <div key={task.id} className="bg-white border-2 border-gray-100 rounded-2xl p-5 shadow-sm hover:border-red-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => toggleCheck(task.id)}
                    className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all ${iDidIt ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200'}`}
                  >
                    {iDidIt ? '✓' : ''}
                  </button>
                  <div>
                    <h3 className={`font-bold text-lg ${iDidIt ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.title}</h3>
                    <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">{task.day_of_week}</span>
                  </div>
                </div>
                <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition-colors">🗑️</button>
              </div>

              {/* LISTA DE QUEM MARCOU */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                <p className="text-[10px] text-gray-400 font-bold uppercase w-full">Finalizado por:</p>
                {whoCompleted.length === 0 ? (
                  <span className="text-[10px] text-gray-300 italic">Ninguém marcou ainda hoje</span>
                ) : (
                  whoCompleted.map(c => (
                    <span key={c.id} className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-md border border-green-100">
                      ● {c.user_email.split('@')[0]}
                    </span>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      <footer className="mt-12 p-6 bg-gray-900 rounded-2xl text-white">
        <h3 className="font-bold mb-2">💡 Como funciona?</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          Esta área serve para padronizar o trabalho. As tarefas criadas aqui são visíveis para todos. 
          Use para listar processos que <strong>não podem ser esquecidos</strong> em dias específicos da semana.
        </p>
      </footer>
    </main>
  )
}