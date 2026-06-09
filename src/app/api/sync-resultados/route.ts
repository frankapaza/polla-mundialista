/**
 * GET /api/sync-resultados
 * Sincroniza resultados desde football-data.org (plan gratuito).
 *
 * Configurar en Vercel Cron (vercel.json) o llamar manualmente:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://tuapp.vercel.app/api/sync-resultados
 *
 * En vercel.json:
 *   { "crons": [{ "path": "/api/sync-resultados", "schedule": "0 * * * *" }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPuntos } from '@/lib/utils'
import type { Partido, Pronostico } from '@/lib/types'

const API_KEY = process.env.FOOTBALL_DATA_API_KEY
const WC_2026_ID = 2000 // ID del Mundial 2026 en football-data.org

export async function GET(req: NextRequest) {
  // Verificar secret para evitar llamadas no autorizadas
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY no configurado' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${WC_2026_ID}/matches?status=FINISHED`,
      { headers: { 'X-Auth-Token': API_KEY } },
    )

    if (!res.ok) {
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const matches = data.matches ?? []

    let actualizados = 0

    for (const match of matches) {
      const homeScore = match.score?.fullTime?.home
      const awayScore = match.score?.fullTime?.away
      if (homeScore === null || awayScore === null) continue

      // Buscar por nombre de equipo (aproximado) o por fecha
      const { data: partidos } = await supabase
        .from('partidos')
        .select()
        .filter('goles_local', 'is', null)

      const partido = (partidos ?? []).find((p: Partido) => {
        const localOk = p.equipo_local.toLowerCase().includes(
          (match.homeTeam?.name ?? '').toLowerCase().substring(0, 4),
        )
        const visitanteOk = p.equipo_visitante.toLowerCase().includes(
          (match.awayTeam?.name ?? '').toLowerCase().substring(0, 4),
        )
        return localOk && visitanteOk
      })

      if (!partido) continue

      await supabase
        .from('partidos')
        .update({ goles_local: homeScore, goles_visitante: awayScore })
        .eq('id', partido.id)

      // Recalcular pronósticos
      const { data: pronos } = await supabase
        .from('pronosticos')
        .select()
        .eq('partido_id', partido.id)

      for (const prono of (pronos ?? []) as Pronostico[]) {
        const puntos = calcularPuntos(prono.goles_local, prono.goles_visitante, homeScore, awayScore)
        await supabase
          .from('pronosticos')
          .update({ puntos, updated_at: new Date().toISOString() })
          .eq('id', prono.id)
      }

      actualizados++
    }

    return NextResponse.json({ ok: true, actualizados })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
