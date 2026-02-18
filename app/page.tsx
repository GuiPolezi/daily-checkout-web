'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/src/lib/supabaseClient'

interface Task {
  id: number;
  title: string;
  priority: 'Urgente' | 'Moderado' | 'Normal';
  is_completed: boolean;
  user_id: string;
}

export default function Home() {
  // Estados de Autenticação
  const [session, setSession] = useState<any>(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Estados das Tarefas
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTask, setNewTask] = useState('')
  const [priority, setPriority] = useState<Task['priority']>('Normal')
  const [loading, setLoading] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)

// --- NOVO: Estado para controlar a data selecionada (Formato YYYY-MM-DD) ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

// Usuario
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Função para alterar avatar usuario
  const uploadAvatar = async (event: any) => {
    try {
      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}-${Math.random()}.${fileExt}`

      // 1. Sobe para o Storage
      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 2. Pega a URL pública
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      
      // 3. Salva a URL na tabela profiles
      await supabase.from('profiles').upsert({ 
        id: session.user.id, 
        email: session.user.email,
        avatar_url: data.publicUrl 
      })

      alert('Foto atualizada!')
      setAvatarUrl(data.publicUrl) // Isso muda a foto na hora sem recarregar a página!
    } catch (error) {
      alert('Erro no upload')
    }
  }

  // Monitoramento da Sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchTasks(session.user.id, selectedDate) // Busca tarefas já filtrando pela data selecionada
        fetchProfile(session.user.id) // <--- Nova função
      } 
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTasks(session.user.id, selectedDate) // Refetch com a data selecionada
      else setTasks([]) // Limpa tarefas ao sair
    })

    return () => subscription.unsubscribe()
  }, [selectedDate]) // Adiciona selectedDate como dependência para refetch quando a data mudar

  // Função para buscar o perfil
  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single()
    
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }

  // Buscar Tarefas
  // Atualizado para filtrar por data
  async function fetchTasks(userId: string, date: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('task_date', date) // Filtro crucial
      .order('created_at', { ascending: false })
    
    setTasks(data ? (data as Task[]) : [])
  }

  // Lógica de Login / Cadastro (E-mail e Senha)
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


  // Edição de Tarefas
// --- NOVA FUNÇÃO: ADICIONAR OU SALVAR EDIÇÃO ---
  const saveTask = async () => {
    if (!newTask || !session) return

    if (editingTaskId) {
      // MODO EDIÇÃO
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
      // MODO ADIÇÃO
      const { data, error } = await supabase
        .from('tasks')
        .insert([{ title: newTask, priority: priority, user_id: session.user.id, task_date: selectedDate }])
        .select()

      if (!error && data) {
        setTasks([data[0] as Task, ...tasks])
        setNewTask('')
      }
    }
  }

  // --- NOVA FUNÇÃO: REMOVER ---
  const deleteTask = async (id: number) => {
    if (!confirm('Deseja excluir esta atividade?')) return
    
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (!error) {
      setTasks(tasks.filter(t => t.id !== id))
    }
  }

  // Preparar para editar
  const startEdit = (task: Task) => {
    setEditingTaskId(task.id)
    setNewTask(task.title)
    setPriority(task.priority)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTask = async (id: number, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t))
    await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id)
  }

  const submitCheckout = async () => {
    if (!session) return
    setLoading(true)

    const summary = {
      date: selectedDate, // Relatório vinculado à data do calendário
      tasks: tasks.map(t => ({ title: t.title, done: t.is_completed, prio: t.priority }))
    }

    // Salvando no Banco de dados
    const { error } = await supabase.from('reports').insert([{
      user_id: session.user.id,
      user_email: session.user.email, // Adicionando o email aqui!
      summary: summary
    }])

    if (!error) {
      alert('Checkout enviado com sucesso!')
    } else {
      alert('Erro ao enviar relatório.')
    }

    // Lógica para enviar o e-mail via API Route
    try {
      const response = await fetch('./api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: session.user.email,
          date: selectedDate,
          tasks: summary.tasks
        })
      })

      if (response.ok) {
        alert('E-mail enviado com sucesso!')
      } else {
        alert('Erro ao enviar e-mail.')
      }
    } catch (err) {
      alert('Erro na comunicação com o servidor.')
    }

    setLoading(false)
  }

  // --- UI: LOGIN E CADASTRO ---
  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 text-black p-4">
        <form onSubmit={handleAuth} className="flex flex-col gap-4 p-8 border bg-white rounded-xl shadow-lg w-full max-w-md">
          <h1 className="text-2xl font-bold text-center">
            {isRegistering ? 'Criar Conta' : 'Acesso Equipe'}
          </h1>
          
          <input 
            type="email" 
            placeholder="seu@email.com" 
            className="border p-3 rounded-lg outline-none focus:ring-2 ring-blue-500" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          <input 
            type="password" 
            placeholder="Sua senha" 
            className="border p-3 rounded-lg outline-none focus:ring-2 ring-blue-500" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />

          <button 
            type="submit" 
            disabled={loading}
            className="bg-blue-600 text-white p-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Aguarde...' : isRegistering ? 'Cadastrar' : 'Entrar'}
          </button>

          <button 
            type="button"
            onClick={() => setIsRegistering(!isRegistering)}
            className="text-sm text-blue-600 hover:underline mt-2 text-center"
          >
            {isRegistering ? 'Já tem conta? Entre aqui' : 'Não tem conta? Cadastre-se'}
          </button>
        </form>
      </div>
    )
  }

  // --- UI: DASHBOARD ---
  return (
    <main className="max-w-2xl mx-auto p-6 min-h-screen text-black">
      <header className="flex justify-between items-center mb-10">
        <div>
          <div className="box flex items-center gap-4">
            <h1 className="text-3xl font-extrabold">Meu Dia</h1>
            <a href="/suporte" className="text-red-500 hover:underline">📢 ROTINA DA EQUIPE</a>
          </div>
          <p className="text-gray-500 text-sm">{session.user.email}</p>
          <div className="flex items-center gap-4 mb-4">
            <label className="cursor-pointer">
              <div className="w-12 h-12 bg-gray-200 rounded-full overflow-hidden border-2 border-blue-500">
                <img 
                    src={avatarUrl || `https://ui-avatars.com/api/?name=${session?.user?.email}`} 
                    className="w-full h-full object-cover" 
                  />
              </div>
              <input type="file" className="hidden" onChange={uploadAvatar} accept="image/*" />
            </label>
            <p className="text-xs text-blue-600 font-bold">Clique na foto para trocar</p>
          </div>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-red-500 hover:underline">Sair</button>
      </header>

      {/* --- NOVO: SELETOR DE DATA (CALENDÁRIO) --- */}
      <section className="mb-8 bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
        <button 
          onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() - 1);
            setSelectedDate(d.toISOString().split('T')[0]);
          }}
          className="p-2 hover:bg-blue-100 rounded-full"
        >
          ⬅️
        </button>
        
        <div className="text-center">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent font-bold text-lg text-blue-800 outline-none cursor-pointer"
          />
          <p className="text-[10px] uppercase tracking-widest text-blue-400 font-bold">Navegar por dia</p>
        </div>

        <button 
          onClick={() => {
            const d = new Date(selectedDate); d.setDate(d.getDate() + 1);
            setSelectedDate(d.toISOString().split('T')[0]);
          }}
          className="p-2 hover:bg-blue-100 rounded-full"
        >
          ➡️
        </button>
      </section>

      {/* Input de Atividades (Serve para Criar e Editar) */}
      <section className={`flex gap-2 mb-8 p-2 rounded-xl border transition-colors ${editingTaskId ? 'bg-amber-50 border-amber-300' : 'bg-white shadow-sm'}`}>
        <input 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder={editingTaskId ? "Editando atividade..." : "O que precisa ser feito?"} 
          className="flex-1 p-2 outline-none bg-transparent"
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
          className="p-2 rounded-lg text-sm font-medium border-none bg-transparent"
        >
          <option value="Normal">Normal</option>
          <option value="Moderado">Moderado</option>
          <option value="Urgente">Urgente</option>
        </select>
        <button 
          onClick={saveTask} 
          className={`${editingTaskId ? 'bg-amber-500' : 'bg-black'} text-white px-6 py-2 rounded-lg font-bold`}
        >
          {editingTaskId ? 'Salvar' : '+'}
        </button>
        {editingTaskId && (
          <button onClick={() => {setEditingTaskId(null); setNewTask('');}} className="text-xs text-gray-500">Cancelar</button>
        )}
      </section>

      {/* Lista de Tarefas */}
      <div className="space-y-3 mb-10">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-4 p-4 bg-white border rounded-xl group hover:shadow-md transition">
            <input 
              type="checkbox" 
              checked={task.is_completed} 
              onChange={() => toggleTask(task.id, task.is_completed)}
              className="w-6 h-6 cursor-pointer"
            />
            <div className="flex-1 flex items-center justify-between">
              <span className={`font-medium ${task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {task.title}
              </span>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] uppercase px-2 py-1 rounded-md font-bold text-white
                  ${task.priority === 'Urgente' ? 'bg-red-500' : task.priority === 'Moderado' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                  {task.priority}
                </span>
                
                {/* BOTÕES DE EDITAR E EXCLUIR */}
                <button onClick={() => startEdit(task)} className="opacity-0 group-hover:opacity-100 p-1 text-blue-600 hover:bg-blue-50 rounded transition">
                  ✏️
                </button>
                <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-600 hover:bg-red-50 rounded transition">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={submitCheckout} 
        disabled={loading}
        className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
      >
        {loading ? 'ENVIANDO...' : 'FINALIZAR E ENVIAR CHECKOUT'}
      </button>

      <div className="flex justify-center mt-4">
        <a href="/admin" className="text-sm text-blue-600 hover:underline">Ver todos os checkouts</a>
      </div>

          <a href="/usuarios" className="flex-1 bg-blue-50 text-blue-600 p-3 rounded-xl text-center text-sm font-black border border-blue-100">
      👥 EQUIPE
    </a>
    </main>
  )
}