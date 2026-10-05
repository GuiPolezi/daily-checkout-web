'use client'

import type { MissionProgress } from '@/src/lib/gamification/missions'
import type { MissionsState } from './useGamification'

interface Props {
  missions: MissionsState | null
  /** Na home o painel começa fechado para não empurrar o kanban; no perfil, aberto */
  defaultOpen?: boolean
}

function MissionRow({ mission }: { mission: MissionProgress }) {
  const percent = Math.round((mission.current / mission.target) * 100)

  return (
    <li className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${mission.done ? 'bg-success/10' : 'bg-fill-soft'}`}>
      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        mission.done ? 'bg-success text-white' : 'border-2 border-ink-4'
      }`}>
        {mission.done && (
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{mission.title}</p>
        <p className="mt-0.5 text-xs text-ink-3">{mission.description}</p>
        <div className="mt-2 flex items-center gap-2.5">
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={mission.target}
            aria-valuenow={mission.current}
            aria-label={`Progresso de ${mission.title}`}
          >
            <div className="h-full rounded-full bg-linear-to-r from-accent to-aero transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          <span className="shrink-0 text-[11px] font-medium tabular-nums text-ink-2">
            {mission.current} de {mission.target}
          </span>
        </div>
      </div>

      {mission.reward > 0 && (
        <span className={`chip shrink-0 tabular-nums ${mission.done ? 'chip-success' : 'chip-accent'}`}>+{mission.reward} XP</span>
      )}
    </li>
  )
}

function MissionGroup({ label, missions }: { label: string; missions: MissionProgress[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</h3>
      <ul className="space-y-2">
        {missions.map(mission => <MissionRow key={mission.id} mission={mission} />)}
      </ul>
    </div>
  )
}

export default function MissionsPanel({ missions, defaultOpen = false }: Props) {
  const daily = missions?.daily ?? []
  const weekly = missions?.weekly ?? []
  const all = [...daily, ...weekly]
  if (all.length === 0) return null

  const doneCount = all.filter(mission => mission.done).length

  return (
    <details className="glass group rounded-[1.75rem]" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-semibold text-ink">Missões</span>
        <span className="flex items-center gap-2.5">
          <span className="chip chip-accent tabular-nums">{doneCount} de {all.length} concluídas</span>
          <svg
            className="text-ink-3 transition-transform duration-200 group-open:rotate-180"
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>

      <div className="grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-2">
        {daily.length > 0 && <MissionGroup label="Hoje" missions={daily} />}
        {weekly.length > 0 && <MissionGroup label="Esta semana" missions={weekly} />}
      </div>
    </details>
  )
}
