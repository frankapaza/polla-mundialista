'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { partidoEnVivo } from '@/lib/utils'
import type { Grupo, Participante, Pronostico, Partido } from '@/lib/types'

type RankingRow = Participante & {
  total: number
  exactos: number
  ganadores: number
  infracciones: number
  sparkData: number[]
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const w = 56
  const h = 20
  const max = Math.max(...data, 1)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - (v / max) * h * 0.9 - 1
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="opacity-80 flex-shrink-0">
      <polyline fill="none" stroke="#10b981" strokeWidth="1.5" strokeLinejoin="round" points={pts} />
    </svg>
  )
}

export default function RankingPage() {
  const params = useParams()
  const codigoUpper = (params.codigo as string).toUpperCase()

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [partidosVivos, setPartidosVivos] = useState<Partido[]>([])
  const [loading, setLoading] = useState(true)
  const [flashActualizado, setFlashActualizado] = useState(false)

  const cargarRanking = useCallback(async () => {
    const { data: g } = await supabase.from('grupos').select().eq('codigo', codigoUpper).single()
    if (!g) return

    const { data: participantes } = await supabase
      .from('participantes').select().eq('grupo_id', g.id).order('created_at')

    const ids = (participantes ?? []).map((p: Participante) => p.id)

    const [{ data: pronos }, { data: partidos }] = await Promise.all([
      ids.length > 0
        ? supabase.from('pronosticos').select().in('participante_id', ids)
        : Promise.resolve({ data: [] }),
      supabase.from('partidos').select().order('fecha'),
    ])

    const vivos = (partidos ?? []).filter((p: Partido) =>
      p.fecha && partidoEnVivo(p.fecha) && p.goles_local === null
    )
    setPartidosVivos(vivos as Partido[])

    const partidosConResult = (partidos ?? []).filter((p: Partido) => p.goles_local !== null)

    const calc = (participantes ?? []).map((p: Participante) => {
      const prs = (pronos ?? []).filter((pr: Pronostico) => pr.participante_id === p.id)
      const total = prs.reduce((s: number, pr: Pronostico) => s + (pr.puntos ?? 0), 0)
      const exactos = prs.filter((pr: Pronostico) => pr.puntos === 3).length
      const ganadores = prs.filter((pr: Pronostico) => pr.puntos === 1).length
      const infracciones = prs.filter((pr: Pronostico) => pr.infraccion).length

      let cumulative = 0
      const sparkData = partidosConResult.map((partido: Partido) => {
        const prono = prs.find((pr: Pronostico) => pr.partido_id === partido.id)
        cumulative += prono?.puntos ?? 0
        return cumulative
      })

      return { ...p, total, exactos, ganadores, infracciones, sparkData }
    }).sort((a: RankingRow, b: RankingRow) => b.total - a.total)

    setGrupo(g as Grupo)
    setRanking(calc)
    setLoading(false)
    setFlashActualizado(true)
    setTimeout(() => setFlashActualizado(false), 1500)
  }, [codigoUpper])

  useEffect(() => {
    cargarRanking()

    const channel = supabase
      .channel(`ranking-${codigoUpper}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pronosticos' }, () => cargarRanking())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => cargarRanking())
      .subscribe()

    const interval = setInterval(cargarRanking, 30_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [cargarRanking])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400">Cargando ranking...</div>
    </main>
  )

  if (!grupo) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-white text-xl font-bold mb-2">Grupo no encontrado</p>
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">Volver</Link>
      </div>
    </main>
  )

  const g = grupo
  const hayPuntos = ranking.some(r => r.total > 0)
  const inscripcionesCerradas = g.cierre_inscripciones ? new Date(g.cierre_inscripciones) <= new Date() : false
  const tieneCosto = g.costo_inscripcion > 0
  const totalPagaron = ranking.filter(r => r.pago).length
  const totalPendientes = ranking.length - totalPagaron
  const recaudado = totalPagaron * g.costo_inscripcion
  const hayPartidosVivos = partidosVivos.length > 0
  const haySparklines = ranking.some(r => r.sparkData.length >= 2)

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">Ranking</p>
            <h1 className="text-white font-bold text-lg">{g.nombre}</h1>
          </div>
          <div className="flex gap-2">
            {inscripcionesCerradas && (
              <Link href={`/grupo/${codigoUpper}/dashboard`}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                Dashboard
              </Link>
            )}
            <Link href={`/grupo/${codigoUpper}/pronosticos`}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Mis pronósticos
            </Link>
            <Link href={`/grupo/${codigoUpper}/admin`}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Banner partidos en vivo */}
        {hayPartidosVivos && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl px-4 py-3 mb-4 flex items-center gap-3">
            <span className="text-red-400 animate-pulse text-lg">🔴</span>
            <div>
              <p className="text-red-300 font-semibold text-sm">Partidos en juego ahora</p>
              <p className="text-red-400/70 text-xs">
                {partidosVivos.map(p => `${p.equipo_local} vs ${p.equipo_visitante}`).join(' · ')}
              </p>
            </div>
            <span className={`ml-auto text-xs font-medium transition-all duration-500 ${flashActualizado ? 'text-emerald-400' : 'text-slate-600'}`}>
              ↻ En vivo
            </span>
          </div>
        )}

        {!hayPartidosVivos && flashActualizado && (
          <div className="text-center text-xs text-emerald-500 mb-2 transition-opacity">
            ↻ Actualizado
          </div>
        )}

        {/* Info del grupo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-500">Código para compartir</p>
              <p className="text-emerald-400 font-mono text-sm font-bold">{codigoUpper}</p>
            </div>
            {tieneCosto && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Inscripción</p>
                <p className="text-white font-bold">S/ {g.costo_inscripcion}</p>
              </div>
            )}
            {tieneCosto && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Recaudado</p>
                <p className="text-emerald-400 font-bold">S/ {recaudado.toFixed(2)}</p>
              </div>
            )}
            {tieneCosto && totalPendientes > 0 && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Pendiente de pago</p>
                <p className="text-amber-400 font-bold">{totalPendientes} personas</p>
              </div>
            )}
            {g.cierre_inscripciones && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Cierre inscripciones</p>
                <p className={`text-xs font-medium ${inscripcionesCerradas ? 'text-red-400' : 'text-slate-300'}`}>
                  {inscripcionesCerradas ? '🔒 Cerrado' : new Date(g.cierre_inscripciones).toLocaleString('es-PE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">👥</div>
            <p>Nadie se anotó todavía</p>
            <p className="text-sm mt-1">Compartí el código <span className="text-white font-mono font-bold">{codigoUpper}</span></p>
          </div>
        ) : (
          <div className="space-y-2">
            {!hayPuntos && (
              <p className="text-slate-500 text-xs text-center mb-4">
                Los puntos aparecen cuando se registren resultados de partidos
              </p>
            )}

            {ranking.map((p, i) => (
              <div key={p.id} className={`bg-slate-900 border rounded-xl px-4 py-3.5 transition-all ${
                i === 0 && hayPuntos ? 'border-amber-600/60' :
                i === 1 && hayPuntos ? 'border-slate-500/60' :
                i === 2 && hayPuntos ? 'border-amber-800/60' : 'border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 text-center flex-shrink-0">
                    {i === 0 && hayPuntos ? '🥇' : i === 1 && hayPuntos ? '🥈' : i === 2 && hayPuntos ? '🥉' :
                      <span className="text-slate-500 font-bold text-sm">{i + 1}</span>}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-semibold truncate">{p.nombre}</p>
                      {p.infracciones > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0 bg-red-700 text-white font-bold"
                          title="Editó su pronóstico después de iniciado el partido">
                          🚩 {p.infracciones === 1 ? 'Infracción' : `${p.infracciones} infracciones`}
                        </span>
                      )}
                      {tieneCosto && (
                        <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                          p.pago ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
                        }`}>
                          {p.pago ? '✓ Pagó' : '⏳ Pendiente'}
                        </span>
                      )}
                    </div>
                    {p.prediccion_campeon && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        🏆 <span className="text-slate-400">{p.prediccion_campeon}</span>
                      </p>
                    )}
                  </div>

                  {haySparklines && (
                    <div className="flex-shrink-0 hidden sm:block">
                      <Sparkline data={p.sparkData} />
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-shrink-0 text-right">
                    {hayPuntos && (
                      <>
                        <div className="hidden sm:block text-center">
                          <p className="text-emerald-400 font-bold text-sm">{p.exactos}</p>
                          <p className="text-slate-600 text-xs">exactos</p>
                        </div>
                        <div className="hidden sm:block text-center">
                          <p className="text-blue-400 font-bold text-sm">{p.ganadores}</p>
                          <p className="text-slate-600 text-xs">ganadores</p>
                        </div>
                      </>
                    )}
                    <div className="text-center">
                      <p className="text-white font-bold text-xl">{p.total}</p>
                      <p className="text-slate-500 text-xs">pts</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400 mb-2">Sistema de puntos</p>
          <p>🎯 Resultado exacto: <span className="text-emerald-400 font-bold">3 puntos</span></p>
          <p>✅ Ganador o empate correcto: <span className="text-blue-400 font-bold">1 punto</span></p>
          <p>❌ Incorrecto: <span className="text-slate-500">0 puntos</span></p>
        </div>
      </div>
    </main>
  )
}
