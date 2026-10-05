'use client'

import { useEffect, useRef, useState } from 'react'

// Tamanho de referência usado para medir a largura natural do texto
const REFERENCE_PX = 100
// Pequena folga para o texto nunca encostar na borda (arredondamento de subpixel)
const SAFETY = 0.985

interface Options {
  /** Menor tamanho aceito, em px; abaixo disso o texto pode quebrar em duas linhas */
  min: number
  /** Maior tamanho, em px */
  max: number
}

/**
 * Calcula o maior tamanho de fonte com que `text` cabe em UMA linha dentro do container.
 * A largura do texto depende da fonte do aparelho (o sistema usa a fonte padrão do sistema
 * operacional), por isso ela é medida de verdade em vez de estimada por número de letras.
 *
 * Uso: `containerRef` no elemento que limita a largura e `measureRef` num elemento escondido
 * com o mesmo texto e as mesmas classes de fonte, com font-size de 100px. Enquanto a medida
 * não existe (primeira pintura), `fontSize` é null e vale o tamanho definido no CSS.
 */
export function useFitText(text: string, { min, max }: Options) {
  const containerRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState<number | null>(null)

  useEffect(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return

    const compute = () => {
      const emWidth = measure.getBoundingClientRect().width / REFERENCE_PX
      const available = container.clientWidth
      if (!emWidth || !available) return
      const fit = Math.floor((available / emWidth) * SAFETY * 10) / 10
      setFontSize(Math.max(min, Math.min(max, fit)))
    }

    compute()
    const observer = new ResizeObserver(compute)
    observer.observe(container)
    // Se uma fonte terminar de carregar depois, a largura muda: mede de novo
    let active = true
    document.fonts?.ready.then(() => { if (active) compute() })

    return () => {
      active = false
      observer.disconnect()
    }
  }, [text, min, max])

  return { containerRef, measureRef, fontSize, referencePx: REFERENCE_PX }
}
