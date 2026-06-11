/**
 * GET /api/sync-resultados
 * Sincroniza resultados desde football-data.org (plan gratuito) — best effort.
 *
 * Disparo (cualquiera de las dos formas):
 *   - Header:  Authorization: Bearer <CRON_SECRET>
 *   - Query:   /api/sync-resultados?secret=<CRON_SECRET>
 *
 * Cron externo (ej. cron-job.org) cada hora apuntando a:
 *   https://tuapp.vercel.app/api/sync-resultados?secret=<CRON_SECRET>
 *
 * Nota: el plan gratuito de football-data suele marcar el partido FINISHED pero
 * con el marcador en null (delay). Por eso esto es "best effort": solo actualiza
 * los partidos que ya traen goles. Los resultados en vivo se cargan a mano.
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calcularPuntos } from '@/lib/utils'
import type { Partido, Pronostico } from '@/lib/types'

const API_KEY = process.env.FOOTBALL_DATA_API_KEY
const WC_CODE = 'WC' // FIFA World Cup en football-data.org

// Nombre del equipo en la API (inglés) → nombre en la app (español)
const EQUIPOS_MAP: Record<string, string> = {
  'Algeria': 'Argelia',
  'Argentina': 'Argentina',
  'Australia': 'Australia',
  'Austria': 'Austria',
  'Belgium': 'Bélgica',
  'Bosnia-Herzegovina': 'Bosnia y Herzegovina',
  'Brazil': 'Brasil',
  'Canada': 'Canadá',
  'Cape Verde Islands': 'Cabo Verde',
  'Colombia': 'Colombia',
  'Congo DR': 'Congo RD',
  'Croatia': 'Croacia',
  'Curaçao': 'Curazao',
  'Czechia': 'Chequia',
  'Ecuador': 'Ecuador',
  'Egypt': 'Egipto',
  'England': 'Inglaterra',
  'France': 'Francia',
  'Germany': 'Alemania',
  'Ghana': 'Ghana',
  'Haiti': 'Haití',
  'Iran': 'Irán',
  'Iraq': 'Iraq',
  'Ivory Coast': 'Costa de Marfil',
  'Japan': 'Japón',
  'Jordan': 'Jordania',
  'Mexico': 'México',
  'Morocco': 'Marruecos',
  'Netherlands': 'Países Bajos',
  'New Zealand': 'Nueva Zelanda',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguay',
  'Portugal': 'Portugal',
  'Qatar': 'Catar',
  'Saudi Arabia': 'Arabia Saudita',
  'Scotland': 'Escocia',
  'Senegal': 'Senegal',
  'South Africa': 'Sudáfrica',
  'South Korea': 'Corea del Sur',
  'Spain': 'España',
  'Sweden': 'Suecia',
  'Switzerland': 'Suiza',
  'Tunisia': 'Túnez',
  'Turkey': 'Turquía',
  'United States': 'Estados Unidos',
  'Uruguay': 'Uruguay',
  'Uzbekistan': 'Uzbekistán',
}

export async function GET(req: NextRequest) {
  // Verificar secret (por header o por query) para evitar llamadas no autorizadas
  const secret = process.env.CRON_SECRET
  if (secret) {
    const authHeader = req.headers.get('authorization')
    const fromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const fromQuery = req.nextUrl.searchParams.get('secret')
    if (fromHeader !== secret && fromQuery !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!API_KEY) {
    return NextResponse.json({ error: 'FOOTBALL_DATA_API_KEY no configurado' }, { status: 500 })
  }

  try {
    const res = await fetch(
      `https://api.football-data.org/v4/competitions/${WC_CODE}/matches?status=FINISHED`,
      { headers: { 'X-Auth-Token': API_KEY } },
    )

    if (!res.ok) {
      return NextResponse.json({ error: `API error: ${res.status}` }, { status: 502 })
    }

    const data = await res.json()
    const matches = data.matches ?? []

    // Partidos de la app aún sin resultado cargado
    const { data: partidosPend } = await supabase
      .from('partidos')
      .select()
      .filter('goles_local', 'is', null)
    const pendientes = (partidosPend ?? []) as Partido[]

    let actualizados = 0
    const sinMarcador: string[] = []

    for (const match of matches) {
      const homeScore = match.score?.fullTime?.home
      const awayScore = match.score?.fullTime?.away

      // Mapear nombres inglés → español
      const local = EQUIPOS_MAP[match.homeTeam?.name]
      const visitante = EQUIPOS_MAP[match.awayTeam?.name]
      if (!local || !visitante) continue // eliminatoria con placeholders, etc.

      // best effort: si la fuente aún no tiene el marcador, lo saltamos
      if (homeScore === null || homeScore === undefined ||
          awayScore === null || awayScore === undefined) {
        sinMarcador.push(`${local} vs ${visitante}`)
        continue
      }

      const partido = pendientes.find(p =>
        p.equipo_local === local && p.equipo_visitante === visitante,
      )
      if (!partido) continue // ya cargado o no existe en la app

      await supabase
        .from('partidos')
        .update({ goles_local: homeScore, goles_visitante: awayScore })
        .eq('id', partido.id)

      // Recalcular pronósticos de ese partido
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

    return NextResponse.json({
      ok: true,
      actualizados,
      finished_en_api: matches.length,
      finished_sin_marcador: sinMarcador.length,
      detalle_sin_marcador: sinMarcador,
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
