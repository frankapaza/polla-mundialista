import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

// Resetea el PIN de un jugador (pin_hash -> null). En el próximo ingreso define uno nuevo.
export async function POST(req: NextRequest) {
  const admin = adminFromReq(req)
  if (!admin) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { documento } = await req.json()
  if (!documento) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: liga } = await supabaseAdmin.from('ligas').select('id').eq('codigo', admin.codigo).maybeSingle()
  if (!liga) return NextResponse.json({ error: 'liga' }, { status: 404 })

  await supabaseAdmin.from('jugadores')
    .update({ pin_hash: null, intentos_fallidos: 0, bloqueado_hasta: null, updated_by: 'admin' })
    .eq('liga_id', liga.id).eq('documento', String(documento).trim())
  return NextResponse.json({ ok: true })
}
