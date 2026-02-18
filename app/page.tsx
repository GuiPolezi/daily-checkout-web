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

  // Monitoramento da Sessão
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchTasks(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) fetchTasks(session.user.id)
      else setTasks([]) // Limpa tarefas ao sair
    })

    return () => subscription.unsubscribe()
  }, [])

  // Buscar Tarefas
  async function fetchTasks(userId: string) {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (data) setTasks(data as Task[])
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

  // Gerenciamento de Tarefas
  const addTask = async () => {
    if (!newTask || !session) return
    const { data, error } = await supabase
      .from('tasks')
      .insert([{ 
        title: newTask, 
        priority: priority, 
        user_id: session.user.id 
      }])
      .select()

    if (!error && data) {
      setTasks([data[0] as Task, ...tasks])
      setNewTask('')
    }
  }

  const toggleTask = async (id: number, currentStatus: boolean) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, is_completed: !currentStatus } : t))
    await supabase.from('tasks').update({ is_completed: !currentStatus }).eq('id', id)
  }

  const submitCheckout = async () => {
    if (!session) return
    setLoading(true)
    const summary = {
      date: new Date().toLocaleString('pt-BR'),
      tasks: tasks.map(t => ({ title: t.title, done: t.is_completed, prio: t.priority }))
    }

    const { error } = await supabase.from('reports').insert([{
      user_id: session.user.id,
      summary: summary
    }])

    if (!error) {
      alert('Checkout enviado com sucesso!')
    } else {
      alert('Erro ao enviar relatório.')
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
          <h1 className="text-3xl font-extrabold">Meu Dia</h1>
          <p className="text-gray-500 text-sm">{session.user.email}</p>
        </div>
        <button onClick={() => supabase.auth.signOut()} className="text-sm font-medium text-red-500 hover:underline">Sair</button>
      </header>

      <section className="flex gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm border">
        <input 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="O que precisa ser feito?" 
          className="flex-1 p-2 outline-none"
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as Task['priority'])}
          className="bg-gray-50 p-2 rounded-lg text-sm font-medium border-none"
        >
          <option value="Normal">Normal</option>
          <option value="Moderado">Moderado</option>
          <option value="Urgente">Urgente</option>
        </select>
        <button onClick={addTask} className="bg-black text-white px-6 py-2 rounded-lg font-bold hover:bg-gray-800">+</button>
      </section>

      <div className="space-y-3 mb-10">
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-4 p-4 bg-white border rounded-xl hover:shadow-md transition">
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
              <span className={`text-[10px] uppercase px-2 py-1 rounded-md font-bold text-white
                ${task.priority === 'Urgente' ? 'bg-red-500' : task.priority === 'Moderado' ? 'bg-amber-500' : 'bg-blue-500'}`}>
                {task.priority}
              </span>
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
    </main>
  )
}