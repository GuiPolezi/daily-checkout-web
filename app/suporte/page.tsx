'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

const DAYS = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTHS = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro']

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [newTask, setNewTask] = useState('')
  const [selectedDay, setSelectedDay] = useState(() => DAY_NAMES[new Date().getDay()])
  const [loading, setLoading] = useState(true)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const dateLabel = `${DAY_NAMES[today.getDay()]}, ${today.getDate()} de ${MONTHS[today.getMonth()]}`

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchData()
    })
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: tasks } = await supabase
      .from('team_tasks')
      .select('*')
      .order('created_at', { ascending: true })
    const { data: doneToday } = await supabase
      .from('team_task_completions')
      .select('*')
      .eq('completion_date', todayStr)

    if (tasks) setTeamTasks(tasks)
    if (doneToday) setCompletions(doneToday)
    setLoading(false)
  }

  const toggleCheck = async (taskId: number) => {
    if (!session) return
    const existing = completions.find(
      c => c.team_task_id === taskId && c.user_id === session.user.id
    )
    if (existing) {
      await supabase.from('team_task_completions').delete().eq('id', existing.id)
    } else {
      await supabase.from('team_task_completions').insert([{
        team_task_id: taskId,
        user_id: session.user.id,
        user_email: session.user.email,
        completion_date: todayStr,
      }])
    }
    fetchData()
  }

  const addTask = async () => {
    if (!newTask.trim() || !session) return
    await supabase.from('team_tasks').insert([{
      title: newTask,
      day_of_week: selectedDay,
      created_by: session.user.email,
    }])
    setNewTask('')
    fetchData()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Tem certeza que deseja remover esta rotina?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchData()
  }

  const filteredTasks = teamTasks.filter(t =>
    selectedDay === 'Todos'
      ? true
      : t.day_of_week === selectedDay || t.day_of_week === 'Todos'
  )

  const pendingTasks = filteredTasks.filter(t =>
    !completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id)
  )
  const doneTasks = filteredTasks.filter(t =>
    completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id)
  )

  const progressPct = filteredTasks.length === 0
    ? 0
    : Math.round((doneTasks.length / filteredTasks.length) * 100)

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <div className="max-w-2xl mx-auto p-5 md:p-8">

        {/* Header */}
        <header className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-medium text-gray-900 tracking-tight">
              Rotina <span className="text-gray-400 font-normal">&amp; Suporte</span>
            </h1>
          </div>
          <Link
            href="/"
            className="text-sm text-gray-500 border border-gray-200 bg-white px-4 py-1.5 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shrink-0"
          >
            ← Início
          </Link>
        </header>

        {/* Progress block */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
          <div className="flex justify-between items-baseline mb-2.5">
            <span className="text-sm text-gray-500">{dateLabel}</span>
            <span className="text-sm font-medium text-gray-900">
              {doneTasks.length} / {filteredTasks.length} concluídas
            </span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPct === 100 && filteredTasks.length > 0 ? 'bg-green-500' : 'bg-gray-900'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Day selector */}
        <nav className="flex gap-1.5 overflow-x-auto pb-1 mb-6 scrollbar-hide">
          {DAYS.map(day => (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`shrink-0 text-sm px-4 py-1.5 rounded-full border transition-all ${
                selectedDay === day
                  ? 'bg-gray-900 text-white border-gray-900 font-medium'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-900 hover:border-gray-400'
              }`}
            >
              {day}
            </button>
          ))}
        </nav>

        {/* Add task */}
        <div className="flex gap-2 mb-7">
          <input
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
            placeholder="Nova tarefa..."
            className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white outline-none placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
          />
          <button
            onClick={addTask}
            disabled={!newTask.trim() || !session}
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
          >
            + Adicionar
          </button>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Carregando...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm text-gray-400">
              Nenhuma tarefa para <strong className="text-gray-600">{selectedDay}</strong>.<br />
              Adicione uma acima.
            </p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* Pending */}
            {pendingTasks.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2 ml-1">
                  Pendentes — {pendingTasks.length}
                </p>
                <div className="flex flex-col gap-px">
                  {pendingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completions={completions}
                      session={session}
                      showDayBadge={selectedDay === 'Todos'}
                      onToggle={() => toggleCheck(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Done */}
            {doneTasks.length > 0 && (
              <section>
                <p className="text-xs uppercase tracking-widest text-gray-400 font-medium mb-2 ml-1">
                  Concluídas — {doneTasks.length}
                </p>
                <div className="flex flex-col gap-px">
                  {doneTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      completions={completions}
                      session={session}
                      showDayBadge={selectedDay === 'Todos'}
                      onToggle={() => toggleCheck(task.id)}
                      onDelete={() => deleteTask(task.id)}
                    />
                  ))}
                </div>
              </section>
            )}

          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-5 border-t border-gray-200">
          <p className="text-xs text-gray-400 leading-relaxed">
            Tarefas marcadas como <span className="text-gray-600 font-medium">"Todos"</span> aparecem
            em todos os dias da semana. O progresso é reiniciado automaticamente a cada dia.
          </p>
        </footer>

      </div>
    </main>
  )
}

function TaskCard({
  task,
  completions,
  session,
  showDayBadge,
  onToggle,
  onDelete,
}: {
  task: any
  completions: any[]
  session: any
  showDayBadge: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const whoCompleted = completions.filter(c => c.team_task_id === task.id)
  const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

  return (
    <div
      onClick={onToggle}
      className={`group flex items-center gap-3 px-4 py-3 border cursor-pointer transition-all duration-150 first:rounded-t-xl last:rounded-b-xl ${
        iDidIt
          ? 'bg-green-50/60 border-green-100'
          : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
      }`}
    >
      {/* Checkbox */}
      <div
        className={`shrink-0 w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center transition-all ${
          iDidIt
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 group-hover:border-gray-500'
        }`}
      >
        {iDidIt && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Title */}
      <span className={`flex-1 text-sm leading-snug transition-colors ${
        iDidIt ? 'text-gray-400 line-through' : 'text-gray-800'
      }`}>
        {task.title}
      </span>

      {/* Day badge (only in "Todos" view) */}
      {showDayBadge && (
        <span className="shrink-0 text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {task.day_of_week === 'Todos' ? 'Todo dia' : task.day_of_week}
        </span>
      )}

      {/* Who completed */}
      {whoCompleted.length > 0 && (
        <div className="shrink-0 flex gap-1">
          {whoCompleted.map(c => (
            <span key={c.id} className="text-[11px] text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-medium">
              {c.user_email.split('@')[0]}
            </span>
          ))}
        </div>
      )}

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
        title="Remover tarefa"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}