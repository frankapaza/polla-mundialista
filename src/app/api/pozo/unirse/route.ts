import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sessionFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = sessionFromReq(req)
  if (!s) return NextResponse.json({ error: 'no-sesion' }, { status: 401 })

  const { pozoId } = await req.json()
  if (!pozoId) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: pozo } = await supabaseAdmin.from('grupos').select('id, liga_id').eq('id', pozoId).maybeSingle()
  if (!pozo || pozo.liga_id !== s.liga_id) return NextResponse.json({ error: 'prohibido' }, { status: 403 })

  const { data: existing } = await supabaseAdmin.from('participantes').select('*')
    .eq('grupo_id', pozoId).eq('documento', s.documento).maybeSingle()
  if (existing) return NextResponse.json({ ok: true, participante: existing })

  const actor = `${s.nombre} (${s.documento})`
  const { data, error } = await supabaseAdmin.from('participantes')
    .insert({ grupo_id: pozoId, nombre: s.nombre, documento: s.documento, created_by: actor, updated_by: actor })
    .select().single()
  if (error) return NextResponse.json({ error: 'crear' }, { status: 500 })
  return NextResponse.json({ ok: true, participante: data })
}
