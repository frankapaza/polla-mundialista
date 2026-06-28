'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { flagUrl } from '@/lib/flags'
import { partidoCerrado, nombreFase } from '@/lib/utils'
import type { Grupo, Participante, Partido, Pronostico } from '@/lib/types'

const GRUPOS_TORNEO = ['A','B','C','D','E','F','G','H','I','J','K','L']

function Flag({ equipo }: { equipo: string }) {
  const url = flagUrl(equipo)
  if (!url) return null
  return <img src={url} alt={equipo} className="inline-block w-4 h-auto rounded-sm" />
}

function PuntosBadge({ puntos }: { puntos: number | null | undefined }) {
  if (puntos === null || puntos === undefined) return (
    <span className="text-slate-600 text-xs">-</span>
  )
  if (puntos === 3) return <span className="text-emerald-400 font-bold text-xs">🎯</span>
  if (puntos === 1) return <span className="text-blue-400 font-bold text-xs">✅</span>
  return <span className="text-red-500 font-bold text-xs">✗</span>
}

type ParticipanteConTotal = Participante & { total: number }

export default function DashboardPage() {
  const params = useParams()
  const codigoUpper = (params.codigo as string).toUpperCase()

  const [esAdmin, setEsAdmin] = useState(false)
  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [bloqueado, setBloqueado] = useState(false)
  const [participantes, setParticipantes] = useState<ParticipanteConTotal[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pronosIdx, setPronosIdx] = useState<Record<string, Record<string, Pronostico>>>({})
  // Claves "participanteId:partidoId" de quién YA pronosticó (sin el marcador, para no revelarlo)
  const [tienePronostico, setTienePronostico] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    // Admin = sesión real del panel (misma que protege /admin). Ya no se confía en ?admin=1.
    const admin = typeof window !== 'undefined' && sessionStorage.getItem('polla_admin') === 'true'
    setEsAdmin(admin)

    const { data: g } = await supabase.from('grupos').select().eq('codigo', codigoUpper).single()
    if (!g) { setNotFound(true); setLoading(false); return }

    const grupoData = g as Grupo
    setGrupo(grupoData)

    const inscripcionesCerradas = grupoData.cierre_inscripciones
      ? new Date(grupoData.cierre_inscripciones) <= new Date()
      : false

    if (!inscripcionesCerradas && !admin) {
      setBloqueado(true)
      setLoading(false)
      return
    }
    setBloqueado(false)

    const [{ data: parts }, { data: mats }] = await Promise.all([
      supabase.from('participantes').select().eq('grupo_id', grupoData.id).order('created_at'),
      supabase.from('partidos').select().order('numero_partido'),
    ])

    // Grupos completos + eliminatoria ya programada (con fecha). Las rondas sin
    // cruces definidos (sin fecha) se omiten hasta cargarse.
    const partidosData = ((mats ?? []) as Partido[])
      .filter(p => p.fase === 'grupos' || p.fecha !== null)
    setPartidos(partidosData)

    const ids = (parts ?? []).map((p: Participante) => p.id)

    // Para no-admins solo se traen los pronósticos de partidos ya bloqueados (revelados).
    // Los de partidos futuros NO se descargan: el dato real nunca llega al navegador del jugador.
    const idsRevelados = partidosData.filter(p => partidoCerrado(p.fecha)).map(p => p.id)

    let pronos: Pronostico[] = []
    if (ids.length > 0) {
      if (admin) {
        const { data } = await supabase.from('pronosticos').select().in('participante_id', ids)
        pronos = (data ?? []) as Pronostico[]
      } else if (idsRevelados.length > 0) {
        const { data } = await supabase.from('pronosticos').select()
          .in('participante_id', ids).in('partido_id', idsRevelados)
        pronos = (data ?? []) as Pronostico[]
      }
    }

    const idx: Record<string, Record<string, Pronostico>> = {}
    for (const pr of pronos) {
      if (!idx[pr.participante_id]) idx[pr.participante_id] = {}
      idx[pr.participante_id][pr.partido_id] = pr
    }
    setPronosIdx(idx)

    // Existencia de pronósticos (solo las claves, SIN el marcador) para mostrar
    // quién ya pronosticó en partidos aún no revelados, sin filtrar el resultado.
    const tiene = new Set<string>()
    if (ids.length > 0) {
      const { data: keys } = await supabase.from('pronosticos')
        .select('participante_id, partido_id').in('participante_id', ids)
      for (const k of (keys ?? []) as { participante_id: string; partido_id: string }[]) {
        tiene.add(`${k.participante_id}:${k.partido_id}`)
      }
    }
    setTienePronostico(tiene)

    // Ordenar por puntos. Solo los partidos jugados otorgan puntos, y esos siempre
    // están entre los revelados, así que el total es correcto también para no-admins.
    const ordenados = (parts ?? []).map((p: Participante) => {
      const total = Object.values(idx[p.id] ?? {}).reduce((s, pr) => s + (pr.puntos ?? 0), 0)
      return { ...p, total }
    }).sort((a: ParticipanteConTotal, b: ParticipanteConTotal) => b.total - a.total)
    setParticipantes(ordenados)

    setLoading(false)
  }, [codigoUpper])

  useEffect(() => {
    cargar()
    // Refresco periódico: actualiza puntos y revela partidos a medida que se cumplen las horas
    const interval = setInterval(cargar, 60_000)
    return () => clearInterval(interval)
  }, [cargar])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400">Cargando dashboard...</div>
    </main>
  )

  if (notFound) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <Link href="/" className="text-emerald-400">Volver al inicio</Link>
    </main>
  )

  const g = grupo as Grupo

  if (bloqueado) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard bloqueado</h1>
      <p className="text-slate-400 max-w-sm">
        Los pronósticos de todos se revelan después del cierre de inscripciones.
        {g.cierre_inscripciones && (
          <> Cierra el <strong className="text-white">{new Date(g.cierre_inscripciones).toLocaleString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>.</>
        )}
      </p>
      <Link href={`/grupo/${codigoUpper}/ranking`} className="mt-6 text-emerald-400 hover:text-emerald-300 transition-colors">
        Ver ranking →
      </Link>
    </main>
  )

  // Secciones del dashboard: un bloque por grupo (A..L) y luego un bloque por
  // cada ronda de eliminatoria que ya tenga partidos cargados.
  const FASES_ELIM = ['16avos', 'octavos', 'cuartos', 'semis', 'tercero', 'final']
  const secciones: { titulo: string; matchs: Partido[] }[] = []
  for (const gt of GRUPOS_TORNEO) {
    const matchs = partidos.filter((p: Partido) => p.fase === 'grupos' && p.grupo_torneo === gt)
    if (matchs.length) secciones.push({ titulo: `Grupo ${gt}`, matchs })
  }
  for (const f of FASES_ELIM) {
    const matchs = partidos
      .filter((p: Partido) => p.fase === f)
      .sort((a, b) => a.numero_partido - b.numero_partido)
    if (matchs.length) secciones.push({ titulo: nombreFase(f), matchs })
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-full px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">
              Dashboard de pronósticos{esAdmin && <span className="text-amber-400"> · modo admin 👑</span>}
            </p>
            <h1 className="text-white font-bold text-lg">{g.nombre}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/grupo/${codigoUpper}/ranking`}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Ranking
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        <p className="text-slate-500 text-xs mb-2">
          {participantes.length} participantes · 🎯 exacto · ✅ ganador/empate · ✗ incorrecto
        </p>
        <p className="text-slate-600 text-xs mb-4">
          {esAdmin
            ? '👑 Como admin ves todos los pronósticos. Para los jugadores, el marcador se revela 5 min antes de cada partido.'
            : 'Antes de cada partido: ✓ = ya pronosticó · "falta" = todavía no (así sabés a quién recordarle). El marcador real se muestra 5 min antes de que empiece.'}
        </p>

        {secciones.map(seccion => {
          const matchs = seccion.matchs

          return (
            <div key={seccion.titulo} className="mb-8">
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                {seccion.titulo}
              </h2>

              {/* Tabla scrollable */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      {/* Columna de partido */}
                      <th className="sticky left-0 bg-slate-900 px-3 py-2 text-left text-slate-400 font-semibold min-w-[180px] z-10">
                        Partido
                      </th>
                      <th className="px-2 py-2 text-slate-500 font-medium whitespace-nowrap">
                        Resultado
                      </th>
                      {participantes.map((p: ParticipanteConTotal) => (
                        <th key={p.id} className="px-2 py-2 text-slate-300 font-medium whitespace-nowrap max-w-[80px] truncate">
                          <div className="truncate max-w-[80px]" title={p.nombre}>
                            {p.nombre.split(' ')[0]}
                          </div>
                          <div className="text-emerald-500 font-bold">{p.total}pts</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matchs.map((partido: Partido, idx: number) => {
                      const jugado = partido.goles_local !== null
                      // Se revela cuando se bloquea (1h antes del inicio) o si sos admin
                      const revelar = partidoCerrado(partido.fecha) || esAdmin
                      return (
                        <tr key={partido.id}
                          className={`border-b border-slate-800/50 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/60'}`}>
                          {/* Partido */}
                          <td className="sticky left-0 bg-inherit px-3 py-2.5 z-10">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Flag equipo={partido.equipo_local} />
                              <span className="text-white font-medium">{partido.equipo_local.split(' ')[0]}</span>
                              <span className="text-slate-600">vs</span>
                              <Flag equipo={partido.equipo_visitante} />
                              <span className="text-white font-medium">{partido.equipo_visitante.split(' ')[0]}</span>
                            </div>
                          </td>

                          {/* Resultado real */}
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            {jugado ? (
                              <span className="text-emerald-400 font-bold">
                                {partido.goles_local}-{partido.goles_visitante}
                              </span>
                            ) : (
                              <span className="text-slate-600">–</span>
                            )}
                          </td>

                          {/* Pronósticos por participante */}
                          {participantes.map((p: ParticipanteConTotal) => {
                            if (!revelar) {
                              // Oculto: no se descarga el marcador, solo si YA pronosticó.
                              const yaPronostico = tienePronostico.has(`${p.id}:${partido.id}`)
                              return (
                                <td key={p.id} className="px-2 py-2.5 text-center whitespace-nowrap">
                                  {yaPronostico ? (
                                    <span className="text-emerald-500 font-bold"
                                      title="Ya tiene pronóstico (se revela 5 min antes del partido)">✓</span>
                                  ) : (
                                    <span className="text-amber-500/80 text-[10px] font-semibold"
                                      title="Todavía sin pronóstico">falta</span>
                                  )}
                                </td>
                              )
                            }
                            const pron = pronosIdx[p.id]?.[partido.id]
                            return (
                              <td key={p.id} className="px-2 py-2.5 text-center whitespace-nowrap">
                                {pron ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`font-semibold ${
                                      jugado
                                        ? pron.puntos === 3 ? 'text-emerald-400'
                                        : pron.puntos === 1 ? 'text-blue-400'
                                        : 'text-red-400'
                                        : 'text-slate-300'
                                    }`}>
                                      {pron.goles_local}-{pron.goles_visitante}
                                    </span>
                                    {jugado && <PuntosBadge puntos={pron.puntos} />}
                                  </div>
                                ) : (
                                  <span className="text-slate-700">–</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
