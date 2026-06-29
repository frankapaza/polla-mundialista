import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sessionFromReq } from '@/lib/auth-server'
import { calcularPuntos } from '@/lib/utils'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const s = sessionFromReq(req)
  if (!s) return NextResponse.json({ error: 'no-sesion' }, { status: 401 })

  const { participanteId, partidoId, golesLocal, golesVisitante } = await req.json()
  const gl = Number(golesLocal), gv = Number(golesVisitante)
  if (!participanteId || !partidoId || ![gl, gv].every(n => Number.isInteger(n) && n >= 0 && n <= 99))
    return NextResponse.json({ error: 'datos' }, { status: 400 })

  // Verificar que el participante sea del jugador logueado y de su liga
  const { data: part } = await supabaseAdmin.from('participantes').select('id, documento, grupo_id').eq('id', participanteId).maybeSingle()
  if (!part || part.documento !== s.documento) return NextResponse.json({ error: 'prohibido' }, { status: 403 })
  const { data: grupo } = await supabaseAdmin.from('grupos').select('liga_id').eq('id', part.grupo_id).maybeSingle()
  if (!grupo || grupo.liga_id !== s.liga_id) return NextResponse.json({ error: 'prohibido' }, { status: 403 })

  const { data: partido } = await supabaseAdmin.from('partidos').select('goles_local, goles_visitante').eq('id', partidoId).maybeSingle()
  if (!partido) return NextResponse.json({ error: 'partido' }, { status: 404 })

  const { data: existing } = await supabaseAdmin.from('pronosticos').select('id, infraccion')
    .eq('participante_id', participanteId).eq('partido_id', partidoId).maybeSingle()
  const yaJugado = partido.goles_local !== null && partido.goles_visitante !== null
  const puntos = existing?.infraccion ? 0 : yaJugado ? calcularPuntos(gl, gv, partido.goles_local!, partido.goles_visitante!) : null
  const actor = `${s.nombre} (${s.documento})`

  if (existing) {
    await supabaseAdmin.from('pronosticos').update({ goles_local: gl, goles_visitante: gv, puntos, updated_by: actor }).eq('id', existing.id)
  } else {
    await supabaseAdmin.from('pronosticos').insert({ participante_id: participanteId, partido_id: partidoId, goles_local: gl, goles_visitante: gv, puntos, created_by: actor, updated_by: actor })
  }
  return NextResponse.json({ ok: true, puntos })
}
