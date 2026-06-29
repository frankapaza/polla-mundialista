import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'
import type { Partido, Participante, SurvivorPick } from '@/lib/types'

export const runtime = 'nodejs'

function estado(pick: SurvivorPick, byId: Record<string, Partido>): SurvivorPick['estado'] {
  const p = pick.partido_id ? byId[pick.partido_id] : undefined
  if (!p || p.goles_local === null || p.goles_visitante === null) return 'pendiente'
  if (p.goles_local === p.goles_visitante) return 'pendiente'
  const ganador = p.goles_local > p.goles_visitante ? p.equipo_local : p.equipo_visitante
  return pick.equipo === ganador ? 'sobrevive' : 'eliminado'
}

export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { pozoId } = await req.json()
  if (!pozoId) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: pozo } = await supabaseAdmin.from('grupos').select('fases').eq('id', pozoId).maybeSingle()
  if (!pozo) return NextResponse.json({ error: 'pozo' }, { status: 404 })

  const { data: parts } = await supabaseAdmin.from('participantes').select('id').eq('grupo_id', pozoId)
  const ids = ((parts ?? []) as Participante[]).map(p => p.id)
  if (ids.length === 0) return NextResponse.json({ ok: true, actualizados: 0 })

  const { data: partidos } = await supabaseAdmin.from('partidos').select('*').in('fase', pozo.fases)
  const byId: Record<string, Partido> = {}
  for (const p of (partidos ?? []) as Partido[]) byId[p.id] = p

  const { data: picks } = await supabaseAdmin.from('survivor_picks').select('*').in('participante_id', ids)
  let n = 0
  for (const pk of (picks ?? []) as SurvivorPick[]) {
    const est = estado(pk, byId)
    if (est !== 'pendiente' && est !== pk.estado) {
      await supabaseAdmin.from('survivor_picks').update({ estado: est, updated_by: 'admin' }).eq('id', pk.id)
      n++
    }
  }
  return NextResponse.json({ ok: true, actualizados: n })
}
