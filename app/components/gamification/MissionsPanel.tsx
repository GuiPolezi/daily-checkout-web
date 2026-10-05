'use client'

import type { MissionProgress } from '@/src/lib/gamification/missions'
import type { TeamGoalProgress } from '@/src/lib/gamification/team'
import type { MissionsState } from './useGamification'

interface Props {
  missions: MissionsState | null
  /** Metas cooperativas da semana */
  team?: TeamGoalProgress[] | null
  /** No modo recolhível, se o painel já começa aberto */
  defaultOpen?: boolean
  /** false = conteúdo sempre à mostra, sem cabeçalho de recolher (usado dentro de uma guia) */
  collapsible?: boolean
}

// Missões e metas da equipe são exibidas da mesma forma
type MissionRowData = Pick<MissionProgress, 'title' | 'description' | 'current' | 'target' | 'reward' | 'done'> & { id: string }

function MissionRow({ mission }: { mission: MissionRowData }) {
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

function MissionGroup({ label, note, missions }: { label: string; note?: string; missions: MissionRowData[] }) {
  return (
    <div>
      <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{label}</h3>
      <ul className="space-y-2">
        {missions.map(mission => <MissionRow key={mission.id} mission={mission} />)}
      </ul>
      {note && <p className="mt-2 text-xs text-ink-3">{note}</p>}
    </div>
  )
}

function teamNote(team: TeamGoalProgress[]): string {
  const { contributors, contributed, progressHidden, minContributors } = team[0]
  const call = contributed
    ? 'Você já contribuiu nesta semana. Quem contribui recebe a recompensa ao abrir o sistema depois que a equipe bate a meta, até domingo.'
    : 'Conclua uma tarefa ou rotina nesta semana para participar da recompensa.'
  if (progressHidden || contributors === null) {
    return `O progresso da equipe aparece quando pelo menos ${minContributors} pessoas contribuírem na semana. ${call}`
  }
  return `${contributors} pessoas contribuíram nesta semana. ${call}`
}

export default function MissionsPanel({ missions, team, defaultOpen = false, collapsible = true }: Props) {
  const daily = missions?.daily ?? []
  const weekly = missions?.weekly ?? []
  const goals = team ?? []
  const all: MissionRowData[] = [...daily, ...weekly, ...goals]
  if (all.length === 0) return null

  // Meta da equipe só conta como "sua" se você contribuiu (é quem recebe a recompensa)
  const doneCount =
    [...daily, ...weekly].filter(mission => mission.done).length + goals.filter(goal => goal.done && goal.contributed).length

  const groups = (
    <>
      {daily.length > 0 && <MissionGroup label="Hoje" missions={daily} />}
      {weekly.length > 0 && <MissionGroup label="Esta semana" missions={weekly} />}
      {goals.length > 0 && <MissionGroup label="Equipe · esta semana" missions={goals} note={teamNote(goals)} />}
    </>
  )

  if (!collapsible) {
    return (
      <section className="glass rounded-[1.75rem] p-5 sm:p-6" aria-label="Missões">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-[13px] text-ink-2">Objetivos curtos que rendem XP extra.</p>
          <span className="chip chip-accent shrink-0 tabular-nums">{doneCount} de {all.length} concluídas</span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{groups}</div>
      </section>
    )
  }

  return (
    <details className="glass group rounded-[1.75rem]" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-semibold text-ink">{goals.length > 0 ? 'Missões e metas da equipe' : 'Missões'}</span>
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

      <div className="grid grid-cols-1 gap-5 px-5 pb-5 lg:grid-cols-2">{groups}</div>
    </details>
  )
}
