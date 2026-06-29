import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sessionFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = sessionFromReq(req)
  if (!s) return NextResponse.json({ error: 'no-sesion' }, { status: 401 })

  const { participanteId, fase, equipo, partidoId } = await req.json()
  if (!participanteId || !fase || !equipo || !partidoId) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: part } = await supabaseAdmin.from('participantes').select('id, documento, grupo_id').eq('id', participanteId).maybeSingle()
  if (!part || part.documento !== s.documento) return NextResponse.json({ error: 'prohibido' }, { status: 403 })
  const { data: grupo } = await supabaseAdmin.from('grupos').select('liga_id, fases').eq('id', part.grupo_id).maybeSingle()
  if (!grupo || grupo.liga_id !== s.liga_id) return NextResponse.json({ error: 'prohibido' }, { status: 403 })

  const actor = `${s.nombre} (${s.documento})`
  const { data: existing } = await supabaseAdmin.from('survivor_picks').select('id')
    .eq('participante_id', participanteId).eq('fase', fase).maybeSingle()
  if (existing) {
    await supabaseAdmin.from('survivor_picks').update({ equipo, partido_id: partidoId, estado: 'pendiente', updated_by: actor }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('survivor_picks').insert({ participante_id: participanteId, fase, equipo, partido_id: partidoId, created_by: actor, updated_by: actor })
  }
  return NextResponse.json({ ok: true })
}
