'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import type { AvatarState } from '@/src/lib/gamification/avatar'
import Character2D from './Character2D'
import { characterFor, resolveLook } from './tiers'

interface Props {
  tier: number
  /** Itens equipados; sem isso o personagem usa só as cores da faixa de nível */
  avatar?: AvatarState | null
  gainCount: number
  levelUpCount: number
  /** Muda quando o usuário escolhe uma comemoração; o 3D a toca e o 2D dá um pulo */
  celebrationCount?: number
}

// O 3D (three.js + modelo) fica num pedaço separado do bundle, baixado só no navegador
// e só depois que a página já está de pé. Enquanto isso — e sempre que não for viável — vale o 2D.
const Character3D = dynamic(() => import('./Character3D'), {
  ssr: false,
  loading: () => null,
})

function canUse3D(): boolean {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false

  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }
  if (nav.connection?.saveData) return false
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false

  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

// Duração do fade do 2D para o 3D (igual ao duration-500 usado abaixo)
const FADE_MS = 500

export default function Character({ tier, avatar, gainCount, levelUpCount, celebrationCount = 0 }: Props) {
  const equipped = avatar?.equipped
  // Objeto estável: o 3D só reaplica as cores quando algo muda de fato
  const look = useMemo(
    () => resolveLook(tier, avatar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tier, equipped?.body, equipped?.aura, equipped?.celebration]
  )
  // Personagem escolhido (o robô quando não há nada equipado)
  const character = useMemo(
    () => characterFor(avatar),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [equipped?.character]
  )
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [ready, setReady] = useState(false)
  // O 2D sai do DOM depois do fade: assim ele nunca fica visível por trás do 3D (o canvas é transparente)
  const [show2D, setShow2D] = useState(true)

  useEffect(() => {
    if (!ready) {
      setShow2D(true)
      return
    }
    const timer = setTimeout(() => setShow2D(false), FADE_MS + 50)
    return () => clearTimeout(timer)
  }, [ready])

  useEffect(() => {
    if (!canUse3D()) return
    // Espera o navegador ficar ocioso: o kanban carrega primeiro
    const idle = window.requestIdleCallback
    if (idle) {
      const handle = idle(() => setMode('3d'), { timeout: 2500 })
      return () => window.cancelIdleCallback(handle)
    }
    const timer = setTimeout(() => setMode('3d'), 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative h-full w-full">
      {/* O 2D fica à mostra até o modelo 3D terminar de carregar */}
      {show2D && (
        <div className={`h-full w-full transition-opacity duration-500 ${ready ? 'opacity-0' : 'opacity-100'}`}>
          {/* A chave reinicia a animação do pulo a cada comemoração escolhida */}
          <div key={celebrationCount} className={`h-full w-full ${celebrationCount > 0 ? 'mascot-hop' : ''}`}>
            <Character2D look={look} portrait={character.portrait} />
          </div>
        </div>
      )}
      {mode === '3d' && (
        <div className="absolute inset-0">
          <Character3D
            character={character}
            look={look}
            gainCount={gainCount}
            levelUpCount={levelUpCount}
            celebrationCount={celebrationCount}
            onReady={() => setReady(true)}
            onError={() => { setReady(false); setMode('2d') }}
          />
        </div>
      )}
    </div>
  )
}
