'use client'

import { useState } from 'react'
import { ACHIEVEMENTS } from '@/src/lib/gamification/achievements'
import { AVATAR_SLOTS, SLOT_LABELS, type AvatarItem, type AvatarSlot, type AvatarState } from '@/src/lib/gamification/avatar'
import { findCharacter } from '@/src/lib/gamification/characters'

interface Props {
  avatar: AvatarState
  onEquip: (slot: AvatarSlot, itemId: string) => Promise<boolean>
  /** Chamado ao clicar na comemoração já equipada: o personagem a repete */
  onPreviewCelebration?: () => void
}

const SLOT_HINTS: Partial<Record<AvatarSlot, string>> = {
  character: 'Escolha quem representa você. Os bloqueados mostram como liberar.',
  celebration: 'Ao escolher, o personagem mostra a comemoração. Clique de novo para ver outra vez.',
}

const achievementTitle = (id: string) => ACHIEVEMENTS.find(item => item.id === id)?.title ?? id

/** Texto curto de como liberar um item bloqueado */
function lockHint(item: AvatarItem): string {
  const parts: string[] = []
  if (item.minLevel > 1) parts.push(`nível ${item.minLevel}`)
  if (item.achievementId) parts.push(`conquista ${achievementTitle(item.achievementId)}`)
  return parts.join(' · ')
}

// Escolha dos itens cosméticos do personagem. O servidor confere o nível e as conquistas de novo
// ao equipar; aqui os itens bloqueados só aparecem desabilitados, com o que os libera.
export default function AvatarPicker({ avatar, onEquip, onPreviewCelebration }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const equip = async (slot: AvatarSlot, itemId: string) => {
    if (busy) return
    if (avatar.equipped[slot] === itemId) {
      if (slot === 'celebration') onPreviewCelebration?.()
      return
    }
    setBusy(itemId)
    setFailed(!(await onEquip(slot, itemId)))
    setBusy(null)
  }

  const renderCharacterGrid = (items: AvatarState['items']) => (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-7">
      {items.map(item => {
        const character = findCharacter(item.value)
        const selected = avatar.equipped.character === item.id
        const hint = item.unlocked ? '' : lockHint(item)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => equip('character', item.id)}
            disabled={!item.unlocked || busy !== null}
            aria-pressed={selected}
            aria-label={`${item.title}${hint ? ` · libera com ${hint}` : ''}`}
            title={character ? `${item.title}: ${character.description}${hint ? ` Libera com ${hint}.` : ''}` : item.title}
            className={`flex flex-col items-center gap-1 rounded-2xl p-1.5 text-center transition-all duration-200 ${
              selected
                ? 'bg-accent/13 ring-2 ring-accent/50'
                : item.unlocked
                  ? 'bg-fill hover:bg-fill-2'
                  : 'bg-fill-soft'
            } ${busy === item.id ? 'opacity-60' : ''}`}
          >
            <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-white/50 dark:bg-white/10">
              {character && (
                // Retrato estático gerado do modelo; next/image não traz ganho aqui
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={character.portrait}
                  alt=""
                  draggable={false}
                  className={`h-full w-full object-contain ${item.unlocked ? '' : 'opacity-40 grayscale'}`}
                />
              )}
              {!item.unlocked && (
                <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-3">
                    <rect x="5" y="11" width="14" height="10" rx="2" />
                    <path d="M8 11V7a4 4 0 018 0v4" />
                  </svg>
                </span>
              )}
            </span>
            <span className={`w-full truncate text-[12px] font-medium ${selected ? 'text-accent' : item.unlocked ? 'text-ink' : 'text-ink-3'}`}>
              {item.title}
            </span>
            {hint && <span className="w-full truncate text-[10px] leading-tight text-ink-3">{hint}</span>}
          </button>
        )
      })}
    </div>
  )

  const renderChips = (slot: AvatarSlot, items: AvatarState['items']) => (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const selected = avatar.equipped[slot] === item.id
        const isColor = slot !== 'celebration' && item.value !== null
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => equip(slot, item.id)}
            disabled={!item.unlocked || busy !== null}
            aria-pressed={selected}
            title={item.unlocked ? item.title : `${item.title} · libera no nível ${item.minLevel}`}
            className={`flex items-center gap-2 rounded-full py-1.5 pl-2 pr-3.5 text-[13px] font-medium transition-all duration-200 ${
              selected
                ? 'bg-accent/13 text-accent ring-2 ring-accent/50'
                : item.unlocked
                  ? 'bg-fill text-ink hover:bg-fill-2'
                  : 'bg-fill-soft text-ink-3'
            } ${busy === item.id ? 'opacity-60' : ''}`}
          >
            {isColor ? (
              <span
                className={`h-5 w-5 shrink-0 rounded-full border border-black/10 ${item.unlocked ? '' : 'opacity-40'}`}
                style={{ backgroundColor: item.value ?? undefined }}
                aria-hidden="true"
              />
            ) : (
              <span className="w-1.5" aria-hidden="true" />
            )}
            {item.title}
            {!item.unlocked && <span className="text-[11px] tabular-nums">· nível {item.minLevel}</span>}
          </button>
        )
      })}
    </div>
  )

  return (
    <section className="glass rounded-[1.75rem] p-5 sm:p-6" aria-label="Personalizar personagem">
      <h2 className="text-[15px] font-semibold text-ink">Personagem</h2>
      <p className="mt-1 text-xs text-ink-3">Itens só visuais, liberados conforme o seu nível e as suas conquistas.</p>

      <div className="mt-4 space-y-5">
        {AVATAR_SLOTS.map(slot => {
          const items = avatar.items.filter(item => item.slot === slot)
          return (
            <div key={slot}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{SLOT_LABELS[slot]}</h3>
              {SLOT_HINTS[slot] && <p className="-mt-1 mb-2 text-xs text-ink-3">{SLOT_HINTS[slot]}</p>}
              {slot === 'character' ? renderCharacterGrid(items) : renderChips(slot, items)}
            </div>
          )
        })}
      </div>

      {failed && (
        <p className="mt-4 text-xs text-danger" role="alert">Não foi possível salvar a escolha. Tente novamente.</p>
      )}
    </section>
  )
}
