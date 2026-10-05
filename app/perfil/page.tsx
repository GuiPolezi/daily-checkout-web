'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/src/lib/supabaseClient'
import TopNav from '@/app/components/TopNav'
import ProfileCard from '@/app/components/gamification/ProfileCard'
import { useGamification } from '@/app/components/gamification/useGamification'
import { todayLocal } from '@/src/lib/gamification/day'
import { totalXpForLevel, xpForLevel } from '@/src/lib/gamification/levels'

interface XpEventRow {
  id: number
  type: string
  amount: number
  day: string | null
  created_at: string
  metadata: { title?: string; streakDays?: number; tasks?: number } | null
}

const HISTORY_LIMIT = 60
const NEXT_LEVELS_SHOWN = 5

const EVENT_LABEL: Record<string, string> = {
  TASK_COMPLETED: 'Tarefa concluída',
  TASK_REVERTED: 'Conclusão de tarefa desfeita',
  ROUTINE_COMPLETED: 'Rotina concluída',
  ROUTINE_REVERTED: 'Rotina desmarcada',
  DAILY_CHECKOUT: 'Checkout diário enviado',
  PERFECT_DAY: 'Dia perfeito na rotina',
  STREAK_BONUS: 'Marco de sequência',
  BONUS_REVERTED: 'Bônus estornado',
  BACKFILL: 'Tarefas concluídas antes da gamificação',
  ACHIEVEMENT: 'Conquista',
}

function eventDetail(event: XpEventRow): string | null {
  if (event.metadata?.title) return event.metadata.title
  if (event.type === 'STREAK_BONUS' && event.metadata?.streakDays) return `${event.metadata.streakDays} dias seguidos`
  if (event.type === 'BACKFILL' && event.metadata?.tasks) return `${event.metadata.tasks} tarefas`
  return null
}

const formatDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('pt-BR')

export default function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null)
  const [checked, setChecked] = useState(false)
  const [events, setEvents] = useState<XpEventRow[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const game = useGamification()
  const syncXp = game.sync
  const userId = session?.user?.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setChecked(true)
    })
  }, [])

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    // Sincroniza primeiro para o histórico já vir com o que foi feito hoje
    syncXp(todayLocal(), { silent: true }).then(async () => {
      const { data } = await supabase
        .from('xp_events')
        .select('id,type,amount,day,created_at,metadata')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(HISTORY_LIMIT)
      if (cancelled) return
      setEvents((data as XpEventRow[] | null) ?? [])
      setLoadingEvents(false)
    })

    return () => { cancelled = true }
  }, [userId, syncXp])

  const summary = game.summary

  return (
    <main className="min-h-screen pb-16">
      <TopNav />

      <div className="w-full px-4 sm:px-6 lg:px-10">
        <section className="rise pt-8 pb-6 sm:pt-10">
          <p className="eyebrow mb-2">Progresso</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Meu Perfil</h1>
          <p className="mt-2 text-sm text-ink-2">Seu nível, sua sequência e de onde veio cada ponto de XP.</p>
        </section>

        {checked && !session ? (
          <div className="glass rounded-[1.75rem] px-6 py-16 text-center">
            <p className="text-sm text-ink-2">Entre na sua conta para ver o seu perfil.</p>
            <Link href="/" className="btn btn-primary mx-auto mt-5 text-[13px]">Ir para o login</Link>
          </div>
        ) : !game.available ? (
          <div className="glass rounded-[1.75rem] px-6 py-16 text-center">
            <p className="text-sm text-ink-2">
              {game.notConfigured
                ? 'A gamificação ainda não está ativada neste ambiente.'
                : 'Não foi possível carregar o seu perfil agora. Tente novamente em instantes.'}
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rise" style={{ animationDelay: '60ms' }}>
              <ProfileCard
                summary={summary}
                name={session?.user?.email?.split('@')[0] ?? ''}
                gainCount={game.gainCount}
                levelUpCount={game.levelUpCount}
                hideProfileLink
              />
            </div>

            {summary && (
              <>
                {/* ─── NÚMEROS ─── */}
                <section className="rise grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" style={{ animationDelay: '100ms' }}>
                  {[
                    { label: 'XP total', value: summary.totalXp },
                    { label: 'XP hoje', value: summary.xpToday },
                    { label: 'Sequência atual', value: `${summary.currentStreak} d` },
                    { label: 'Recorde de sequência', value: `${summary.bestStreak} d` },
                  ].map(stat => (
                    <div key={stat.label} className="glass rounded-3xl px-4 py-5 text-center">
                      <p className="text-2xl font-semibold tabular-nums tracking-tight text-ink">{stat.value}</p>
                      <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{stat.label}</p>
                    </div>
                  ))}
                </section>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
                  {/* ─── EVOLUÇÃO DE NÍVEL ─── */}
                  <section className="glass rise rounded-[1.75rem] p-5 sm:p-6" style={{ animationDelay: '140ms' }}>
                    <h2 className="text-[15px] font-semibold text-ink">Evolução de nível</h2>

                    <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Títulos</h3>
                    <ul className="space-y-1.5">
                      {summary.titles.map((entry, index) => {
                        const next = summary.titles[index + 1]
                        const isCurrent = index === summary.tier
                        return (
                          <li
                            key={entry.minLevel}
                            className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-sm ${
                              isCurrent ? 'bg-accent/13 font-semibold text-accent' : 'bg-fill-soft text-ink-2'
                            }`}
                          >
                            <span className="min-w-0 truncate">{entry.title}{isCurrent ? ' · você está aqui' : ''}</span>
                            <span className="shrink-0 text-xs tabular-nums">
                              {next ? `Níveis ${entry.minLevel}–${next.minLevel - 1}` : `Nível ${entry.minLevel}+`}
                            </span>
                          </li>
                        )
                      })}
                    </ul>

                    <h3 className="mb-2 mt-6 text-[11px] font-semibold uppercase tracking-wider text-ink-3">Próximos níveis</h3>
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="text-[11px] uppercase tracking-wider text-ink-3">
                          <th className="py-1.5 font-semibold">Nível</th>
                          <th className="py-1.5 text-right font-semibold">XP do nível</th>
                          <th className="py-1.5 text-right font-semibold">XP acumulado</th>
                          <th className="py-1.5 text-right font-semibold">Falta</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums text-ink-2">
                        {Array.from({ length: NEXT_LEVELS_SHOWN }, (_, i) => summary.level + 1 + i)
                          .filter(level => level <= summary.levelConfig.maxLevel)
                          .map(level => {
                            const accumulated = totalXpForLevel(level, summary.levelConfig)
                            return (
                              <tr key={level} className="border-t border-separator-soft">
                                <td className="py-2 font-medium text-ink">{level}</td>
                                <td className="py-2 text-right">{xpForLevel(level - 1, summary.levelConfig)}</td>
                                <td className="py-2 text-right">{accumulated}</td>
                                <td className="py-2 text-right">{Math.max(0, accumulated - summary.totalXp)}</td>
                              </tr>
                            )
                          })}
                      </tbody>
                    </table>
                  </section>

                  {/* ─── HISTÓRICO DE XP ─── */}
                  <section className="glass rise overflow-hidden rounded-[1.75rem]" style={{ animationDelay: '180ms' }}>
                    <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 sm:px-6">
                      <h2 className="text-[15px] font-semibold text-ink">Histórico de XP</h2>
                      <span className="text-[12px] text-ink-3">Últimos {HISTORY_LIMIT} lançamentos</span>
                    </div>

                    {loadingEvents ? (
                      <p className="px-6 py-12 text-center text-sm text-ink-2">Carregando...</p>
                    ) : events.length === 0 ? (
                      <p className="px-6 py-12 text-center text-sm text-ink-2">
                        Nenhum XP ainda. Conclua uma tarefa do dia para começar.
                      </p>
                    ) : (
                      <ul>
                        {events.map(event => {
                          const detail = eventDetail(event)
                          return (
                            <li key={event.id} className="flex items-center gap-3 border-t border-separator-soft px-5 py-3 sm:px-6">
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm text-ink">{EVENT_LABEL[event.type] ?? event.type}</p>
                                <p className="mt-0.5 truncate text-xs text-ink-3">
                                  {event.day ? formatDay(event.day) : new Date(event.created_at).toLocaleDateString('pt-BR')}
                                  {detail ? ` · ${detail}` : ''}
                                </p>
                              </div>
                              <span className={`chip tabular-nums ${event.amount >= 0 ? 'chip-accent' : 'chip-neutral'}`}>
                                {event.amount > 0 ? '+' : ''}{event.amount} XP
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
