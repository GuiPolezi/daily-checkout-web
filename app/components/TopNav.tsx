'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/src/lib/supabaseClient'
import ThemeToggle from './ThemeToggle'

const LINKS = [
  { href: '/', label: 'Meu Dia' },
  { href: '/suporte', label: 'Rotina' },
  { href: '/admin', label: 'Histórico' },
  { href: '/usuarios', label: 'Equipe' },
]

export default function TopNav() {
  const pathname = usePathname()
  const [session, setSession] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchProfile(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fecha o menu ao trocar de página
  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('avatar_url').eq('id', userId).single()
    if (data?.avatar_url) setAvatarUrl(data.avatar_url)
  }

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0]
      if (!file || !session) return
      const fileExt = file.name.split('.').pop()
      const filePath = `${session.user.id}-${Math.random()}.${fileExt}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      await supabase.from('profiles').upsert({ id: session.user.id, email: session.user.email, avatar_url: data.publicUrl })
      setAvatarUrl(data.publicUrl)
      alert('Foto atualizada!')
    } catch {
      alert('Erro no upload')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4 sm:px-6 lg:px-10">
      <div className="glass flex h-14 w-full items-center justify-between gap-2 rounded-full pl-2 pr-2 sm:pl-2.5">

        {/* Hambúrguer (mobile) + marca */}
        <div className="flex min-w-0 items-center gap-1">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-ink md:hidden"
          >
            {menuOpen ? (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>

          <Link href="/" className="flex min-w-0 items-center gap-2.5 rounded-full py-1 pl-1 pr-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-linear-to-b from-[#3aa0ff] to-[#007aff] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgba(0,122,255,0.6)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <span className="hidden truncate text-[15px] font-semibold tracking-tight text-ink sm:block">
              Daily Checkout
            </span>
          </Link>
        </div>

        {/* Navegação desktop */}
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-4 py-2 text-[13px] font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? 'bg-accent/13 text-accent'
                  : 'text-ink-2 hover:bg-fill hover:text-ink'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Tema + perfil + sair */}
        <div className="flex shrink-0 items-center gap-1">
          <ThemeToggle />
          {session && (
            <label className="group relative cursor-pointer" title="Trocar foto de perfil">
              <span className="block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/70 transition-all group-hover:ring-accent/60 dark:ring-white/15">
                <img
                  src={avatarUrl || `https://ui-avatars.com/api/?name=${session?.user?.email}&background=007AFF&color=fff&size=64`}
                  className="h-full w-full object-cover"
                  alt="Avatar"
                />
              </span>
              <input type="file" className="hidden" onChange={uploadAvatar} accept="image/*" />
            </label>
          )}
          {session && (
            <button onClick={signOut} className="btn btn-ghost px-3.5 py-2 text-[13px]">
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Menu mobile (dropdown) */}
      {menuOpen && (
        <nav className="glass rise mt-2 flex w-full flex-col gap-1 rounded-3xl p-2 md:hidden">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center justify-between rounded-full px-5 py-3 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? 'bg-accent text-white shadow-[0_6px_16px_-6px_rgba(0,122,255,0.55)]'
                  : 'text-ink-2 hover:bg-fill hover:text-ink'
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
