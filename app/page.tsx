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

export default function Home() {
  // --- Estados de Autenticação ---
  const [session, setSession] = useState<any>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // --- Estados das Tarefas ---
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Normal')
  const [loading, setLoading] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)

  // --- Outros Estados ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // --- Efeitos ---
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

  // --- Funções de API e Banco ---
  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }

  async function fetchTasks(userId: string, date: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_date', date)
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

      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        email: session.user.email,
        avatar_url: data.publicUrl 
      })

      alert('Foto atualizada!')
      setAvatarUrl(data.publicUrl)
    } catch (error) {
      alert('Erro no upload')
    }
  }

  const saveTask = async () => {
    if (!newTask || !session) return

    if (editingTaskId) {
      const { error } = await supabase
        .from('tasks')
        .update({ title: newTask, priority: priority })
        .eq('id', editingTaskId)

      if (!error) {
        setTasks(tasks.map(t => t.id === editingTaskId ? { ...t, title: newTask, priority: priority } : t))
        setEditingTaskId(null)
        setNewTask('')
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title: newTask, priority: priority, user_id: session.user.id, task_date: selectedDate, status: 'A Fazer'}])
        .select()

      if (!error && data) {
        setTasks([data[0] as Task, ...tasks])
        setNewTask('')
      }
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return;
    }

    const taskId = parseInt(draggableId);
    const newStatus = destination.droppableId as Task['status'];

    // 1. Atualização Otimista
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));

    // 2. Atualização no Banco
    const { error } = await supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);

    if (error) {
        alert("Erro ao atualizar status");
        fetchTasks(session.user.id, selectedDate); // Reverte em caso de erro
    }
  };

  const deleteTask = async (id: number) => {
    if (!confirm('Deseja excluir esta atividade?')) return
    
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
    }
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

    const { error } = await supabase.from('reports').insert([{
      user_id: session.user.id,
      user_email: session.user.email,
      summary: summary
    }])

    if (!error) {
      alert('Checkout enviado com sucesso!')
    } else {
      alert('Erro ao enviar relatório.')
    }
    setLoading(false)
  }

  // ==========================================
  // UI: LOGIN E CADASTRO
  // ==========================================
  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-900 p-4 font-sans">
        <form onSubmit={handleAuth} className="flex flex-col gap-6 p-8 sm:p-10 bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 w-full max-w-md transition-all">
          <div className="text-center mb-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-indigo-950">
              {isRegistering ? 'Criar Conta' : 'Acesso Equipe'}
            </h1>
            <p className="text-sm text-slate-500 mt-2">
              {isRegistering ? 'Junte-se ao time e organize seu dia.' : 'Bem-vindo de volta! Faça login para continuar.'}
            </p>
          </div>
          
          <div className="space-y-4">
            <input 
              type="email" 
              placeholder="seu@email.com" 
              className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
            <input 
              type="password" 
              placeholder="Sua senha" 
              className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-sm" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-indigo-600 text-white p-3.5 rounded-xl font-semibold hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 shadow-md shadow-indigo-600/20"
          >
            {loading ? 'Aguarde...' : isRegistering ? 'Cadastrar' : 'Entrar na Plataforma'}
          </button>

          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors text-center"
          >
            {isRegistering ? 'Já tem conta? Faça login' : 'Não tem conta? Cadastre-se'}
          </button>
        </form>
      </div>
    )
  }

  // ==========================================
  // UI: DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6 mb-8 bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Meu Dia</h1>
              <a href="/suporte" className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full hover:bg-rose-200 transition-colors">
                📢 ROTINA DA EQUIPE
              </a>
            </div>
            <p className="text-slate-500 text-sm font-medium break-all">{session.user.email}</p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            <label className="cursor-pointer group relative">
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-100 rounded-full overflow-hidden border-2 border-indigo-100 group-hover:border-indigo-500 transition-colors shadow-sm">
                <img 
                      src={avatarUrl || `https://ui-avatars.com/api/?name=${session?.user?.email}&background=eef2ff&color=4f46e5`} 
                      className="object-cover w-full" 
                      alt="Avatar"
                    />
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] sm:text-xs">Trocar</span>
              </div>
              <input type="file" className="hidden" onChange={uploadAvatar} accept="image/*" />
            </label>
            <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
            <button onClick={() => supabase.auth.signOut()} className="text-sm font-semibold text-slate-500 hover:text-rose-600 transition-colors bg-slate-100 sm:bg-transparent px-4 py-2 sm:p-0 rounded-lg">
              Sair
            </button>
          </div>
        </header>

        {/* --- SELETOR DE DATA --- */}
        <section className="mb-8 flex items-center justify-between bg-indigo-50 p-2.5 rounded-2xl border border-indigo-100/50">
          <button 
            onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 sm:p-3 bg-white text-indigo-600 hover:bg-indigo-100 rounded-xl shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          
          <div className="text-center flex flex-col items-center">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent font-extrabold text-base sm:text-xl text-indigo-950 outline-none cursor-pointer text-center"
            />
            <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-indigo-400 font-bold mt-0.5">Navegar por dia</p>
          </div>

          <button 
            onClick={() => {
              const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().split('T')[0]);
            }}
            className="p-2 sm:p-3 bg-white text-indigo-600 hover:bg-indigo-100 rounded-xl shadow-sm transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </section>

        {/* --- INPUT DE TAREFAS --- */}
        <section className={`flex flex-col md:flex-row gap-3 mb-10 p-3 rounded-2xl border shadow-sm transition-all duration-300 ${editingTaskId ? 'bg-amber-50 border-amber-300 ring-4 ring-amber-500/10' : 'bg-white border-slate-200 focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-300'}`}>
          <input 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder={editingTaskId ? "Editando atividade..." : "O que precisa ser feito hoje?"} 
            className="flex-1 p-3 outline-none bg-transparent text-slate-700 placeholder:text-slate-400 font-medium"
            onKeyDown={(e) => e.key === 'Enter' && saveTask()}
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <select 
              value={priority} 
              onChange={(e) => setPriority(e.target.value as Task['priority'])}
              className="p-3 rounded-xl text-sm font-semibold border border-slate-100 bg-slate-50 text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors w-full sm:w-auto"
            >
              <option value="Normal">Normal</option>
              <option value="Moderado">Moderado</option>
              <option value="Urgente">Urgente</option>
            </select>
            <button 
              onClick={saveTask} 
              className={`px-6 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-sm w-full sm:w-auto ${editingTaskId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'}`}
            >
              {editingTaskId ? 'Salvar Edição' : 'Adicionar'}
            </button>
            {editingTaskId && (
              <button 
                onClick={() => {setEditingTaskId(null); setNewTask('');}} 
                className="px-4 py-3 sm:py-0 text-sm font-semibold text-slate-500 hover:text-slate-700 bg-slate-100 sm:bg-transparent rounded-xl transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </section>

        {/* --- KANBAN BOARD (DRAG AND DROP) --- */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 mb-10">
            {COLUMNS.map(column => (
              <div key={column} className="bg-slate-200/40 p-3 sm:p-4 rounded-3xl border border-slate-200/60 flex flex-col">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="font-bold text-slate-600 uppercase text-xs tracking-widest">{column}</h2>
                  <span className="text-xs font-semibold bg-slate-200 text-slate-500 py-0.5 px-2 rounded-full">
                    {tasks.filter(t => t.status === column).length}
                  </span>
                </div>
                
                <Droppable droppableId={column}>
                  {(provided, snapshot) => (
                    <div 
                      {...provided.droppableProps} 
                      ref={provided.innerRef} 
                      className={`space-y-3 flex-1 min-h-50 rounded-2xl transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {tasks
                        .filter(t => t.status === column)
                        .map((task, index) => (
                          <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white p-4 rounded-2xl border transition-all group relative flex flex-col gap-2
                                  ${snapshot.isDragging ? 'shadow-lg border-indigo-300 rotate-2' : 'shadow-sm border-slate-200 hover:shadow-md hover:border-slate-300'}`}
                              >
                                {/* Header do Card: Prioridade + Ações */}
                                <div className="flex justify-between items-start">
                                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wide ${
                                        task.priority === 'Urgente' ? 'bg-rose-100 text-rose-700' : 
                                        task.priority === 'Moderado' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                        {task.priority}
                                    </span>
                                    
                                    {/* Botões de Ação (Aparecem no mobile nativamente ou no hover no desktop) */}
                                    <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => startEdit(task)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Editar">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                      </button>
                                      <button onClick={() => deleteTask(task.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Excluir">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                </div>
                                
                                {/* Título da Tarefa */}
                                <p style={{fontSize: '10px'}} className={`font-medium leading-relaxed break-all ${task.status === 'Concluída' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                  {task.title}
                                </p>
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>

        {/* --- FOOTER DE AÇÕES --- */}
        <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-sm border border-slate-100 mt-auto">
          <button 
            onClick={submitCheckout} 
            disabled={loading}
            className="w-full bg-slate-900 text-white p-4 rounded-2xl font-bold text-sm sm:text-base hover:bg-slate-800 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none flex items-center justify-center gap-2"
          >
            {loading ? 'Enviando relatório...' : (
              <>
                FINALIZAR E ENVIAR CHECKOUT
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </>
            )}
          </button>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-4">
            <a href="/admin" className="flex-1 flex items-center justify-center gap-2 bg-slate-50 text-slate-600 p-3.5 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors border border-slate-200">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Histórico
            </a>
            <a href="/usuarios" className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 p-3.5 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-colors border border-indigo-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              Equipe
            </a>
          </div>
        </div>

      </div>
    </main>
  )
}