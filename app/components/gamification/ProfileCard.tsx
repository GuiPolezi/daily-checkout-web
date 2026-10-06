'use client'

import type { AvatarState } from '@/src/lib/gamification/avatar'
import type { ProgressSummary } from '@/src/lib/gamification/types'
import Character from './Character'
import { resolveLook } from './tiers'

interface Props {
  summary: ProgressSummary | null
  avatar?: AvatarState | null
  name: string
  gainCount: number
  levelUpCount: number
  /** Muda quando o usuário escolhe uma comemoração (só a página de perfil usa) */
  celebrationCount?: number
}

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

const CARD = 'glass flex h-full items-center gap-4 rounded-[1.75rem] p-4 sm:gap-5 sm:p-5'
const STAGE = 'h-28 w-28 shrink-0 overflow-hidden rounded-3xl sm:h-36 sm:w-36'
// Selos um pouco menores que o padrão do sistema, para os três caberem lado a lado no card
const CHIP = 'px-2.5 py-1 text-[11px]'

export default function ProfileCard({ summary, avatar, name, gainCount, levelUpCount, celebrationCount }: Props) {
  if (!summary) {
    return (
      <section className={CARD} aria-busy="true" aria-label="Carregando seu perfil">
        <div className={`${STAGE} animate-pulse bg-fill`} />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-4 w-40 max-w-full animate-pulse rounded-full bg-fill" />
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

  // O palco do personagem é tingido pela cor da aura: destaca o modelo sobre o vidro nos dois temas
  const { aura } = resolveLook(summary.tier, avatar)

  return (
    <section className={CARD} aria-label="Seu perfil de jogador">
      <div
        className={`${STAGE} border border-separator shadow-[inset_0_1px_0_var(--glass-highlight)]`}
        style={{
          background: `radial-gradient(120% 90% at 50% 100%, color-mix(in srgb, ${aura} 34%, transparent), color-mix(in srgb, ${aura} 10%, transparent) 70%), var(--fill-soft)`,
        }}
      >
        <Character tier={summary.tier} avatar={avatar} gainCount={gainCount} levelUpCount={levelUpCount} celebrationCount={celebrationCount} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-semibold capitalize leading-tight tracking-tight text-ink">{name}</p>
        <p className="mt-1 text-[13px] text-ink-2">
          <span className="font-semibold text-accent">Nível {summary.level}</span>
          <span className="mx-1.5 text-ink-4">·</span>
          {summary.title}
        </p>

        <div
          className="mt-3.5 h-2.5 overflow-hidden rounded-full bg-fill-2"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={progressText}
        >
          <div
            className="h-full rounded-full bg-linear-to-r from-accent to-aero transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-ink-2">{progressText}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className={`chip chip-warn ${CHIP}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2c1 4-2 5-2 8a2 2 0 004 0c2 1.5 3 3.6 3 6a5 5 0 01-10 0c0-5 4-7 5-14z" />
            </svg>
            Sequência: {summary.currentStreak} {plural(summary.currentStreak, 'dia', 'dias')}
          </span>

          <span className={`chip chip-neutral ${CHIP}`} title={`${summary.shields} de ${summary.maxShields} escudos guardados. Um escudo protege a sequência quando você perde um dia útil`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" />
            </svg>
            {summary.shields}/{summary.maxShields} {plural(summary.maxShields, 'escudo', 'escudos')}
          </span>

          <span className={`chip chip-accent tabular-nums ${CHIP}`}>
            {summary.xpToday > 0 ? '+' : ''}{summary.xpToday} XP hoje
          </span>
        </div>
      </div>
    </section>
  )
}
