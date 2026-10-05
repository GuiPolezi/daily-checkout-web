'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/src/lib/supabaseClient'
import type { ProgressSummary, SyncResult } from '@/src/lib/gamification/types'

export interface XpToast {
  id: number
  amount: number
}

export interface AchievementToast {
  key: number
  title: string
  xpReward: number
}

export type TaskXpMap = SyncResult['taskXp']

const TOAST_DURATION_MS = 2600
const ACHIEVEMENT_TOAST_DURATION_MS = 5000

/**
 * Liga uma tela à gamificação. `sync(data)` pede ao servidor para recalcular o XP do dia;
 * o servidor decide tudo — aqui só exibimos o resultado.
 * Se a gamificação não estiver configurada (ou falhar), a tela segue funcionando sem ela.
 */
export function useGamification() {
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [available, setAvailable] = useState(true)
  // true só quando o servidor avisou que a gamificação não está configurada (e não num erro passageiro)
  const [notConfigured, setNotConfigured] = useState(false)
  const [taskXp, setTaskXp] = useState<{ day: string; byTask: TaskXpMap } | null>(null)
  const [toasts, setToasts] = useState<XpToast[]>([])
  const [achievements, setAchievements] = useState<SyncResult['achievements']>(null)
  const [achievementToasts, setAchievementToasts] = useState<AchievementToast[]>([])
  const [levelUp, setLevelUp] = useState<SyncResult['leveledUp']>(null)
  // Contadores que avisam o personagem para comemorar
  const [gainCount, setGainCount] = useState(0)
  const [levelUpCount, setLevelUpCount] = useState(0)

  const queue = useRef<Promise<void>>(Promise.resolve())
  const disabled = useRef(false)
  const mounted = useRef(true)
  const toastId = useRef(0)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const run = useCallback(async (date: string, silent: boolean) => {
    if (disabled.current) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/gamification/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ date }),
      })

      if (response.status === 503) {
        // Gamificação ainda não configurada neste ambiente: não insiste
        disabled.current = true
        if (mounted.current) { setAvailable(false); setNotConfigured(true) }
        return
      }
      if (!response.ok) {
        // Erro passageiro: esconde o card em vez de deixar o esqueleto preso; a próxima ação tenta de novo
        if (mounted.current) setAvailable(false)
        return
      }

      const result = (await response.json()) as SyncResult
      if (!mounted.current) return

      setAvailable(true)
      setSummary(result.summary)
      setTaskXp({ day: result.day, byTask: result.taskXp })
      setAchievements(result.achievements ?? null)

      // Conquista nova é avisada mesmo em sincronização silenciosa: ela só acontece uma vez
      const unlocked = result.unlocked ?? []
      if (unlocked.length > 0) {
        const fresh = unlocked.map(item => ({ key: ++toastId.current, title: item.title, xpReward: item.xpReward }))
        const keys = new Set(fresh.map(item => item.key))
        setAchievementToasts(current => [...current, ...fresh])
        setTimeout(() => {
          if (mounted.current) setAchievementToasts(current => current.filter(item => !keys.has(item.key)))
        }, ACHIEVEMENT_TOAST_DURATION_MS)
      }
      if (silent) return

      if (result.delta !== 0) {
        const id = ++toastId.current
        setToasts(current => [...current, { id, amount: result.delta }])
        setTimeout(() => {
          if (mounted.current) setToasts(current => current.filter(t => t.id !== id))
        }, TOAST_DURATION_MS)
      }
      if (result.delta > 0) setGainCount(count => count + 1)
      if (result.leveledUp) {
        setLevelUp(result.leveledUp)
        setLevelUpCount(count => count + 1)
      }
    } catch {
      // Falha de rede: a tela principal não depende disso; a próxima ação sincroniza de novo
      if (mounted.current) setAvailable(false)
    }
  }, [])

  // As chamadas são enfileiradas para que cada uma veja o resultado da anterior
  const sync = useCallback((date: string, options: { silent?: boolean } = {}) => {
    queue.current = queue.current.then(() => run(date, options.silent ?? false))
    return queue.current
  }, [run])

  const dismissLevelUp = useCallback(() => setLevelUp(null), [])

  return { summary, available, notConfigured, taskXp, achievements, achievementToasts, toasts, levelUp, dismissLevelUp, gainCount, levelUpCount, sync }
}
