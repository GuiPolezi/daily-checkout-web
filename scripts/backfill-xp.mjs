// Backfill de XP: dá um valor fixo por tarefa concluída ANTES da gamificação existir,
// para que quem já usava o sistema não comece do zero.
//
//   node scripts/backfill-xp.mjs            → simulação (não grava nada)
//   node scripts/backfill-xp.mjs --apply    → grava
//
// Pode rodar quantas vezes quiser: cada usuário recebe no máximo um lançamento de backfill.
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (lidas do ambiente ou de .env.local).

import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const APPLY = process.argv.includes('--apply')
const DEFAULT_XP_PER_TASK = 10
const PAGE_SIZE = 1000

function loadEnvFile(path) {
  if (!fs.existsSync(path)) return
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}

loadEnvFile('.env.local')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

function check({ data, error }, what) {
  if (error) {
    console.error(`Erro ao ${what}: ${error.message}`)
    process.exit(1)
  }
  return data
}

async function fetchAll(buildQuery) {
  const rows = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = check(await buildQuery().range(from, from + PAGE_SIZE - 1), 'ler dados')
    rows.push(...page)
    if (page.length < PAGE_SIZE) return rows
  }
}

const configRows = check(await supabase.from('gamification_config').select('params').eq('id', 1), 'ler a configuração')
const configured = configRows[0]?.params?.backfill?.xpPerTask
const xpPerTask = Number.isFinite(configured) && configured >= 0 ? configured : DEFAULT_XP_PER_TASK

// Tarefas concluídas sem completed_at = concluídas antes da migration da gamificação
const legacyTasks = await fetchAll(() =>
  supabase.from('tasks').select('id,user_id').eq('status', 'Concluída').is('completed_at', null).order('id')
)

const countByUser = new Map()
for (const task of legacyTasks) countByUser.set(task.user_id, (countByUser.get(task.user_id) ?? 0) + 1)

const existing = check(await supabase.from('xp_events').select('user_id').eq('type', 'BACKFILL'), 'ler o ledger')
const alreadyDone = new Set(existing.map(row => row.user_id))

const events = [...countByUser.entries()]
  .filter(([userId]) => !alreadyDone.has(userId))
  .map(([userId, tasks]) => ({
    user_id: userId,
    type: 'BACKFILL',
    amount: tasks * xpPerTask,
    source_id: 'backfill:v1',
    day: null,
    idempotency_key: `backfill:v1:${userId}`,
    metadata: { tasks, xpPerTask, rule: 'valor fixo por tarefa concluída antes da gamificação' },
  }))

console.log(APPLY ? 'MODO: gravação' : 'MODO: simulação (use --apply para gravar)')
console.log(`XP por tarefa: ${xpPerTask}`)
console.log(`Usuários com tarefas antigas concluídas: ${countByUser.size} · já com backfill: ${alreadyDone.size}`)
for (const event of events) {
  console.log(`  ${event.user_id}: ${event.metadata.tasks} tarefas → +${event.amount} XP`)
}
if (events.length === 0) console.log('  Nada a lançar.')

if (APPLY && events.length > 0) {
  const { error } = await supabase
    .from('xp_events')
    .upsert(events, { onConflict: 'idempotency_key', ignoreDuplicates: true })
  check({ data: null, error }, 'gravar o backfill')
  console.log(`Gravado: ${events.length} lançamento(s). O total de cada pessoa é atualizado na próxima vez que ela abrir o sistema.`)
}
