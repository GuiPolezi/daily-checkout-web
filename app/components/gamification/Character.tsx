'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Character2D from './Character2D'

interface Props {
  tier: number
  gainCount: number
  levelUpCount: number
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

export default function Character({ tier, gainCount, levelUpCount }: Props) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [ready, setReady] = useState(false)

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
      <div className={`h-full w-full transition-opacity duration-500 ${ready ? 'opacity-0' : 'opacity-100'}`}>
        <Character2D tier={tier} />
      </div>
      {mode === '3d' && (
        <div className="absolute inset-0">
          <Character3D
            tier={tier}
            gainCount={gainCount}
            levelUpCount={levelUpCount}
            onReady={() => setReady(true)}
            onError={() => { setReady(false); setMode('2d') }}
          />
        </div>
      )}
    </div>
  )
}
