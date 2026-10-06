'use client'

import { useEffect, useRef, useState } from 'react'
import { DISPLAY_NAME_MAX_LENGTH, normalizeDisplayName } from '@/src/lib/profile/displayName'

interface Props {
  name: string
  /** Recebe o nome já limpo; vazio significa voltar ao nome padrão. Rejeita se não conseguir salvar */
  onRename: (name: string) => Promise<void>
}

const NAME_TEXT = 'text-lg font-semibold leading-tight tracking-tight text-ink'

export default function EditableName({ name, onRename }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  // Esc desmonta o campo, o que dispara o blur: sem esta marca o cancelamento salvaria
  const cancelled = useRef(false)
  // Quem fecha pelo teclado (Enter ou Esc) recebe o foco de volta no nome
  const closedByKeyboard = useRef(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing || !closedByKeyboard.current) return
    closedByKeyboard.current = false
    buttonRef.current?.focus()
  }, [editing])

  const startEditing = () => {
    cancelled.current = false
    closedByKeyboard.current = false
    setDraft(name)
    setFailed(false)
    setEditing(true)
  }

  const cancel = () => {
    // A gravação já saiu: cancelar agora só esconderia um nome que vai ser salvo
    if (saving) return
    cancelled.current = true
    closedByKeyboard.current = true
    setEditing(false)
  }

  // Fecha sem salvar e sem puxar o foco de volta (a pessoa clicou em outro lugar)
  const dismiss = () => {
    cancelled.current = true
    setEditing(false)
  }

  const commit = async () => {
    if (cancelled.current || saving) return
    const next = normalizeDisplayName(draft)
    if (next === name) {
      setEditing(false)
      return
    }
    setSaving(true)
    setFailed(false)
    try {
      await onRename(next)
      setEditing(false)
    } catch {
      closedByKeyboard.current = false
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={startEditing}
        aria-label={`Alterar nome de usuário (atual: ${name})`}
        className="group/name -mx-2 flex max-w-full items-center gap-1.5 rounded-xl px-2 py-0.5 text-left outline-none transition-colors duration-300 hover:bg-fill-soft focus-visible:bg-fill-soft focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        <span className={`truncate ${NAME_TEXT}`}>{name}</span>
        {/* Em telas de toque não existe hover, então o lápis fica sempre à mostra, bem discreto */}
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0 -translate-x-1 text-ink-3 opacity-0 transition-[opacity,transform,color] duration-300 ease-out group-hover/name:translate-x-0 group-hover/name:text-accent group-hover/name:opacity-100 group-focus-visible/name:translate-x-0 group-focus-visible/name:text-accent group-focus-visible/name:opacity-100 motion-reduce:translate-x-0 motion-reduce:transition-opacity [@media(hover:none)]:translate-x-0 [@media(hover:none)]:opacity-60"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </button>
    )
  }

  return (
    <form
      onSubmit={event => {
        event.preventDefault()
        closedByKeyboard.current = true
        commit()
      }}
    >
      <input
        autoFocus
        value={draft}
        onChange={event => {
          setDraft(event.target.value)
          setFailed(false)
        }}
        onFocus={event => event.target.select()}
        // Sair do campo salva. Depois de um erro já avisado, sair desiste em vez de tentar de
        // novo em silêncio, para o campo não ficar aberto sem foco
        onBlur={failed ? dismiss : commit}
        onKeyDown={event => {
          if (event.key === 'Escape') cancel()
        }}
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        readOnly={saving}
        aria-label="Nome de usuário"
        aria-invalid={failed}
        aria-describedby="name-edit-hint"
        aria-busy={saving}
        placeholder="Seu nome"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="done"
        className={`-mx-2 block w-[calc(100%+1rem)] max-w-72 rounded-xl bg-fill-soft px-2 py-0.5 outline-none ring-2 transition-[box-shadow,opacity] duration-300 placeholder:font-normal placeholder:text-ink-3 ${NAME_TEXT} ${
          failed ? 'ring-danger/50' : 'ring-accent/40'
        } ${saving ? 'opacity-60' : ''}`}
      />
      <p id="name-edit-hint" className="sr-only">
        Enter salva, Esc cancela. Deixe em branco para voltar ao nome padrão.
      </p>
      {failed && (
        <p role="alert" className="mt-1 text-[11px] text-danger">
          Não foi possível salvar. Tente de novo.
        </p>
      )}
    </form>
  )
}
