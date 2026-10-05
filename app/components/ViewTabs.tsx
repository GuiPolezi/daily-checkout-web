'use client'

import { useRef } from 'react'

export interface ViewTab<T extends string> {
  id: T
  label: string
}

interface Props<T extends string> {
  tabs: ViewTab<T>[]
  active: T
  onChange: (id: T) => void
  /** Prefixo dos ids; cada painel deve usar `${idPrefix}-panel-${id}` e aria-labelledby `${idPrefix}-tab-${id}` */
  idPrefix: string
  label: string
}

// Guias em texto ("Tarefas / Missões"). Segue o padrão de abas acessíveis:
// setas e Home/End trocam de guia, e só a guia ativa entra na ordem do Tab.
export default function ViewTabs<T extends string>({ tabs, active, onChange, idPrefix, label }: Props<T>) {
  const buttons = useRef(new Map<T, HTMLButtonElement>())

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = tabs.findIndex(tab => tab.id === active)
    const nextIndex =
      event.key === 'ArrowRight' ? (index + 1) % tabs.length
        : event.key === 'ArrowLeft' ? (index - 1 + tabs.length) % tabs.length
          : event.key === 'Home' ? 0
            : event.key === 'End' ? tabs.length - 1
              : -1
    if (nextIndex < 0 || nextIndex === index) return
    event.preventDefault()
    const next = tabs[nextIndex].id
    onChange(next)
    buttons.current.get(next)?.focus()
  }

  return (
    <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="flex items-baseline gap-2.5">
      {tabs.map((tab, index) => (
        <div key={tab.id} className="flex items-baseline gap-2.5">
          {index > 0 && <span aria-hidden="true" className="select-none text-xl text-ink-4 sm:text-2xl">/</span>}
          <button
            ref={element => {
              if (element) buttons.current.set(tab.id, element)
              else buttons.current.delete(tab.id)
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.id}`}
            aria-selected={tab.id === active}
            aria-controls={`${idPrefix}-panel-${tab.id}`}
            tabIndex={tab.id === active ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className="view-tab"
          >
            {tab.label}
          </button>
        </div>
      ))}
    </div>
  )
}
