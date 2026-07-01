import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { participanteId, pago } = await req.json()
  if (!participanteId || typeof pago !== 'boolean') return NextResponse.json({ error: 'datos' }, { status: 400 })

  // pago es la fuente de verdad de los gates; pago_estado acompaña el flujo Yape.
  await supabaseAdmin.from('participantes')
    .update({ pago, pago_estado: pago ? 'confirmado' : 'pendiente', updated_by: 'admin' })
    .eq('id', participanteId)
  return NextResponse.json({ ok: true })
}
