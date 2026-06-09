'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatearFecha, partidoYaEmpezó, partidoCerrado, formatearCountdown, semaforoColor } from '@/lib/utils'
import { flagUrl } from '@/lib/flags'
import type { Partido, Pronostico, Grupo, Participante } from '@/lib/types'

const STORAGE_KEY = (codigo: string) => `polla_participant_${codigo}`

interface ScoreInput { local: string; visitante: string }

const SEMAFORO_STYLES = {
  red:    { badge: 'bg-red-900/40 text-red-400 border border-red-700/50', dot: 'bg-red-500 animate-pulse', label: 'text-red-400' },
  yellow: { badge: 'bg-amber-900/40 text-amber-400 border border-amber-700/50', dot: 'bg-amber-400', label: 'text-amber-400' },
  green:  { badge: 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/40', dot: 'bg-emerald-500', label: 'text-emerald-400' },
  closed: { badge: 'bg-slate-800 text-slate-500 border border-slate-700', dot: 'bg-slate-600', label: 'text-slate-500' },
  open:   { badge: 'bg-slate-800 text-slate-400 border border-slate-700', dot: 'bg-slate-500', label: 'text-slate-400' },
}

function Flag({ equipo }: { equipo: string }) {
  const url = flagUrl(equipo)
  if (!url) return null
  return <img src={url} alt={equipo} className="inline-block w-7 h-auto rounded-sm shadow-sm" loading="lazy" />
}

export default function PronosticosPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [participante, setParticipante] = useState<Participante | null>(null)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pronosticos, setPronosticos] = useState<Record<string, Pronostico>>({})
  const [scores, setScores] = useState<Record<string, ScoreInput>>({})
  const [saving, setSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [matchIndex, setMatchIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mostrarLista, setMostrarLista] = useState(false)
  const [, setTick] = useState(0)
  const [bannerRetomar, setBannerRetomar] = useState('')

  // Ticker por segundo para countdowns en tiempo real
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  const cargarDatos = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEY(codigo))
    if (!stored) { router.replace(`/grupo/${codigo}`); return }
    const { participanteId } = JSON.parse(stored)

    const [{ data: grupoData }, { data: partData }, { data: particicData }, { data: pronosData }] =
      await Promise.all([
        supabase.from('grupos').select().eq('codigo', codigo).single(),
        supabase.from('partidos').select().eq('fase', 'grupos').order('fecha').order('numero_partido'),
        supabase.from('participantes').select().eq('id', participanteId).single(),
        supabase.from('pronosticos').select().eq('participante_id', participanteId),
      ])

    if (!grupoData) { router.replace(`/grupo/${codigo}`); return }
    setGrupo(grupoData as Grupo)
    setParticipante(particicData as Participante)

    const sorted = ((partData ?? []) as Partido[]).sort((a, b) => {
      if (!a.fecha) return 1
      if (!b.fecha) return -1
      return new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
    })
    setPartidos(sorted)

    const pronosMap: Record<string, Pronostico> = {}
    const scoresMap: Record<string, ScoreInput> = {}
    for (const p of (pronosData ?? []) as Pronostico[]) {
      pronosMap[p.partido_id] = p
      scoresMap[p.partido_id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
    }
    setPronosticos(pronosMap)
    setScores(scoresMap)

    const primerPendiente = sorted.findIndex(p =>
      !partidoCerrado(p.fecha) && !pronosMap[p.id]
    )
    const idx = primerPendiente >= 0 ? primerPendiente : 0
    setMatchIndex(idx)

    const conPronos = Object.keys(pronosMap).length
    if (conPronos > 0) {
      if (primerPendiente > 0) {
        setBannerRetomar(`✓ Tenés ${conPronos} pronósticos guardados · Continuás en el partido #${primerPendiente + 1}`)
      } else if (primerPendiente === -1) {
        setBannerRetomar(`🏆 ¡Todos tus pronósticos están listos! (${conPronos}/${sorted.length})`)
      }
      setTimeout(() => setBannerRetomar(''), 5000)
    }

    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  function setScore(partidoId: string, side: 'local' | 'visitante', val: string) {
    const num = val.replace(/\D/g, '').slice(0, 2)
    setScores(prev => ({ ...prev, [partidoId]: { ...(prev[partidoId] ?? { local: '', visitante: '' }), [side]: num } }))
    setSavedIds(prev => { const s = new Set(prev); s.delete(partidoId); return s })
  }

  async function guardarPronostico(partido: Partido): Promise<boolean> {
    const sc = scores[partido.id]
    if (sc?.local === '' || sc?.local === undefined) return false
    if (sc?.visitante === '' || sc?.visitante === undefined) return false
    if (!participante) return false

    setSaving(true)
    const gl = parseInt(sc.local)
    const gv = parseInt(sc.visitante)
    const existing = pronosticos[partido.id]

    let error
    if (existing) {
      ({ error } = await supabase.from('pronosticos')
        .update({ goles_local: gl, goles_visitante: gv, puntos: null, updated_at: new Date().toISOString() })
        .eq('id', existing.id))
    } else {
      ({ error } = await supabase.from('pronosticos')
        .insert({ participante_id: participante.id, partido_id: partido.id, goles_local: gl, goles_visitante: gv }))
    }

    setSaving(false)
    if (!error) {
      setSavedIds(prev => new Set(prev).add(partido.id))
      setPronosticos(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], goles_local: gl, goles_visitante: gv } }))
      return true
    }
    return false
  }

  const partido = partidos[matchIndex]
  const totalPronos = Object.keys(pronosticos).length
  const cierreInscripciones = grupo?.cierre_inscripciones
  const inscripcionesCerradas = cierreInscripciones ? new Date(cierreInscripciones) <= new Date() : false

  async function irSiguiente() {
    if (partido && !partidoCerrado(partido.fecha)) {
      await guardarPronostico(partido)
    }
    if (matchIndex < partidos.length - 1) setMatchIndex(i => i + 1)
  }

  function irAnterior() {
    if (matchIndex > 0) setMatchIndex(i => i - 1)
  }

  // Auto-save: keeps a ref to the latest guardarPronostico to avoid stale closures
  const guardarRef = useRef(guardarPronostico)
  guardarRef.current = guardarPronostico

  // Derived key: changes whenever the current match or its scores change
  const currentScoreStr = `${matchIndex}:${scores[partidos[matchIndex]?.id]?.local ?? ''}:${scores[partidos[matchIndex]?.id]?.visitante ?? ''}`

  // When both inputs are filled, auto-save after 1.2s with no further changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const p = partidos[matchIndex]
    if (!p || !participante) return
    if (partidoCerrado(p.fecha)) return
    const sc = scores[p.id]
    if (!sc || sc.local === '' || sc.visitante === '') return
    const pron = pronosticos[p.id]
    if (pron && sc.local === String(pron.goles_local) && sc.visitante === String(pron.goles_visitante)) return
    const timer = setTimeout(() => guardarRef.current(p), 1200)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScoreStr])

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400">Cargando pronósticos...</div>
    </main>
  )

  if (!partido) return null

  const cerrado = partidoCerrado(partido.fecha)
  const empezó = partidoYaEmpezó(partido.fecha)
  const jugado = partido.goles_local !== null
  const sc = scores[partido.id] ?? { local: '', visitante: '' }
  const pron = pronosticos[partido.id]
  const tienePronos = sc.local !== '' && sc.visitante !== ''
  const yaGuardado = savedIds.has(partido.id) || (!!pron && sc.local === String(pron.goles_local) && sc.visitante === String(pron.goles_visitante))
  const esUltimo = matchIndex === partidos.length - 1
  const countdown = formatearCountdown(partido.fecha)
  const color = semaforoColor(partido.fecha)
  const estilos = SEMAFORO_STYLES[color]

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-500">{grupo?.nombre}</div>
            <div className="text-white font-semibold text-sm">{participante?.nombre}</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded-full">
              {totalPronos}/{partidos.length}
            </span>
            {inscripcionesCerradas && (
              <Link href={`/grupo/${codigo}/dashboard`}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                Dashboard
              </Link>
            )}
            <Link href={`/grupo/${codigo}/ranking`}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Ranking
            </Link>
          </div>
        </div>
      </div>

      {/* Banner retomar */}
      {bannerRetomar && (
        <div className="max-w-lg mx-auto w-full px-4 pt-3">
          <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-lg px-4 py-2.5 text-emerald-400 text-xs text-center font-medium">
            {bannerRetomar}
          </div>
        </div>
      )}

      {/* Progreso global */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
            Grupo {partido.grupo_torneo}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMostrarLista(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2 transition-colors">
              {mostrarLista ? 'Ocultar lista' : 'Ver todos'}
            </button>
            <span className="text-slate-500 text-xs">{matchIndex + 1} de {partidos.length}</span>
          </div>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 mb-4">
          <div
            className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${((matchIndex + 1) / partidos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Lista completa de partidos (desplegable) */}
      {mostrarLista && (
        <div className="max-w-lg mx-auto w-full px-4 mb-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 text-xs text-slate-500 font-semibold uppercase tracking-wider">
              Todos los partidos
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800">
              {partidos.map((p, i) => {
                const c = semaforoColor(p.fecha)
                const cd = formatearCountdown(p.fecha)
                const tieneP = !!pronosticos[p.id]
                const est = SEMAFORO_STYLES[c]
                const jugadoP = p.goles_local !== null
                return (
                  <button
                    key={p.id}
                    onClick={() => { setMatchIndex(i); setMostrarLista(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800/50 transition-colors text-left ${i === matchIndex ? 'bg-slate-800/70' : ''}`}>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${est.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-300 truncate">
                        {p.equipo_local} vs {p.equipo_visitante}
                        <span className="text-slate-600 ml-1">· G{p.grupo_torneo}</span>
                      </div>
                      <div className="text-xs text-slate-600">{formatearFecha(p.fecha)}</div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {jugadoP ? (
                        <span className="text-xs text-slate-500">{p.goles_local}-{p.goles_visitante}</span>
                      ) : c === 'closed' ? (
                        <span className="text-xs text-slate-600">🔒</span>
                      ) : cd ? (
                        <span className={`text-xs font-mono font-semibold ${est.label}`}>{cd}</span>
                      ) : null}
                      {tieneP && !jugadoP && (
                        <div className="text-xs text-emerald-500">✓</div>
                      )}
                      {!tieneP && c !== 'closed' && !jugadoP && (
                        <div className="text-xs text-slate-600">—</div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta del partido */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4">
        <div className={`bg-slate-900 border rounded-2xl p-6 flex flex-col gap-5 ${
          jugado ? 'border-slate-700' :
          empezó ? 'border-amber-700/50' :
          color === 'red' ? 'border-red-700/50' :
          color === 'yellow' ? 'border-amber-600/40' :
          color === 'green' ? 'border-emerald-700/30' :
          'border-slate-800'
        }`}>

          {/* Fecha y estado */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatearFecha(partido.fecha)}</span>
            <div className="flex items-center gap-2">
              {jugado && pron && (
                <span className={`font-bold px-2 py-0.5 rounded ${
                  pron.puntos === 3 ? 'bg-emerald-900 text-emerald-300' :
                  pron.puntos === 1 ? 'bg-blue-900 text-blue-300' :
                  'bg-red-900/50 text-red-400'
                }`}>{pron.puntos} pts</span>
              )}
              {empezó && !jugado && <span className="text-amber-400 font-medium animate-pulse">🔴 En juego</span>}
              {cerrado && !empezó && !jugado && (
                <span className="text-slate-500 font-medium">🔒 Cerrado</span>
              )}
            </div>
          </div>

          {/* Badge semáforo con countdown */}
          {!cerrado && !empezó && !jugado && countdown && (
            <div className={`flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold ${estilos.badge}`}>
              <span className={`w-2 h-2 rounded-full ${estilos.dot}`} />
              ⏰ Cierra en {countdown}
            </div>
          )}

          {/* Equipos y marcador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col items-center gap-2">
              <Flag equipo={partido.equipo_local} />
              <span className="text-white font-semibold text-sm text-center leading-tight">{partido.equipo_local}</span>
            </div>

            <div className="flex flex-col items-center gap-2 flex-shrink-0">
              {jugado ? (
                <div className="flex items-center gap-2">
                  <span className="text-white font-bold text-3xl w-10 text-center">{partido.goles_local}</span>
                  <span className="text-slate-500 text-xl">-</span>
                  <span className="text-white font-bold text-3xl w-10 text-center">{partido.goles_visitante}</span>
                </div>
              ) : empezó ? (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-3xl w-10 text-center">{pron ? String(pron.goles_local) : '?'}</span>
                  <span className="text-slate-500 text-xl">-</span>
                  <span className="text-slate-400 font-bold text-3xl w-10 text-center">{pron ? String(pron.goles_visitante) : '?'}</span>
                </div>
              ) : cerrado ? (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold text-3xl w-10 text-center ${pron ? 'text-slate-400' : 'text-slate-700'}`}>
                      {pron ? String(pron.goles_local) : '-'}
                    </span>
                    <span className="text-slate-500 text-xl">-</span>
                    <span className={`font-bold text-3xl w-10 text-center ${pron ? 'text-slate-400' : 'text-slate-700'}`}>
                      {pron ? String(pron.goles_visitante) : '-'}
                    </span>
                  </div>
                  {!pron && <span className="text-slate-600 text-xs">Sin pronóstico</span>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input type="text" inputMode="numeric" value={sc.local}
                    onChange={e => setScore(partido.id, 'local', e.target.value)}
                    placeholder="0"
                    className="w-14 h-14 bg-slate-800 border-2 border-slate-600 rounded-xl text-center text-white font-bold text-2xl focus:outline-none focus:border-emerald-500 transition-colors" />
                  <span className="text-slate-500 font-bold text-xl">-</span>
                  <input type="text" inputMode="numeric" value={sc.visitante}
                    onChange={e => setScore(partido.id, 'visitante', e.target.value)}
                    placeholder="0"
                    className="w-14 h-14 bg-slate-800 border-2 border-slate-600 rounded-xl text-center text-white font-bold text-2xl focus:outline-none focus:border-emerald-500 transition-colors" />
                </div>
              )}
              {jugado && pron && (
                <span className="text-slate-500 text-xs">Mi pronóstico: {pron.goles_local}-{pron.goles_visitante}</span>
              )}
              {!empezó && !cerrado && (
                <span className={`text-xs font-medium transition-colors ${
                  yaGuardado ? 'text-emerald-400' : tienePronos ? 'text-amber-400' : 'text-slate-600'
                }`}>
                  {yaGuardado ? '✅ Guardado' : tienePronos ? '⚠ Sin guardar — presioná Guardar y seguir' : 'Sin pronóstico'}
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col items-center gap-2">
              <Flag equipo={partido.equipo_visitante} />
              <span className="text-white font-semibold text-sm text-center leading-tight">{partido.equipo_visitante}</span>
            </div>
          </div>
        </div>

        {/* Botones navegación */}
        <div className="flex gap-3 mt-4 pb-8">
          <button
            onClick={irAnterior}
            disabled={matchIndex === 0}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-30 text-sm">
            ← Anterior
          </button>

          {!empezó && !cerrado && tienePronos && !yaGuardado && (
            <button
              onClick={() => guardarPronostico(partido)}
              disabled={saving}
              className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-emerald-400 font-semibold px-4 py-4 rounded-xl transition-colors text-sm">
              {saving ? '...' : 'Guardar'}
            </button>
          )}

          <button
            onClick={irSiguiente}
            disabled={saving || esUltimo}
            className={`flex-1 font-semibold py-4 rounded-xl transition-colors text-sm ${
              esUltimo
                ? 'bg-slate-800 text-slate-500'
                : tienePronos && !yaGuardado && !cerrado && !empezó && !jugado
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}>
            {saving ? 'Guardando...' : esUltimo ? '¡Listo! 🏆' : tienePronos && !yaGuardado && !cerrado && !empezó && !jugado ? 'Guardar y seguir →' : 'Siguiente →'}
          </button>
        </div>
      </div>
    </main>
  )
}
