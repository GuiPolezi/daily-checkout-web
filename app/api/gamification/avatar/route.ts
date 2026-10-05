import { NextResponse } from 'next/server'
import { isAvatarSlot } from '@/src/lib/gamification/avatar'
import { EquipAvatarError, equipAvatarItem } from '@/src/lib/gamification/service'
import {
  createSupabaseRepo,
  GamificationNotConfiguredError,
  getServiceClient,
} from '@/src/lib/gamification/supabaseRepo'

const MAX_ITEM_ID_LENGTH = 64

// Equipa um item cosmético no personagem do usuário logado.
// O servidor confere pelo ledger se o nível libera o item.
export async function POST(request: Request) {
  try {
    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1]
    if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => null)
    const slot = body?.slot
    const itemId = body?.itemId
    if (!isAvatarSlot(slot) || typeof itemId !== 'string' || itemId.length > MAX_ITEM_ID_LENGTH) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 })
    }

    const client = getServiceClient()
    const { data, error } = await client.auth.getUser(token)
    if (error || !data.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const avatar = await equipAvatarItem(createSupabaseRepo(client), data.user.id, slot, itemId)
    return NextResponse.json({ avatar }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof EquipAvatarError) {
      return NextResponse.json({ error: error.reason }, { status: error.reason === 'locked' ? 403 : 400 })
    }
    if (error instanceof GamificationNotConfiguredError) {
      return NextResponse.json({ error: 'gamification_not_configured' }, { status: 503 })
    }
    console.error('[gamification] falha ao equipar item', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
