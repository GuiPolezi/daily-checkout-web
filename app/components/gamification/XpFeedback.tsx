'use client'

import { useEffect, useRef } from 'react'
import type { SyncResult } from '@/src/lib/gamification/types'
import type { AchievementToast, XpToast } from './useGamification'

interface Props {
  toasts: XpToast[]
  achievementToasts?: AchievementToast[]
  levelUp: SyncResult['leveledUp']
  onDismissLevelUp: () => void
}

const CONFETTI_COLORS = ['var(--ios-blue)', 'var(--ios-teal)', 'var(--ios-green)', 'var(--ios-orange)']
const CONFETTI_PIECES = Array.from({ length: 16 }, (_, index) => ({
  left: `${6 + index * 5.8}%`,
  delay: `${(index % 5) * 90}ms`,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
}))

// Avisos de "+XP" e a celebração de subida de nível. Usa position: fixed,
// então deve ficar fora de qualquer elemento .glass (backdrop-filter desloca filhos fixos).
export default function XpFeedback({ toasts, achievementToasts = [], levelUp, onDismissLevelUp }: Props) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!levelUp) return
    buttonRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismissLevelUp()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [levelUp, onDismissLevelUp])

  return (
    <>
      <div
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2"
        role="status"
        aria-live="polite"
      >
        {achievementToasts.map(toast => (
          <div
            key={toast.key}
            className="card rise mx-4 flex max-w-sm items-center gap-3 rounded-3xl px-4 py-3 shadow-[0_12px_28px_-12px_rgba(16,42,67,0.5)]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="9" r="6" />
                <path d="M8.5 14.2L7 22l5-3 5 3-1.5-7.8" />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-3">Conquista desbloqueada</span>
              <span className="block truncate text-sm font-semibold text-ink">
                {toast.title}{toast.xpReward > 0 ? ` · +${toast.xpReward} XP` : ''}
              </span>
            </span>
          </div>
        ))}
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`xp-toast rounded-full px-5 py-2.5 text-sm font-semibold tabular-nums shadow-[0_12px_28px_-12px_rgba(16,42,67,0.5)] ${
              toast.amount > 0 ? 'bg-accent text-white' : 'card text-ink-2'
            }`}
          >
            {toast.amount > 0 ? `+${toast.amount} XP` : `${toast.amount} XP · estorno`}
          </div>
        ))}
      </div>

      {levelUp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4"
          onClick={onDismissLevelUp}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-up-title"
            onClick={event => event.stopPropagation()}
            className="card rise relative w-full max-w-sm overflow-hidden rounded-4xl p-8 text-center"
          >
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              {CONFETTI_PIECES.map((piece, index) => (
                <span
                  key={index}
                  className="confetti-piece"
                  style={{ left: piece.left, animationDelay: piece.delay, backgroundColor: piece.color }}
                />
              ))}
            </div>

            <p className="eyebrow mb-3">Você subiu de nível</p>
            <h2 id="level-up-title" className="text-5xl font-semibold tabular-nums tracking-tight text-ink">
              Nível {levelUp.to}
            </h2>
            <p className="mt-2 text-sm text-ink-2">{levelUp.title}</p>

            <button ref={buttonRef} onClick={onDismissLevelUp} className="btn btn-primary mt-7 w-full">
              Continuar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
