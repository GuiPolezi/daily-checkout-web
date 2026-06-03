'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'

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
  Urgente:  { dot: '#E24B4A', label: 'Urgente',  bg: 'bg-red-50',    text: 'text-red-600'    },
  Moderado: { dot: '#EF9F27', label: 'Moderado', bg: 'bg-amber-50',  text: 'text-amber-600'  },
  Normal:   { dot: '#1D9E75', label: 'Normal',   bg: 'bg-emerald-50',text: 'text-emerald-700' },
}

const COLUMN_CONFIG = {
  'A Fazer':      { accent: '#B4B2A9', emoji: '○' },
  'Em Andamento': { accent: '#378ADD', emoji: '◑' },
  'Concluída':    { accent: '#1D9E75', emoji: '●' },
}

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Normal')
  const [loading, setLoading] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchTasks(session.user.id, selectedDate)
        fetchProfile(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTasks(session.user.id, selectedDate)
      else setTasks([])
    })

    return () => subscription.unsubscribe()
  }, [selectedDate])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }

  async function fetchTasks(userId: string, date: string) {
    const { data } = await supabase
      .from('tasks').select('*').eq('user_id', userId).eq('task_date', date)
      .order('created_at', { ascending: false })
    setTasks(data ? (data as Task[]) : [])
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (isRegistering) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) alert('Erro no cadastro: ' + error.message)
      else alert('Conta criada! Agora você pode fazer login.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert('Erro no login: Verifique suas credenciais.')
    }
    setLoading(false)
  }

  const uploadAvatar = async (event: any) => {
    try {
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}-${Math.random()}.${fileExt}`
      let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').upsert({ id: session.user.id, email: session.user.email, avatar_url: data.publicUrl })
      alert('Foto atualizada!')
      setAvatarUrl(data.publicUrl)
    } catch { alert('Erro no upload') }
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
      <div className="min-h-screen bg-[#F9F8F6] flex items-center justify-center p-4 font-sans">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
          .font-serif-display { font-family: 'Instrument Serif', serif; }
          .font-body { font-family: 'DM Sans', sans-serif; }
          .auth-input { font-family: 'DM Sans', sans-serif; }
          .auth-input:focus { outline: none; border-color: #2C2C2A; box-shadow: 0 0 0 3px rgba(44,44,42,0.06); }
        `}</style>

        <div className="w-full max-w-sm font-body">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-[#2C2C2A] mb-6">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L11.5 7H16.5L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L1.5 7H6.5L9 2Z" fill="white"/>
              </svg>
            </div>
            <h1 className="font-serif-display text-3xl text-[#2C2C2A] leading-tight mb-2">
              {isRegistering ? 'Criar conta' : 'Bem-vindo de volta'}
            </h1>
            <p className="text-sm text-[#888780]">
              {isRegistering ? 'Junte-se ao time e organize seu dia.' : 'Entre para continuar organizando seu dia.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              placeholder="seu@email.com"
              className="auth-input w-full bg-white border border-[#D3D1C7] rounded-xl px-4 py-3 text-sm text-[#2C2C2A] placeholder-[#B4B2A9] transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Sua senha"
              className="auth-input w-full bg-white border border-[#D3D1C7] rounded-xl px-4 py-3 text-sm text-[#2C2C2A] placeholder-[#B4B2A9] transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2C2C2A] text-white rounded-xl py-3 text-sm font-medium hover:bg-[#444441] active:scale-[0.99] transition-all disabled:opacity-40 mt-2"
            >
              {loading ? 'Aguarde...' : isRegistering ? 'Criar conta' : 'Entrar'}
            </button>
          </form>

          <button
            onClick={() => setIsRegistering(!isRegistering)}
            className="w-full mt-4 text-sm text-[#888780] hover:text-[#2C2C2A] transition-colors text-center"
          >
            {isRegistering ? 'Já tem conta? Fazer login →' : 'Não tem conta? Cadastrar →'}
          </button>
        </div>
      </div>
    )
  }

  // ==========================================
  // UI: DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen bg-[#F9F8F6] font-sans pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');
        * { font-family: 'DM Sans', sans-serif; }
        .font-serif-display { font-family: 'Instrument Serif', serif; }
        .task-input:focus { outline: none; }
        .task-card { transition: box-shadow 0.15s, transform 0.15s; }
        .task-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-1px); }
        .action-btn { opacity: 0; transition: opacity 0.15s; }
        .task-card:hover .action-btn { opacity: 1; }
        @media (max-width: 640px) { .action-btn { opacity: 1; } }
        .nav-link { transition: color 0.15s, background 0.15s; }
        .date-nav::-webkit-calendar-picker-indicator { opacity: 0; position: absolute; width: 100%; height: 100%; cursor: pointer; }
        .date-nav { position: relative; }
        ::-webkit-scrollbar { width: 4px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #D3D1C7; border-radius: 2px; }
      `}</style>

      <div className="px-4 sm:px-6 lg:px-8">

        {/* ─── TOPBAR ─── */}
        <header className="flex items-center justify-between py-5 border-b border-[#E8E6DF]">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#2C2C2A] flex items-center justify-center flex-shrink-0">
              <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                <path d="M9 2L11.5 7H16.5L12.5 10.5L14 15.5L9 12.5L4 15.5L5.5 10.5L1.5 7H6.5L9 2Z" fill="white"/>
              </svg>
            </div>
            <span className="text-sm font-medium text-[#2C2C2A]">Meu Dia</span>
            <a href="/suporte" className="hidden sm:inline-flex items-center gap-1 text-[10px] font-medium text-[#888780] border border-[#D3D1C7] rounded-full px-2.5 py-0.5 hover:border-[#888780] transition-colors">
              Rotina da equipe
            </a>
          </div>

          <div className="flex items-center gap-3">
            <a href="/admin" className="nav-link text-xs text-[#888780] hover:text-[#2C2C2A] px-2 py-1 rounded-lg hover:bg-[#F1EFE8]">Histórico</a>
            <a href="/usuarios" className="nav-link text-xs text-[#888780] hover:text-[#2C2C2A] px-2 py-1 rounded-lg hover:bg-[#F1EFE8]">Equipe</a>

            <div className="w-px h-4 bg-[#D3D1C7]" />

            <label className="cursor-pointer group relative">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-[#D3D1C7] group-hover:border-[#888780] transition-colors">
                <img
                  src={avatarUrl || `https://ui-avatars.com/api/?name=${session?.user?.email}&background=2C2C2A&color=F9F8F6&size=64`}
                  className="object-cover w-full h-full"
                  alt="Avatar"
                />
              </div>
              <input type="file" className="hidden" onChange={uploadAvatar} accept="image/*" />
            </label>

            <button
              onClick={() => supabase.auth.signOut()}
              className="nav-link text-xs text-[#888780] hover:text-red-500 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              Sair
            </button>
          </div>
        </header>

        {/* ─── HERO / DATE ─── */}
        <section className="pt-10 pb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-[#888780] uppercase tracking-widest mb-2">
                {isToday ? 'Hoje' : 'Navegando por'}
              </p>
              <h2 className="font-serif-display text-4xl sm:text-5xl text-[#2C2C2A] leading-none capitalize">
                {formatDate(selectedDate)}
              </h2>
              {totalCount > 0 && (
                <p className="mt-3 text-sm text-[#888780]">
                  <span className="text-[#2C2C2A] font-medium">{completedCount}</span> de{' '}
                  <span className="text-[#2C2C2A] font-medium">{totalCount}</span> tarefas concluídas
                </p>
              )}
            </div>

            {/* Navegação de data */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#D3D1C7] text-[#888780] hover:border-[#888780] hover:text-[#2C2C2A] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
              </button>

              <div className="date-nav">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-[#D3D1C7] rounded-lg px-3 py-1.5 text-xs font-medium text-[#2C2C2A] cursor-pointer hover:border-[#888780] transition-colors"
                />
              </div>

              <button
                onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]) }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#D3D1C7] text-[#888780] hover:border-[#888780] hover:text-[#2C2C2A] transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-6 h-0.5 bg-[#E8E6DF] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#1D9E75] transition-all duration-700 rounded-full"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
          )}
        </section>

        {/* ─── INPUT ─── */}
        <section className="mb-10">
          <div className={`flex flex-col sm:flex-row gap-0 bg-white border rounded-2xl overflow-hidden transition-all duration-200
            ${editingTaskId
              ? 'border-[#EF9F27] ring-4 ring-[#EF9F27]/10'
              : 'border-[#D3D1C7] focus-within:border-[#2C2C2A] focus-within:ring-4 focus-within:ring-[#2C2C2A]/5'
            }`}
          >
            {editingTaskId && (
              <div className="flex items-center gap-2 px-4 pt-3 pb-0 sm:pt-0 sm:pb-0 sm:pl-4 sm:flex-col sm:justify-center">
                <span className="text-[10px] font-medium text-[#EF9F27] uppercase tracking-widest whitespace-nowrap">Editando</span>
              </div>
            )}

            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder={editingTaskId ? 'Editar atividade...' : 'Adicionar atividade...'}
              className="task-input flex-1 px-5 py-4 text-sm text-[#2C2C2A] placeholder-[#B4B2A9] bg-transparent"
              onKeyDown={(e) => e.key === 'Enter' && saveTask()}
            />

            <div className="flex items-center gap-2 px-4 py-3 sm:py-0 border-t sm:border-t-0 sm:border-l border-[#E8E6DF]">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="text-xs font-medium text-[#888780] bg-transparent border-none outline-none cursor-pointer hover:text-[#2C2C2A] transition-colors pr-1"
              >
                <option value="Normal">Normal</option>
                <option value="Moderado">Moderado</option>
                <option value="Urgente">Urgente</option>
              </select>

              {editingTaskId && (
                <button
                  onClick={() => { setEditingTaskId(null); setNewTask('') }}
                  className="text-xs text-[#B4B2A9] hover:text-[#888780] transition-colors px-2"
                >
                  Cancelar
                </button>
              )}

              <button
                onClick={saveTask}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium transition-all active:scale-95
                  ${editingTaskId
                    ? 'bg-[#EF9F27] text-white hover:bg-[#BA7517]'
                    : 'bg-[#2C2C2A] text-white hover:bg-[#444441]'
                  }`}
              >
                {editingTaskId ? (
                  <>Salvar</>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* ─── KANBAN ─── */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            {COLUMNS.map(column => {
              const colTasks = tasks.filter(t => t.status === column)
              const cfg = COLUMN_CONFIG[column]
              return (
                <div key={column} className="flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base leading-none" style={{ color: cfg.accent }}>{cfg.emoji}</span>
                      <h3 className="text-xs font-medium text-[#888780] uppercase tracking-wider">{column}</h3>
                    </div>
                    <span className="text-xs text-[#B4B2A9] font-medium tabular-nums">{colTasks.length}</span>
                  </div>

                  <Droppable droppableId={column}>
                    {(provided, snapshot) => (
                      <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className={`flex-1 min-h-32 space-y-2 rounded-2xl p-2 transition-colors duration-150
                          ${snapshot.isDraggingOver ? 'bg-[#F1EFE8]' : 'bg-transparent'}`}
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
                                  className={`task-card group bg-white rounded-xl border p-3.5 cursor-grab active:cursor-grabbing
                                    ${snapshot.isDragging
                                      ? 'shadow-xl border-[#2C2C2A] rotate-1 scale-105'
                                      : 'border-[#E8E6DF] shadow-sm'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                      <div
                                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5"
                                        style={{ backgroundColor: pCfg.dot }}
                                      />
                                      <p className={`text-xs leading-relaxed break-words min-w-0 font-medium
                                        ${task.status === 'Concluída' ? 'text-[#B4B2A9] line-through' : 'text-[#2C2C2A]'}`}>
                                        {task.title}
                                      </p>
                                    </div>

                                    <div className="action-btn flex items-center gap-0.5 flex-shrink-0">
                                      <button
                                        onClick={() => startEdit(task)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[#B4B2A9] hover:text-[#2C2C2A] hover:bg-[#F1EFE8] transition-colors"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                                      </button>
                                      <button
                                        onClick={() => deleteTask(task.id)}
                                        className="w-6 h-6 flex items-center justify-center rounded-lg text-[#B4B2A9] hover:text-red-500 hover:bg-red-50 transition-colors"
                                      >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="mt-2.5 pt-2 border-t border-[#F1EFE8] flex items-center justify-between">
                                    <span className={`text-[10px] font-medium ${pCfg.text}`}>
                                      {pCfg.label}
                                    </span>
                                    {task.status === 'Concluída' && (
                                      <span className="text-[10px] text-[#1D9E75]">✓ Concluída</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}

                        {colTasks.length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex items-center justify-center h-24 rounded-xl border border-dashed border-[#D3D1C7]">
                            <p className="text-xs text-[#B4B2A9]">Nenhuma tarefa</p>
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
        <div className="border-t border-[#E8E6DF] pt-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#2C2C2A]">Finalizar o dia</p>
              <p className="text-xs text-[#888780] mt-0.5">Envie um relatório com o resumo das atividades de hoje.</p>
            </div>

            <button
              onClick={submitCheckout}
              disabled={loading}
              className="flex items-center gap-2 bg-[#2C2C2A] text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-[#444441] active:scale-[0.98] transition-all disabled:opacity-40 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
                  Enviando...
                </>
              ) : (
                <>
                  Enviar checkout
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </main>
  )
}