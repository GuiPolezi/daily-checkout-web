import type { TierLook } from './tiers'

// Versão 2D do personagem: um frasquinho de perfume. É o que aparece enquanto o 3D carrega,
// sem WebGL, em aparelhos fracos ou com "reduzir movimento" ligado.
export default function Character2D({ look }: { look: TierLook }) {
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
