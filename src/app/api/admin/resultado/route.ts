import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'
import { calcularPuntos } from '@/lib/utils'
import type { Pronostico } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { partidoId, golesLocal, golesVisitante } = await req.json()
  const gl = Number(golesLocal), gv = Number(golesVisitante)
  if (!partidoId || ![gl, gv].every(n => Number.isInteger(n) && n >= 0 && n <= 99))
    return NextResponse.json({ error: 'datos' }, { status: 400 })

  await supabaseAdmin.from('partidos').update({ goles_local: gl, goles_visitante: gv, updated_by: 'admin' }).eq('id', partidoId)

  // Recalcular puntos de todos los pronósticos de ese partido (global).
  const { data: pronos } = await supabaseAdmin.from('pronosticos').select('id, goles_local, goles_visitante, infraccion').eq('partido_id', partidoId)
  for (const pr of (pronos ?? []) as Pronostico[]) {
    const puntos = pr.infraccion ? 0 : calcularPuntos(pr.goles_local, pr.goles_visitante, gl, gv)
    await supabaseAdmin.from('pronosticos').update({ puntos }).eq('id', pr.id)
  }
  return NextResponse.json({ ok: true, recalculados: (pronos ?? []).length })
}
