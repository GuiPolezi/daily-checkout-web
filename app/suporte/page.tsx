'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import TopNav from '@/app/components/TopNav'

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
  const [dayMenuOpen, setDayMenuOpen] = useState(false)
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

  const filteredTasks = teamTasks.filter(t => t.day_of_week === selectedDay)

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
    return teamTasks.filter(t => t.day_of_week === day).length
  }

  const selectDay = (day: string) => {
    setSelectedDay(day)
    setDayMenuOpen(false)
  }

  const dayButton = (day: string) => (
    <button
      key={day}
      onClick={() => selectDay(day)}
      className={`flex w-full items-center justify-between gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium transition-all duration-200 ${
        selectedDay === day
          ? 'bg-accent text-white shadow-[0_6px_16px_-6px_rgba(0,122,255,0.5)]'
          : 'text-ink-2 hover:bg-fill hover:text-ink'
      }`}
    >
      {day}
      <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
        selectedDay === day ? 'bg-white/25 text-white' : 'bg-fill text-ink-3'
      }`}>
        {dayCounts(day)}
      </span>
    </button>
  )

  return (
    <main className="min-h-screen pb-16">
      <TopNav />

      <div className="w-full px-4 sm:px-6 lg:px-10">

        {/* ─── HERO ─── */}
        <section className="rise pt-8 pb-6 sm:pt-10">
          <p className="eyebrow mb-2">Equipe</p>
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
            <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Rotina da Equipe
            </h1>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums leading-none tracking-tight text-ink">
                {clock}
              </div>
              <div className="mt-1.5 text-[12px] text-ink-2">{clockDate}</div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_minmax(0,1fr)] lg:items-start lg:gap-5">

          {/* ─── SIDEBAR ─── */}
          <aside className="flex min-w-0 flex-col gap-4">

            {/* Progresso do dia */}
            <div className="glass rise flex items-center gap-5 rounded-[1.75rem] p-5 sm:p-6 lg:flex-col lg:gap-4 lg:py-7" style={{ animationDelay: '60ms' }}>
              <div className="relative h-24 w-24 shrink-0">
                <svg width="96" height="96" viewBox="0 0 80 80" className="h-full w-full">
                  <defs>
                    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0A84FF" />
                      <stop offset="100%" stopColor="#32ADE6" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none" strokeWidth="6"
                    style={{ stroke: 'var(--fill-2)' }}
                  />
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={ringOffset}
                    transform="rotate(-90 40 40)"
                    style={{
                      stroke: progressPct === 100 ? 'var(--ios-green)' : 'url(#ringGrad)',
                      transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-semibold tabular-nums text-ink">{progressPct}%</span>
                </div>
              </div>
              <div className="min-w-0 lg:text-center">
                <p className="text-sm font-semibold text-ink">Progresso do dia</p>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                  {doneTasks.length} de {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''} concluída{doneTasks.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Seletor de dia — mobile (menu expansível) */}
            <div className="rise lg:hidden" style={{ animationDelay: '80ms' }}>
              <button
                onClick={() => setDayMenuOpen(v => !v)}
                aria-expanded={dayMenuOpen}
                className="glass flex w-full items-center justify-between rounded-[1.35rem] px-5 py-4 text-sm font-semibold text-ink transition-transform active:scale-[0.99]"
              >
                <span className="flex items-center gap-3">
                  <svg className="text-ink-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                  {selectedDay === 'Todos' ? 'Todos os dias' : selectedDay}
                </span>
                <span className="flex items-center gap-2.5">
                  <span className="chip chip-accent tabular-nums">{filteredTasks.length}</span>
                  <svg
                    className={`text-ink-3 transition-transform duration-200 ${dayMenuOpen ? 'rotate-180' : ''}`}
                    width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {dayMenuOpen && (
                <div className="glass rise mt-2 grid grid-cols-2 gap-1 rounded-[1.35rem] p-2">
                  {DAYS.map(day => dayButton(day))}
                </div>
              )}
            </div>

            {/* Dias — desktop */}
            <nav className="glass hidden flex-col gap-0.5 rounded-[1.75rem] p-2.5 lg:flex">
              {DAYS.map(day => dayButton(day))}
            </nav>
          </aside>

          {/* ─── LISTA DE TAREFAS ─── */}
          <section className="glass rise flex min-w-0 flex-col overflow-hidden rounded-[1.75rem]" style={{ animationDelay: '100ms' }}>

            {/* Cabeçalho */}
            <div className="flex items-baseline justify-between gap-3 px-5 pt-5 pb-2 sm:px-6">
              <h2 className="text-[15px] font-semibold text-ink">
                {selectedDay === 'Todos' ? 'Todas as tarefas' : selectedDay}
              </h2>
              <span className="text-[12px] tabular-nums text-ink-3">
                {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Adicionar tarefa */}
            <div className="flex flex-col gap-2.5 px-4 pt-2 pb-4 sm:flex-row sm:px-5">
              <input
                ref={inputRef}
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Descreva a tarefa..."
                className="field flex-1 rounded-full"
              />
              <button
                onClick={addTask}
                disabled={!newTask.trim() || !session}
                className="btn btn-primary text-[13px]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                Adicionar
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center gap-3 py-16">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-fill-2 border-t-accent" />
                  <span className="text-sm text-ink-2">Carregando...</span>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3.5 px-6 py-20 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fill">
                    <svg className="text-ink-3" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  </div>
                  <p className="text-sm text-ink-2">
                    Nenhuma tarefa para <strong className="font-semibold text-ink">{selectedDay}</strong>.
                  </p>
                </div>
              ) : (
                <>
                  {pendingTasks.length > 0 && (
                    <TaskSection
                      label="Pendentes"
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
                      label="Concluídas"
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
          </section>
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
      <div className="flex items-center gap-3 bg-fill px-5 py-3 sm:px-6">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-2">
          {label} — {tasks.length}
        </span>
      </div>

      {tasks.map(task => (
        <TaskRow
          key={task.id}
          task={task}
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
  completions,
  session,
  showBadge,
  onToggle,
  onDelete,
}: {
  task: any
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
      className="group flex min-h-14 cursor-pointer items-center gap-3.5 border-b border-separator-soft px-4 py-3 transition-colors last:border-b-0 hover:bg-fill-soft sm:px-6"
    >
      {/* Checkbox circular (iOS) */}
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200 ${
        iDidIt
          ? 'border-transparent bg-success shadow-[0_4px_10px_-3px_rgba(52,199,89,0.6)]'
          : 'border-ink-4 group-hover:border-success'
      }`}>
        {iDidIt && (
          <svg className="text-white" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Título */}
      <span className={`min-w-0 flex-1 text-sm leading-snug transition-colors ${
        iDidIt ? 'text-ink-3 line-through' : 'text-ink'
      }`}>
        {task.title}
      </span>

      {/* Dia da semana */}
      {showBadge && (
        <span className="chip chip-neutral hidden sm:inline-flex">
          {task.day_of_week === 'Todos' ? 'Todo dia' : task.day_of_week}
        </span>
      )}

      {/* Quem concluiu */}
      {whoCompleted.length > 0 && (
        <div className="flex max-w-[45%] flex-wrap justify-end gap-1.5">
          {whoCompleted.map(c => (
            <span key={c.id} className="chip chip-success max-w-full">
              <span className="max-w-24 truncate">{c.user_email.split('@')[0]}</span>
            </span>
          ))}
        </div>
      )}

      {/* Remover */}
      <button
        onClick={e => { e.stopPropagation(); onDelete() }}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-3 opacity-100 transition-all hover:bg-danger/10 hover:text-danger sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
        title="Remover"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
