import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sessionFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

// El jugador reporta el código de operación de su Yape. Queda 'reportado'
// hasta que el admin lo confirme. No marca pago=true por sí solo.
export async function POST(req: NextRequest) {
  const s = sessionFromReq(req)
  if (!s) return NextResponse.json({ error: 'no-sesion' }, { status: 401 })

  const { pozoId, operacion } = await req.json()
  const op = String(operacion ?? '').trim()
  if (!pozoId || !op) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: pozo } = await supabaseAdmin.from('grupos').select('id, liga_id').eq('id', pozoId).maybeSingle()
  if (!pozo || pozo.liga_id !== s.liga_id) return NextResponse.json({ error: 'prohibido' }, { status: 403 })

  const { data: part } = await supabaseAdmin.from('participantes').select('id, pago')
    .eq('grupo_id', pozoId).eq('documento', s.documento).maybeSingle()
  if (!part) return NextResponse.json({ error: 'no-inscrito' }, { status: 404 })
  if (part.pago) return NextResponse.json({ ok: true, yaConfirmado: true })

  const { data, error } = await supabaseAdmin.from('participantes')
    .update({
      pago_estado: 'reportado',
      pago_operacion: op.slice(0, 40),
      pago_reportado_at: new Date().toISOString(),
      updated_by: `${s.nombre} (${s.documento})`,
    })
    .eq('id', part.id).select().single()
  if (error) return NextResponse.json({ error: 'guardar' }, { status: 500 })
  return NextResponse.json({ ok: true, participante: data })
}
