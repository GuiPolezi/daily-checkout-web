'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import Link from 'next/link'

const DAYS = ['Todos', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

const RING_CIRCUMFERENCE = 201 // 2π × r32

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [teamTasks, setTeamTasks] = useState<any[]>([])
  const [completions, setCompletions] = useState<any[]>([])
  const [newTask, setNewTask] = useState('')
  const [selectedDay, setSelectedDay] = useState(() => DAY_NAMES[new Date().getDay()])
  const [loading, setLoading] = useState(true)
  const [clock, setClock] = useState('')
  const [clockDate, setClockDate] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const todayStr = new Date().toISOString().split('T')[0]

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      fetchData()
    })
  }, [])

  useEffect(() => {
    function tick() {
      const n = new Date()
      const h = String(n.getHours()).padStart(2, '0')
      const m = String(n.getMinutes()).padStart(2, '0')
      const s = String(n.getSeconds()).padStart(2, '0')
      setClock(`${h}:${m}:${s}`)
      setClockDate(`${DAY_NAMES[n.getDay()]}, ${n.getDate()} ${MONTHS[n.getMonth()]}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
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
    inputRef.current?.focus()
    fetchData()
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Remover esta tarefa?')) return
    await supabase.from('team_tasks').delete().eq('id', id)
    fetchData()
  }

  const filteredTasks = teamTasks.filter(t =>
    selectedDay === 'Todos'
      ? true
      : t.day_of_week === selectedDay || t.day_of_week === 'Todos'
  )

  const pendingTasks = filteredTasks.filter(
    t => !completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id)
  )
  const doneTasks = filteredTasks.filter(
    t => completions.some(c => c.team_task_id === t.id && c.user_id === session?.user.id)
  )

  const progressPct = filteredTasks.length === 0
    ? 0
    : Math.round((doneTasks.length / filteredTasks.length) * 100)

  const ringOffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * progressPct) / 100

  function dayCounts(day: string) {
    if (day === 'Todos') return teamTasks.length
    return teamTasks.filter(t => t.day_of_week === day || t.day_of_week === 'Todos').length
  }

  return (
    <main className="min-h-screen bg-gray-100 flex items-start justify-center p-4 md:p-8 font-sans">
      <div className="overflow-hidden bg-white flex min-h-[600px]">

        {/* ── Sidebar ── */}
        <aside className="w-48 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col">

          {/* Clock */}
          <div className="px-4 py-5 border-b border-gray-200">
            <div className="font-mono text-2xl font-medium text-gray-900 tracking-tight leading-none">
              {clock}
            </div>
            <div className="font-mono text-[11px] text-gray-400 mt-1.5">
              {clockDate}
            </div>
          </div>

          {/* Progress ring */}
          <div className="px-4 py-5 border-b border-gray-200 flex flex-col items-center gap-2">
            <span className="text-[11px] text-gray-400">progresso do dia</span>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="32"
                fill="none" stroke="#e5e7eb" strokeWidth="5"
              />
              <circle
                cx="40" cy="40" r="32"
                fill="none"
                stroke={progressPct === 100 ? '#22c55e' : '#111827'}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
              />
            </svg>
            <div className="font-mono text-lg font-medium text-gray-900">{progressPct}%</div>
            <div className="text-[11px] text-gray-400">
              {doneTasks.length} / {filteredTasks.length} tarefas
            </div>
          </div>

          {/* Day navigation */}
          <nav className="flex-1 py-2 overflow-y-auto">
            {DAYS.map(day => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`w-full flex items-center justify-between px-4 py-[7px] text-[13px] border-l-2 transition-all ${
                  selectedDay === day
                    ? 'border-gray-900 text-gray-900 font-medium bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-white'
                }`}
              >
                {day}
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border transition-all ${
                  selectedDay === day
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {dayCounts(day)}
                </span>
              </button>
            ))}
          </nav>

          {/* Back link */}
          <div className="px-4 py-3 border-t border-gray-200">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-[12px] text-gray-400 hover:text-gray-900 transition-colors"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              início
            </Link>
          </div>
        </aside>

        {/* ── Main area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-baseline justify-between gap-4">
            <span className="text-sm font-medium text-gray-900">{selectedDay}</span>
            <span className="text-xs font-mono text-gray-400">
              — {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Add task bar */}
          <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex gap-2">
            <input
              ref={inputRef}
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Descreva a tarefa..."
              className="flex-1 text-[13px] px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-gray-900 outline-none placeholder-gray-400 focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all"
            />
            <button
              onClick={addTask}
              disabled={!newTask.trim() || !session}
              className="text-[13px] px-4 py-1.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              + Adicionar
            </button>
          </div>

          {/* Task list */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <div className="w-4 h-4 border-[1.5px] border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                <span className="text-sm text-gray-400">Carregando...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-center px-6">
                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-sm text-gray-400">
                  Nenhuma tarefa para <strong className="text-gray-600">{selectedDay}</strong>.
                </p>
              </div>
            ) : (
              <>
                {pendingTasks.length > 0 && (
                  <TaskSection
                    label="pendentes"
                    tasks={pendingTasks}
                    completions={completions}
                    session={session}
                    showBadge={selectedDay === 'Todos'}
                    onToggle={toggleCheck}
                    onDelete={deleteTask}
                  />
                )}
                {doneTasks.length > 0 && (
                  <TaskSection
                    label="concluídas"
                    tasks={doneTasks}
                    completions={completions}
                    session={session}
                    showBadge={selectedDay === 'Todos'}
                    onToggle={toggleCheck}
                    onDelete={deleteTask}
                  />
                )}
              </>
            )}
          </div>

        </div>
      </div>
    </main>
  )
}

function TaskSection({
  label,
  tasks,
  completions,
  session,
  showBadge,
  onToggle,
  onDelete,
}: {
  label: string
  tasks: any[]
  completions: any[]
  session: any
  showBadge: boolean
  onToggle: (id: number) => void
  onDelete: (id: number) => void
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-6 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-[11px] font-mono text-gray-400 tracking-wide">
          {label} — {tasks.length}
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {tasks.map((task, i) => (
        <TaskRow
          key={task.id}
          task={task}
          index={i}
          completions={completions}
          session={session}
          showBadge={showBadge}
          onToggle={() => onToggle(task.id)}
          onDelete={() => onDelete(task.id)}
        />
      ))}
    </>
  )
}

function TaskRow({
  task,
  index,
  completions,
  session,
  showBadge,
  onToggle,
  onDelete,
}: {
  task: any
  index: number
  completions: any[]
  session: any
  showBadge: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const whoCompleted = completions.filter(c => c.team_task_id === task.id)
  const iDidIt = whoCompleted.some(c => c.user_id === session?.user.id)

  return (
    <div
      onClick={onToggle}
      className="group flex items-center px-6 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors min-h-[44px]"
    >
      {/* Row number */}
      <span className={`w-7 shrink-0 font-mono text-[11px] select-none ${
        iDidIt ? 'text-gray-200' : 'text-gray-400'
      }`}>
        {String(index + 1).padStart(2, '0')}
      </span>

      {/* Checkbox */}
      <div className={`w-4 h-4 shrink-0 border rounded-sm flex items-center justify-center mr-3 transition-all ${
        iDidIt
          ? 'bg-green-500 border-green-500'
          : 'border-gray-300 group-hover:border-gray-500'
      }`}>
        {iDidIt && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Title */}
      <span className={`flex-1 text-[13px] py-3 leading-snug transition-colors ${
        iDidIt ? 'text-gray-400 line-through' : 'text-gray-800'
      }`}>
        {task.title}
      </span>

      {/* Day badge */}
      {showBadge && (
        <span className="shrink-0 ml-3 text-[10px] font-mono text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-sm">
          {task.day_of_week === 'Todos' ? 'todo dia' : task.day_of_week}
        </span>
      )}

      {/* Who completed */}
      {whoCompleted.length > 0 && (
        <div className="shrink-0 ml-2 flex gap-1">
          {whoCompleted.map(c => (
            <span key={c.id} className="text-[11px] font-mono text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-sm">
              {c.user_email.split('@')[0]}
            </span>
          ))}
        </div>
      )}

      {/* Delete */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="ml-3 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded text-gray-300 hover:text-red-500 transition-all"
        title="Remover"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}