'use client'

import Link from 'next/link'
import type { ProgressSummary } from '@/src/lib/gamification/types'
import Character from './Character'

interface Props {
  summary: ProgressSummary | null
  name: string
  gainCount: number
  levelUpCount: number
  /** Esconde o atalho "Meu perfil" (usado dentro da própria página de perfil) */
  hideProfileLink?: boolean
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

export default function ProfileCard({ summary, name, gainCount, levelUpCount, hideProfileLink = false }: Props) {
  if (!summary) {
    return (
      <section className="glass flex items-center gap-4 rounded-[1.75rem] p-4 sm:gap-6 sm:p-5" aria-busy="true" aria-label="Carregando seu perfil">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-3xl bg-fill sm:h-32 sm:w-32" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-40 animate-pulse rounded-full bg-fill" />
          <div className="h-2.5 w-full animate-pulse rounded-full bg-fill" />
          <div className="h-4 w-56 max-w-full animate-pulse rounded-full bg-fill" />
        </div>
      </section>
    )
  }

  const percent = summary.isMaxLevel
    ? 100
    : Math.min(100, Math.round((summary.xpIntoLevel / summary.xpForNext) * 100))
  const progressText = summary.isMaxLevel
    ? `${summary.totalXp} XP · nível máximo`
    : `${summary.xpIntoLevel} / ${summary.xpForNext} XP para o nível ${summary.level + 1}`

  return (
    <section className="glass flex items-center gap-4 rounded-[1.75rem] p-4 sm:gap-6 sm:p-5" aria-label="Seu perfil de jogador">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-3xl bg-fill-soft sm:h-32 sm:w-32">
        <Character tier={summary.tier} gainCount={gainCount} levelUpCount={levelUpCount} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold capitalize text-ink">{name}</p>
            <p className="mt-0.5 text-[13px] text-ink-2">
              <span className="font-semibold text-accent">Nível {summary.level}</span>
              <span className="mx-1.5 text-ink-4">·</span>
              {summary.title}
            </p>
          </div>
          {!hideProfileLink && (
            <Link href="/perfil" className="btn btn-sm btn-secondary shrink-0">
              Meu perfil
            </Link>
          )}
        </div>

        <div
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-fill"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={progressText}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-accent to-aero transition-all duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-ink-2">{progressText}</p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="chip chip-warn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2c1 4-2 5-2 8a2 2 0 004 0c2 1.5 3 3.6 3 6a5 5 0 01-10 0c0-5 4-7 5-14z" />
            </svg>
            Sequência: {summary.currentStreak} {plural(summary.currentStreak, 'dia', 'dias')}
          </span>

          <span className="chip chip-neutral" title="Um escudo protege a sequência quando você perde um dia útil">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
            </svg>
            {summary.shields} de {summary.maxShields} {plural(summary.maxShields, 'escudo', 'escudos')}
          </span>

          <span className="chip chip-accent tabular-nums">
            {summary.xpToday > 0 ? '+' : ''}{summary.xpToday} XP hoje
          </span>
        </div>
      </div>
    </section>
  )
}
