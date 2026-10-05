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
  { href: '/perfil', label: 'Perfil' },
]

// A partir de quantos pixels de rolagem a marca e as ações ganham fundo de vidro
const SCROLL_THRESHOLD = 12

export default function TopNav() {
  const pathname = usePathname()
  const [session, setSession] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

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

  // No topo da página a marca e as ações ficam soltas sobre o fundo; ao rolar, o conteúdo
  // passa por baixo delas, então ganham uma cápsula de vidro para continuarem legíveis
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  // Camada de vidro que aparece suavemente ao rolar (fica atrás do conteúdo do grupo)
  const scrollGlass = (
    <span
      aria-hidden="true"
      className={`glass pointer-events-none absolute inset-0 rounded-full transition-opacity duration-300 ${
        scrolled ? 'opacity-100' : 'opacity-0'
      }`}
    />
  )

  return (
    <header className="sticky top-0 z-40 w-full px-4 pt-4 sm:px-6 lg:px-10">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">

        {/* ─── Navegação (esquerda) ─── */}
        <div className="flex items-center justify-self-start">
          <button
            onClick={() => setMenuOpen(v => !v)}
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            className="glass flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-ink-2 transition-[color,transform] duration-200 hover:text-ink active:scale-95 md:hidden"
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

          <nav aria-label="Principal" className="glass hidden items-center gap-1 rounded-full p-1.5 md:flex">
            {LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? 'page' : undefined}
                className="nav-link"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* ─── Marca (centro) ─── */}
        <Link
          href="/"
          aria-label="Daily Checkout — Meu Dia"
          className="relative flex items-center gap-2.5 justify-self-center rounded-full p-1.5 transition-transform duration-200 active:scale-[0.97] sm:pr-4 md:pr-1.5 lg:pr-4"
        >
          {scrollGlass}
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-linear-to-b from-[#3aa0ff] to-[#007aff] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgba(0,122,255,0.6)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <span className="relative hidden text-[15px] font-semibold leading-[1.15] tracking-tight text-ink sm:block md:hidden lg:block">
            Daily<br />Checkout
          </span>
        </Link>

        {/* ─── Tema, foto e sair (direita) ─── */}
        <div className="relative flex shrink-0 items-center gap-1 justify-self-end rounded-full p-1">
          {scrollGlass}
          <ThemeToggle className="relative" />
          {session && (
            <label className="group relative cursor-pointer" title="Trocar foto de perfil">
              <span className="block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/70 transition-all duration-200 group-hover:ring-accent/60 dark:ring-white/15">
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
            <button onClick={signOut} className="btn btn-ghost relative px-3.5 py-2 text-[13px]">
              Sair
            </button>
          )}
        </div>
      </div>

      {/* Menu mobile (dropdown) */}
      {menuOpen && (
        <nav aria-label="Principal" className="glass rise mt-2 flex w-full flex-col gap-1 rounded-3xl p-2 md:hidden">
          {LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={`flex items-center justify-between rounded-full px-5 py-3 text-sm font-medium transition-colors duration-200 ${
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
