'use client'

// TEMPORÁRIO — mede a largura real do título com a fonte do sistema; será removido antes do commit.
import { useEffect, useRef, useState } from 'react'

const DATES = [
  'segunda-feira, 5 de outubro',
  'segunda-feira, 30 de setembro',
  'segunda-feira, 23 de fevereiro',
  'segunda-feira, 23 de novembro',
  'quarta-feira, 30 de setembro',
  'sexta-feira, 1 de maio',
]

export default function Measure() {
  const refs = useRef<(HTMLHeadingElement | null)[]>([])
  const [out, setOut] = useState('medindo')

  useEffect(() => {
    document.fonts.ready.then(() => {
      const family = getComputedStyle(refs.current[0] as Element).fontFamily
      const geist = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).join('|')
      const rows = DATES.map((d, i) => `${d.length}ch=${(refs.current[i]?.getBoundingClientRect().width ?? 0).toFixed(1)}`)
      setOut(`MEDIDA fontes=[${geist}] family=[${family.slice(0, 60)}] ${rows.join(' ; ')}`)
    })
  }, [])

  return (
    <main className="p-10">
      <p id="out">{out}</p>
      {DATES.map((d, i) => (
        <h2
          key={d}
          ref={el => { refs.current[i] = el }}
          className="w-fit whitespace-nowrap font-semibold capitalize leading-[1.1] tracking-tight text-ink"
          style={{ fontSize: '100px' }}
        >
          {d}
        </h2>
      ))}
    </main>
  )
}
