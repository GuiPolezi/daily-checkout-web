'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import TopNav from '@/app/components/TopNav'
import ThemeToggle from '@/app/components/ThemeToggle'

interface Task {
  id: number;
  title: string;
  priority: 'Urgente' | 'Moderado' | 'Normal';
  status: 'A Fazer' | 'Em Andamento' | 'Concluída';
  is_completed: boolean;
  user_id: string;
}

const COLUMNS: Task['status'][] = ['A Fazer', 'Em Andamento', 'Concluída'];

const PRIORITY_CONFIG = {
  Urgente:  { dot: 'var(--ios-red)',    chip: 'chip-danger',  label: 'Urgente'  },
  Moderado: { dot: 'var(--ios-orange)', chip: 'chip-warn',    label: 'Moderado' },
  Normal:   { dot: 'var(--ios-green)',  chip: 'chip-success', label: 'Normal'   },
}

const COLUMN_CONFIG = {
  'A Fazer':      { accent: 'var(--ios-gray)' },
  'Em Andamento': { accent: 'var(--ios-blue)' },
  'Concluída':    { accent: 'var(--ios-green)' },
}

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Normal')
  const [loading, setLoading] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchTasks(session.user.id, selectedDate)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTasks(session.user.id, selectedDate)
      else setTasks([])
    })

    return () => subscription.unsubscribe()
  }, [selectedDate])

  async function fetchTasks(userId: string, date: string) {
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', userId).eq('task_date', date)
      .order('created_at', { ascending: false })
    setTasks(data ? (data as Task[]) : [])
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert('Erro no login: Verifique suas credenciais.')
    setLoading(false)
  }

  const saveTask = async () => {
    if (!newTask || !session) return
    if (editingTaskId) {
      const { error } = await supabase.from('tasks').update({ title: newTask, priority }).eq('id', editingTaskId)
      if (!error) {
        setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, title: newTask, priority } : t))
        setEditingTaskId(null)
        setNewTask('')
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title: newTask, priority, user_id: session.user.id, task_date: selectedDate, status: 'A Fazer' }])
        .select()
      if (!error && data) { setTasks([data[0] as Task, ...tasks]); setNewTask('') }
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return
    const taskId = parseInt(draggableId)
    const newStatus = destination.droppableId as Task['status']
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId)
    if (error) { alert('Erro ao atualizar status'); fetchTasks(session.user.id, selectedDate) }
  }

  const deleteTask = async (id: number) => {
    if (!confirm('Deseja excluir esta atividade?')) return
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) setTasks(tasks.filter(t => t.id !== id))
  }

  const startEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setNewTask(task.title)
    setPriority(task.priority)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const submitCheckout = async () => {
    if (!session) return
    setLoading(true)
    const summary = {
      date: selectedDate,
      tasks: tasks.map(t => ({ title: t.title, prio: t.priority, status: t.status, done: t.status === 'Concluída' }))
    }
    const { error } = await supabase.from('reports').insert([{ user_id: session.user.id, user_email: session.user.email, summary }])
    if (!error) alert('Checkout enviado com sucesso!')
    else alert('Erro ao enviar relatório.')
    setLoading(false)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }

  const isToday = selectedDate === new Date().toISOString().split('T')[0]
  const completedCount = tasks.filter(t => t.status === 'Concluída').length
  const totalCount = tasks.length

  // ==========================================
  // UI: LOGIN
  // ==========================================
  if (!session) {
    return (
      <div className="relative flex min-h-screen items-center justify-center p-4">
        <div className="fixed right-4 top-4 z-50">
          <ThemeToggle className="glass" />
        </div>

        <div className="glass rise w-full max-w-md rounded-4xl p-8 sm:p-10">
          <div className="mb-9 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-linear-to-b from-[#3aa0ff] to-[#007aff] shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_12px_28px_-10px_rgba(0,122,255,0.65)]">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              Bem-vindo de volta
            </h1>
            <p className="mt-2 text-sm text-ink-2">
              Entre para continuar organizando o seu dia.
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1.5 ml-1 block text-[13px] font-medium text-ink-2">
                E-mail
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="4" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
                <input
                  id="login-email"
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="field pl-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="mb-1.5 ml-1 block text-[13px] font-medium text-ink-2">
                Senha
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-3" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="10" width="16" height="11" rx="3" />
                  <path d="M8 10V7a4 4 0 018 0v3" />
                </svg>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="field pl-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full py-3.5 text-[15px]"
              >
                {loading ? 'Aguarde...' : 'Entrar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  // ==========================================
  // UI: DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen pb-16">
      <TopNav />

      <div className="w-full px-4 sm:px-6 lg:px-10">

        {/* ─── HERO / DATA ─── */}
        <section className="rise pt-8 pb-6 sm:pt-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="eyebrow mb-2">
                {isToday ? 'Hoje' : 'Navegando por'}
              </p>
              <h2 className="text-3xl font-semibold capitalize leading-tight tracking-tight text-ink sm:text-[2.75rem] sm:leading-none">
                {formatDate(selectedDate)}
              </h2>
            </div>

            {/* Navegação de data */}
            <div className="glass flex h-12 items-center gap-1 self-start rounded-full px-1.5 sm:self-auto">
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-all hover:bg-fill hover:text-ink active:scale-90"
                aria-label="Dia anterior"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 19l-7-7 7-7"/></svg>
              </button>

              {/* O input nativo fica invisível por cima; o texto visível é 100% centralizado */}
              <div className="relative h-9 w-30 shrink-0 overflow-hidden rounded-full transition-colors hover:bg-fill focus-within:bg-fill">
                <span className="flex h-full w-full select-none items-center justify-center text-[13px] font-medium tabular-nums text-ink">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  aria-label="Selecionar data"
                  className="date-input absolute! inset-0 h-full w-full cursor-pointer opacity-0"
                />
              </div>

              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-all hover:bg-fill hover:text-ink active:scale-90"
                aria-label="Próximo dia"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          {/* Progresso */}
          {totalCount > 0 && (
            <div className="mt-7 flex items-center gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-fill">
                <div
                  className="h-full rounded-full bg-linear-to-r from-accent to-aero transition-all duration-700"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
              <p className="shrink-0 text-[13px] text-ink-2">
                <span className="font-semibold text-ink">{completedCount}</span> de{' '}
                <span className="font-semibold text-ink">{totalCount}</span> concluídas
              </p>
            </div>
          )}
        </section>

        {/* ─── INPUT ─── */}
        <section className="rise mb-8" style={{ animationDelay: '60ms' }}>
          <div className={`glass flex flex-col gap-1 rounded-[1.75rem] p-2.5 transition-all duration-200 sm:flex-row sm:items-center ${
            editingTaskId
              ? 'ring-4 ring-warn/25'
              : 'focus-within:ring-4 focus-within:ring-accent/15'
          }`}>
            <div className="flex min-w-0 flex-1 items-center gap-3 pl-4">
              {editingTaskId ? (
                <span className="chip chip-warn shrink-0">Editando</span>
              ) : (
                <svg className="shrink-0 text-ink-3" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>
              )}
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder={editingTaskId ? 'Editar atividade...' : 'Adicionar atividade...'}
                className="w-full bg-transparent py-3.5 text-sm text-ink outline-none placeholder:text-ink-3"
                onKeyDown={(e) => e.key === 'Enter' && saveTask()}
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-separator-soft px-2 pt-2.5 pb-1 sm:border-t-0 sm:pt-0 sm:pb-0">
              <div className="relative">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Task['priority'])}
                  className="cursor-pointer appearance-none rounded-full bg-fill py-2.5 pl-4 pr-9 text-[13px] font-medium text-ink outline-none transition-colors hover:bg-fill-2"
                >
                  <option value="Normal">Normal</option>
                  <option value="Moderado">Moderado</option>
                  <option value="Urgente">Urgente</option>
                </select>
                <svg className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
              </div>

              {editingTaskId && (
                <button
                  onClick={() => { setEditingTaskId(null); setNewTask('') }}
                  className="btn btn-ghost px-3.5 py-2.5 text-[13px]"
                >
                  Cancelar
                </button>
              )}

              <button
                onClick={saveTask}
                className={`btn py-2.5 text-[13px] ${editingTaskId ? 'btn-warn' : 'btn-primary'}`}
              >
                {editingTaskId ? (
                  <>Salvar</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ─── KANBAN ─── */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3 lg:gap-5">
            {COLUMNS.map(column => {
              const colTasks = tasks.filter(t => t.status === column)
              const cfg = COLUMN_CONFIG[column]
              return (
                <div key={column} className="panel flex flex-col rounded-3xl p-3">
                  {/* Cabeçalho da coluna */}
                  <div className="flex items-center justify-between px-2.5 pb-3 pt-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.accent }} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-2">{column}</h3>
                    </div>
                    <span className="chip chip-neutral tabular-nums">{colTasks.length}</span>
                  </div>

                  <Droppable droppableId={column}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`min-h-32 flex-1 space-y-2.5 rounded-[1.15rem] p-1 transition-colors duration-150 ${
                          snapshot.isDraggingOver ? 'bg-accent/6 ring-2 ring-accent/20' : ''
                        }`}
                      >
                        {colTasks.map((task, index) => {
                          const pCfg = PRIORITY_CONFIG[task.priority]
                          return (
                            <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    borderLeft: `4px solid ${pCfg.dot}`,
                                  }}
                                  className={`card group cursor-grab rounded-2xl p-4 pl-3.5 transition-[box-shadow,border-color] duration-200 active:cursor-grabbing ${
                                    snapshot.isDragging
                                      ? 'rotate-2 scale-[1.03] shadow-2xl shadow-accent/20'
                                      : 'hover:shadow-[0_2px_4px_rgba(16,42,67,0.05),0_14px_28px_-12px_rgba(16,42,67,0.2)]'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                      <p className={`min-w-0 wrap-break-word text-sm font-medium leading-relaxed ${
                                        task.status === 'Concluída' ? 'text-ink-3 line-through' : 'text-ink'
                                      }`}>
                                        {task.title}
                                      </p>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                      <button
                                        onClick={() => startEdit(task)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-fill hover:text-ink"
                                        aria-label="Editar"
                                        title="Editar"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      </button>
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="flex h-7 w-7 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-danger/10 hover:text-danger"
                                        aria-label="Excluir"
                                        title="Excluir"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-separator-soft pt-2.5">
                                    <span className={`chip ${pCfg.chip}`}>{pCfg.label}</span>
                                    {task.status === 'Concluída' && (
                                      <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                                        Concluída
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}

                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex h-24 items-center justify-center rounded-[1.15rem] border border-dashed border-ink-4">
                            <p className="text-xs text-ink-3">Nenhuma tarefa</p>
                          </div>
                        )}

                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>

        {/* ─── CHECKOUT ─── */}
        <section className="glass rise flex flex-col items-start justify-between gap-5 rounded-[1.75rem] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <p className="text-[15px] font-semibold text-ink">Finalizar o dia</p>
            <p className="mt-1 text-[13px] text-ink-2">Envie um relatório com o resumo das atividades de hoje.</p>
          </div>

          <button
            onClick={submitCheckout}
            disabled={loading}
            className="btn btn-primary w-full px-7 py-3.5 sm:w-auto"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                Enviando...
              </>
            ) : (
              <>
                Enviar checkout
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </>
            )}
          </button>
        </section>

      </div>
    </main>
  )
}
