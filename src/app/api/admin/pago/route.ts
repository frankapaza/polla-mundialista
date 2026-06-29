import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { participanteId, pago } = await req.json()
  if (!participanteId || typeof pago !== 'boolean') return NextResponse.json({ error: 'datos' }, { status: 400 })

  await supabaseAdmin.from('participantes').update({ pago, updated_by: 'admin' }).eq('id', participanteId)
  return NextResponse.json({ ok: true })
}
