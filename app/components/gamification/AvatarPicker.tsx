'use client'

import { useState } from 'react'
import { AVATAR_SLOTS, SLOT_LABELS, type AvatarSlot, type AvatarState } from '@/src/lib/gamification/avatar'

interface Props {
  avatar: AvatarState
  onEquip: (slot: AvatarSlot, itemId: string) => Promise<boolean>
}

// Escolha dos itens cosméticos do personagem. O servidor confere o nível de novo ao equipar;
// aqui os itens bloqueados só aparecem desabilitados, com o nível que os libera.
export default function AvatarPicker({ avatar, onEquip }: Props) {
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const equip = async (slot: AvatarSlot, itemId: string) => {
    if (busy || avatar.equipped[slot] === itemId) return
    setBusy(itemId)
    setFailed(!(await onEquip(slot, itemId)))
    setBusy(null)
  }

  return (
    <section className="glass rounded-[1.75rem] p-5 sm:p-6" aria-label="Personalizar personagem">
      <h2 className="text-[15px] font-semibold text-ink">Personagem</h2>
      <p className="mt-1 text-xs text-ink-3">Itens só visuais, liberados conforme o seu nível.</p>

      <div className="mt-4 space-y-5">
        {AVATAR_SLOTS.map(slot => (
          <div key={slot}>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-3">{SLOT_LABELS[slot]}</h3>
            <div className="flex flex-wrap gap-2">
              {avatar.items.filter(item => item.slot === slot).map(item => {
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
          </div>
        ))}
      </div>

      {failed && (
        <p className="mt-4 text-xs text-danger" role="alert">Não foi possível salvar a escolha. Tente novamente.</p>
      )}
    </section>
  )
}
