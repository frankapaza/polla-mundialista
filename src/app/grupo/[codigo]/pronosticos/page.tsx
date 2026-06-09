'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatearFecha, partidoYaEmpezó } from '@/lib/utils'
import { flagUrl } from '@/lib/flags'
import type { Partido, Pronostico, Grupo, Participante } from '@/lib/types'

const STORAGE_KEY = (codigo: string) => `polla_participant_${codigo}`
const GRUPOS_TORNEO = ['A','B','C','D','E','F','G','H','I','J','K','L']

interface ScoreInput { local: string; visitante: string }

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
  const [grupoActivo, setGrupoActivo] = useState('A')
  const [matchIndex, setMatchIndex] = useState(0)
  const [loading, setLoading] = useState(true)

  const cargarDatos = useCallback(async () => {
    const stored = localStorage.getItem(STORAGE_KEY(codigo))
    if (!stored) { router.replace(`/grupo/${codigo}`); return }
    const { participanteId } = JSON.parse(stored)

    const [{ data: grupoData }, { data: partData }, { data: particicData }, { data: pronosData }] =
      await Promise.all([
        supabase.from('grupos').select().eq('codigo', codigo).single(),
        supabase.from('partidos').select().eq('fase', 'grupos').order('numero_partido'),
        supabase.from('participantes').select().eq('id', participanteId).single(),
        supabase.from('pronosticos').select().eq('participante_id', participanteId),
      ])

    if (!grupoData) { router.replace(`/grupo/${codigo}`); return }
    setGrupo(grupoData as Grupo)
    setParticipante(particicData as Participante)
    setPartidos((partData ?? []) as Partido[])

    const pronosMap: Record<string, Pronostico> = {}
    const scoresMap: Record<string, ScoreInput> = {}
    for (const p of (pronosData ?? []) as Pronostico[]) {
      pronosMap[p.partido_id] = p
      scoresMap[p.partido_id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
    }
    setPronosticos(pronosMap)
    setScores(scoresMap)
    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargarDatos() }, [cargarDatos])

  // Resetear índice al cambiar de grupo
  useEffect(() => { setMatchIndex(0) }, [grupoActivo])

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

  const partidosPorGrupo = GRUPOS_TORNEO.reduce((acc, g) => {
    acc[g] = partidos.filter(p => p.grupo_torneo === g)
    return acc
  }, {} as Record<string, Partido[]>)

  const matchsActivos = partidosPorGrupo[grupoActivo] ?? []
  const partido = matchsActivos[matchIndex]
  const totalPronos = Object.keys(pronosticos).length
  const cierreInscripciones = grupo?.cierre_inscripciones
  const inscripcionesCerradas = cierreInscripciones ? new Date(cierreInscripciones) <= new Date() : false

  async function irSiguiente() {
    if (partido && !partidoYaEmpezó(partido.fecha)) {
      await guardarPronostico(partido)
    }
    if (matchIndex < matchsActivos.length - 1) {
      setMatchIndex(i => i + 1)
    } else {
      // Pasar al siguiente grupo
      const idx = GRUPOS_TORNEO.indexOf(grupoActivo)
      if (idx < GRUPOS_TORNEO.length - 1) {
        setGrupoActivo(GRUPOS_TORNEO[idx + 1])
      }
    }
  }

  function irAnterior() {
    if (matchIndex > 0) {
      setMatchIndex(i => i - 1)
    } else {
      const idx = GRUPOS_TORNEO.indexOf(grupoActivo)
      if (idx > 0) {
        const prevGrupo = GRUPOS_TORNEO[idx - 1]
        setGrupoActivo(prevGrupo)
        setMatchIndex((partidosPorGrupo[prevGrupo]?.length ?? 1) - 1)
      }
    }
  }

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-slate-400">Cargando pronósticos...</div>
    </main>
  )

  if (!partido) return null

  const empezó = partidoYaEmpezó(partido.fecha)
  const jugado = partido.goles_local !== null
  const sc = scores[partido.id] ?? { local: '', visitante: '' }
  const pron = pronosticos[partido.id]
  const tienePronos = sc.local !== '' && sc.visitante !== ''
  const yaGuardado = savedIds.has(partido.id) || (!!pron && sc.local === String(pron.goles_local) && sc.visitante === String(pron.goles_visitante))
  const esUltimoPartido = grupoActivo === 'L' && matchIndex === matchsActivos.length - 1
  const esUltimoDelGrupo = matchIndex === matchsActivos.length - 1

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
              {totalPronos}/72
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

        {/* Tabs grupos A-L */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {GRUPOS_TORNEO.map(g => (
            <button key={g} onClick={() => setGrupoActivo(g)}
              className={`flex-shrink-0 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                grupoActivo === g ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Progreso dentro del grupo */}
      <div className="max-w-lg mx-auto w-full px-4 pt-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Grupo {grupoActivo}</span>
          <span className="text-slate-500 text-xs">{matchIndex + 1} de {matchsActivos.length}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1 mb-4">
          <div
            className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${((matchIndex + 1) / matchsActivos.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Tarjeta del partido */}
      <div className="flex-1 flex flex-col max-w-lg mx-auto w-full px-4">
        <div className={`bg-slate-900 border rounded-2xl p-6 flex flex-col gap-5 ${
          jugado ? 'border-slate-700' : empezó ? 'border-amber-700/50' : 'border-slate-800'
        }`}>

          {/* Fecha y estado */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{formatearFecha(partido.fecha)}</span>
            {jugado && pron && (
              <span className={`font-bold px-2 py-0.5 rounded ${
                pron.puntos === 3 ? 'bg-emerald-900 text-emerald-300' :
                pron.puntos === 1 ? 'bg-blue-900 text-blue-300' :
                'bg-red-900/50 text-red-400'
              }`}>{pron.puntos} pts</span>
            )}
            {empezó && !jugado && <span className="text-amber-400 font-medium">En juego</span>}
          </div>

          {/* Equipos y marcador */}
          <div className="flex items-center gap-3">
            {/* Local */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <Flag equipo={partido.equipo_local} />
              <span className="text-white font-semibold text-sm text-center leading-tight">{partido.equipo_local}</span>
            </div>

            {/* Inputs / resultado */}
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
              {!empezó && !jugado && (
                <span className={`text-xs font-medium transition-colors ${
                  yaGuardado ? 'text-emerald-400' : tienePronos ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  {yaGuardado ? '✅ Guardado' : tienePronos ? 'Sin guardar' : 'Sin pronóstico'}
                </span>
              )}
            </div>

            {/* Visitante */}
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
            disabled={grupoActivo === 'A' && matchIndex === 0}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors disabled:opacity-30 text-sm">
            ← Anterior
          </button>

          {!empezó && !jugado && tienePronos && !yaGuardado && (
            <button
              onClick={() => guardarPronostico(partido)}
              disabled={saving}
              className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-emerald-400 font-semibold px-4 py-4 rounded-xl transition-colors text-sm">
              {saving ? '...' : 'Guardar'}
            </button>
          )}

          <button
            onClick={irSiguiente}
            disabled={saving || esUltimoPartido}
            className={`flex-1 font-semibold py-4 rounded-xl transition-colors text-sm ${
              esUltimoPartido
                ? 'bg-slate-800 text-slate-500'
                : tienePronos && !yaGuardado && !empezó && !jugado
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}>
            {saving ? 'Guardando...' :
              esUltimoPartido ? '¡Listo! 🏆' :
              esUltimoDelGrupo ? `Grupo ${GRUPOS_TORNEO[GRUPOS_TORNEO.indexOf(grupoActivo) + 1]} →` :
              tienePronos && !yaGuardado && !empezó && !jugado ? 'Guardar y seguir →' : 'Siguiente →'
            }
          </button>
        </div>
      </div>
    </main>
  )
}
