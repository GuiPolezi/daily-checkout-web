import { NextResponse } from 'next/server'
import { isValidDay } from '@/src/lib/gamification/day'
import { syncDay } from '@/src/lib/gamification/service'
import {
  createSupabaseRepo,
  GamificationNotConfiguredError,
  getServiceClient,
} from '@/src/lib/gamification/supabaseRepo'

// Sincroniza o XP de um dia do usuário logado. O cliente manda só a data:
// todo valor é recalculado aqui a partir do que está no banco.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const day = body?.date
    if (!isValidDay(day)) return NextResponse.json({ error: 'invalid_date' }, { status: 400 })

    const client = getServiceClient()
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const result = await syncDay(createSupabaseRepo(client), data.user.id, day)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof GamificationNotConfiguredError) {
      return NextResponse.json({ error: 'gamification_not_configured' }, { status: 503 })
    }
    console.error('[gamification] falha ao sincronizar', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
