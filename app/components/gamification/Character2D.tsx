'use client'

import { useState } from 'react'
import type { TierLook } from './tiers'

interface Props {
  look: TierLook
  /** Retrato do personagem escolhido; sem ele (ou se a imagem falhar) aparece o frasquinho */
  portrait?: string
}

// Versão 2D do personagem. É o que aparece enquanto o 3D carrega, sem WebGL, em aparelhos
// fracos ou com "reduzir movimento" ligado. Mostra o retrato do personagem escolhido sobre a
// sombra da aura; o frasquinho de perfume original fica como reserva.
export default function Character2D({ look, portrait }: Props) {
  const [failed, setFailed] = useState(false)

  if (portrait && !failed) {
    return (
      <div className="relative h-full w-full" aria-hidden="true">
        <div className="absolute inset-x-[18%] bottom-[7%] h-[9%] rounded-full" style={{ background: look.aura, opacity: 0.28 }} />
        {/* Imagem estática gerada do modelo; next/image não traz ganho aqui */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portrait}
          alt=""
          draggable={false}
          onError={() => setFailed(true)}
          className="mascot-float relative h-full w-full object-contain"
        />
      </div>
    )
  }

  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <ellipse cx="60" cy="106" rx="30" ry="6" fill={look.aura} opacity="0.28" />
      <circle cx="60" cy="62" r="46" fill={look.aura} opacity="0.12" />

      <g className="mascot-float">
        {/* Tampa e gargalo */}
        <rect x="49" y="14" width="22" height="13" rx="4" fill={look.aura} />
        <rect x="53" y="27" width="14" height="9" rx="2" fill="#ffffff" opacity="0.85" />

        {/* Corpo do frasco */}
        <rect x="32" y="36" width="56" height="60" rx="16" fill={look.body} />
        <rect x="32" y="62" width="56" height="34" rx="14" fill={look.aura} opacity="0.55" />
        <rect x="39" y="43" width="9" height="26" rx="4.5" fill="#ffffff" opacity="0.5" />

        {/* Rosto */}
        <circle cx="50" cy="64" r="4" fill="#1d1d1f" />
        <circle cx="70" cy="64" r="4" fill="#1d1d1f" />
        <circle cx="51.3" cy="62.6" r="1.3" fill="#ffffff" />
        <circle cx="71.3" cy="62.6" r="1.3" fill="#ffffff" />
        <path d="M52 75 Q60 82 68 75" fill="none" stroke="#1d1d1f" strokeWidth="2.6" strokeLinecap="round" />

        {/* Brilho */}
        <path
          className="mascot-sparkle"
          d="M95 30 l2.4 6.2 6.2 2.4 -6.2 2.4 -2.4 6.2 -2.4 -6.2 -6.2 -2.4 6.2 -2.4z"
          fill={look.aura}
        />
      </g>
    </svg>
  )
}
