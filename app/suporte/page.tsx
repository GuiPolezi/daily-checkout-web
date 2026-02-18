'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [newTask, setNewTask] = useState('')
  const [selectedDay, setSelectedDay] = useState('Todos')
  const [loading, setLoading] = useState(true)

  const days = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    fetchTeamTasks()
  }, [])

  async function fetchTeamTasks() {
    setLoading(true)
    const { data } = await supabase
      .from('team_tasks')
      .select('*')
      .order('created_at', { ascending: true })
    
    if (data) setTeamTasks(data)
    setLoading(false)
  }

  const addTask = async () => {
    if (!newTask || !session) return
    const { error } = await supabase.from('team_tasks').insert([{
      title: newTask,
      day_of_week: selectedDay,
      created_by: session.user.email
    }])

    if (!error) {
      setNewTask('')
      fetchTeamTasks()
    }
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Remover esta tarefa da rotina da equipe?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchTeamTasks()
  }

  // Filtragem local para ser rápido
  const filteredTasks = teamTasks.filter(t => 
    selectedDay === 'Todos' ? true : t.day_of_week === selectedDay || t.day_of_week === 'Todos'
  )

  return (
    <main className="max-w-3xl mx-auto p-6 text-black min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-red-600 italic">SUPORTE & ROTINA</h1>
          <p className="text-gray-500 text-sm">Tarefas diárias fixas da equipe</p>
        </div>
        <Link href="/" className="text-sm font-bold border-b-2 border-black">Voltar Home</Link>
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

      {/* Listagem */}
      <div className="space-y-3">
        {loading ? <p className="text-center text-gray-400">Carregando rotinas...</p> : 
         filteredTasks.length === 0 ? <p className="text-center text-gray-400 italic">Nenhuma rotina para {selectedDay}.</p> :
         filteredTasks.map(task => (
          <div key={task.id} className="flex items-center justify-between p-4 bg-white border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div>
              <p className="font-bold text-gray-800">{task.title}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded font-bold uppercase">{task.day_of_week}</span>
                <span className="text-[10px] text-gray-400 font-medium italic">por: {task.created_by.split('@')[0]}</span>
              </div>
            </div>
            <button onClick={() => deleteTask(task.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg">
              🗑️
            </button>
          </div>
        ))}
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