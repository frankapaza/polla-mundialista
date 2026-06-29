'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/common/AppShell'
import { Cargando } from '@/components/common/Cargando'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Flag } from '@/components/common/Flag'
import {
  formatearFecha, partidoYaEmpezó, partidoCerrado, formatearCountdown,
  fechaCierre, etiquetaPartido,
} from '@/lib/utils'
import {
  fetchLiga, fetchPozos, getLigaSession, verificarSesion, elegirPozoActivo, clearLigaSession,
} from '@/lib/liga'
import type { Liga, Pozo, Partido, Pronostico, Participante } from '@/lib/types'

interface ScoreInput { local: string; visitante: string }

export default function PrediccionesPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [participante, setParticipante] = useState<Participante | null>(null)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pronosticos, setPronosticos] = useState<Record<string, Pronostico>>({})
  const [scores, setScores] = useState<Record<string, ScoreInput>>({})
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [matchIndex, setMatchIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => {
    const i = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(i)
  }, [])

  const cargar = useCallback(async () => {
    const sess = await verificarSesion(codigo)
    if (!sess) { router.replace(`/liga/${codigo}`); return }
    const l = await fetchLiga(codigo)
    if (!l) { router.replace(`/liga/${codigo}`); return }
    setLiga(l)

    const pozos = await fetchPozos(l.id)
    const activo = elegirPozoActivo(pozos, codigo)
    if (!activo) { router.replace(`/liga/${codigo}/grupos`); return }
    setPozo(activo)

    // ¿Está inscrito en este pozo?
    const { data: part } = await supabase.from('participantes').select()
      .eq('grupo_id', activo.id).eq('documento', sess.documento).maybeSingle()
    if (!part) { router.replace(`/liga/${codigo}/grupos`); return }
    setParticipante(part as Participante)

    // Partidos de las fases del pozo, ya programados (con fecha).
    const { data: partData } = await supabase.from('partidos').select()
      .in('fase', activo.fases).not('fecha', 'is', null).order('fecha').order('numero_partido')
    const sorted = (partData ?? []) as Partido[]
    setPartidos(sorted)

    const { data: pronosData } = await supabase.from('pronosticos').select()
      .eq('participante_id', (part as Participante).id)
    const pmap: Record<string, Pronostico> = {}
    const smap: Record<string, ScoreInput> = {}
    for (const p of (pronosData ?? []) as Pronostico[]) {
      pmap[p.partido_id] = p
      smap[p.partido_id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
    }
    setPronosticos(pmap); setScores(smap)

    const pendiente = sorted.findIndex(p => !partidoCerrado(p.fecha) && !pmap[p.id])
    setMatchIndex(pendiente >= 0 ? pendiente : 0)
    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  function setScore(id: string, side: 'local' | 'visitante', val: string) {
    const num = val.replace(/\D/g, '').slice(0, 2)
    setScores(prev => ({ ...prev, [id]: { ...(prev[id] ?? { local: '', visitante: '' }), [side]: num } }))
    setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }
  function step(id: string, side: 'local' | 'visitante', delta: number) {
    const cur = scores[id]?.[side]
    const n = Math.max(0, Math.min(99, (cur === '' || cur === undefined ? 0 : parseInt(cur)) + delta))
    setScore(id, side, String(n))
  }

  const guardar = useCallback(async (partido: Partido): Promise<boolean> => {
    const sc = scores[partido.id]
    if (!sc || sc.local === '' || sc.visitante === '') return false
    if (!participante) return false
    const gl = parseInt(sc.local), gv = parseInt(sc.visitante)
    if (gl > 5 || gv > 5) {
      const ok = window.confirm(`⚠ Marcador inusual\n\n${partido.equipo_local} ${gl} - ${gv} ${partido.equipo_visitante}\n\n¿Confirmás que querés guardar este resultado?`)
      if (!ok) return false
    }
    setSaving(true)
    const r = await fetch('/api/pronostico', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participanteId: participante.id, partidoId: partido.id, golesLocal: gl, golesVisitante: gv }),
    })
    setSaving(false)
    if (r.status === 401) { clearLigaSession(codigo); router.replace(`/liga/${codigo}`); return false }
    if (r.ok) {
      setSavedIds(prev => new Set(prev).add(partido.id))
      setPronosticos(prev => ({ ...prev, [partido.id]: { ...prev[partido.id], goles_local: gl, goles_visitante: gv } as Pronostico }))
      return true
    }
    return false
  }, [scores, participante, pronosticos])

  const guardarRef = useRef(guardar)
  guardarRef.current = guardar
  const cur = partidos[matchIndex]
  const curKey = `${matchIndex}:${scores[cur?.id]?.local ?? ''}:${scores[cur?.id]?.visitante ?? ''}`
  useEffect(() => {
    const p = partidos[matchIndex]
    if (!p || partidoCerrado(p.fecha)) return
    const sc = scores[p.id]
    if (!sc || sc.local === '' || sc.visitante === '') return
    const pron = pronosticos[p.id]
    if (pron && sc.local === String(pron.goles_local) && sc.visitante === String(pron.goles_visitante)) return
    if (parseInt(sc.local) > 5 || parseInt(sc.visitante) > 5) return
    const t = setTimeout(() => guardarRef.current(p), 1200)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curKey])

  async function siguiente() {
    if (cur && !partidoCerrado(cur.fecha)) await guardar(cur)
    if (matchIndex < partidos.length - 1) setMatchIndex(i => i + 1)
  }

  if (loading) return <Cargando />

  const totalPuntos = Object.values(pronosticos).reduce((s, p) => s + (p.puntos ?? 0), 0)
  const hechos = Object.keys(pronosticos).length
  const sess = getLigaSession(codigo)
  const right = (
    <>
      <Badge tone="gold">{totalPuntos} pts</Badge>
      <span className="w-9 h-9 rounded-full bg-pool-line border border-white/10 flex items-center justify-center font-condensed font-extrabold text-sm text-pool-muted-2">
        {(sess?.nombre ?? '?').slice(0, 2).toUpperCase()}
      </span>
    </>
  )

  const body = () => {
    if (!cur) return (
      <Card className="p-8 text-center text-pool-muted">No hay partidos disponibles en este pozo todavía.</Card>
    )
    const cerrado = partidoCerrado(cur.fecha)
    const empezó = partidoYaEmpezó(cur.fecha)
    const jugado = cur.goles_local !== null
    const sc = scores[cur.id] ?? { local: '', visitante: '' }
    const pron = pronosticos[cur.id]
    const countdown = formatearCountdown(cur.fecha)
    const guardado = savedIds.has(cur.id) || (!!pron && sc.local === String(pron.goles_local) && sc.visitante === String(pron.goles_visitante))
    const editable = !cerrado && !empezó && !jugado

    return (
      <>
        <div className="flex items-center justify-between mb-2">
          <span className="font-condensed font-bold text-xs uppercase tracking-widest text-pool-muted-2">{etiquetaPartido(cur)}</span>
          <span className="text-pool-muted text-xs">{matchIndex + 1} de {partidos.length}</span>
        </div>
        <div className="w-full bg-white/10 rounded-full h-1 mb-4">
          <div className="bg-pool-green h-1 rounded-full transition-all" style={{ width: `${((matchIndex + 1) / partidos.length) * 100}%` }} />
        </div>

        <Card accent={editable} className="p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between text-xs text-pool-muted">
            <span>{formatearFecha(cur.fecha)}</span>
            {jugado && pron ? (
              <span className={`font-condensed font-bold px-2 py-0.5 rounded ${pron.puntos === 3 ? 'bg-pool-green/20 text-pool-green' : pron.puntos === 1 ? 'bg-blue-900 text-blue-300' : 'bg-red-900/50 text-red-400'}`}>{pron.puntos} pts</span>
            ) : empezó && !jugado ? (
              <span className="text-pool-gold font-medium animate-pulse">🔴 En juego</span>
            ) : cerrado ? (
              <span className="text-pool-muted">🔒 Cerrado</span>
            ) : countdown ? (
              <Badge tone="green"><span className="w-1.5 h-1.5 rounded-full bg-pool-green animate-pulse-dot" />Cierra en {countdown}</Badge>
            ) : (
              <span className="text-pool-muted text-[11px]">🔒 Cierra: {fechaCierre(cur.fecha)}</span>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <TeamSide equipo={cur.equipo_local} />
            <div className="flex flex-col items-center gap-3">
              {jugado ? (
                <Marcador a={cur.goles_local} b={cur.goles_visitante} />
              ) : editable ? (
                <div className="flex items-center gap-3">
                  <Stepper value={sc.local} onStep={d => step(cur.id, 'local', d)} onType={v => setScore(cur.id, 'local', v)} />
                  <span className="text-pool-muted font-condensed font-bold text-xl">-</span>
                  <Stepper value={sc.visitante} onStep={d => step(cur.id, 'visitante', d)} onType={v => setScore(cur.id, 'visitante', v)} />
                </div>
              ) : (
                <Marcador a={pron ? pron.goles_local : null} b={pron ? pron.goles_visitante : null} muted />
              )}
              {editable && (
                <span className={`text-xs font-medium ${guardado ? 'text-pool-green' : sc.local !== '' && sc.visitante !== '' ? 'text-pool-gold' : 'text-pool-muted'}`}>
                  {guardado ? '✅ Guardado' : sc.local !== '' && sc.visitante !== '' ? '⚠ Sin guardar' : 'Sin pronóstico'}
                </span>
              )}
            </div>
            <TeamSide equipo={cur.equipo_visitante} />
          </div>

          {editable && (
            <Button size="lg" disabled={saving} onClick={() => guardar(cur)} className="w-full">
              Guardar predicción
            </Button>
          )}
        </Card>

        <div className="flex gap-3 mt-4">
          <Button variant="ghost" className="flex-1" disabled={matchIndex === 0} onClick={() => setMatchIndex(i => Math.max(0, i - 1))}>← Anterior</Button>
          <Button variant="primary" className="flex-1" disabled={matchIndex >= partidos.length - 1} onClick={siguiente}>Siguiente →</Button>
        </div>
      </>
    )
  }

  return (
    <AppShell codigo={codigo} active="predicciones" ligaNombre={liga?.nombre} right={right}>
      <div className="mb-4">
        <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide">Tus predicciones</h2>
        <p className="text-pool-muted text-sm">{pozo?.nombre} · {hechos} cargados</p>
      </div>
      {body()}
    </AppShell>
  )
}

function TeamSide({ equipo }: { equipo: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Flag equipo={equipo} className="w-12 h-auto" />
      <span className="font-condensed font-bold text-center leading-tight">{equipo}</span>
    </div>
  )
}

function Marcador({ a, b, muted = false }: { a: number | null; b: number | null; muted?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`font-condensed font-extrabold text-4xl w-10 text-center ${muted ? 'text-pool-muted' : 'text-pool-gold'}`}>{a ?? '-'}</span>
      <span className="text-pool-muted text-xl">-</span>
      <span className={`font-condensed font-extrabold text-4xl w-10 text-center ${muted ? 'text-pool-muted' : 'text-pool-gold'}`}>{b ?? '-'}</span>
    </div>
  )
}

function Stepper({ value, onStep, onType }: { value: string; onStep: (d: number) => void; onType: (v: string) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={() => onStep(1)} className="w-9 h-9 rounded-lg border border-pool-green/40 bg-pool-green/12 text-pool-green flex items-center justify-center text-xl leading-none">+</button>
      <input type="text" inputMode="numeric" value={value} onChange={e => onType(e.target.value)} onFocus={e => e.currentTarget.select()} placeholder="–"
        className={`w-14 h-14 bg-pool-bg border-2 rounded-xl text-center font-condensed font-extrabold text-3xl focus:outline-none placeholder-pool-muted/40 ${value !== '' ? 'border-pool-green text-pool-gold' : 'border-white/15 text-pool-muted focus:border-pool-green'}`} />
      <button onClick={() => onStep(-1)} className="w-9 h-9 rounded-lg border border-white/15 bg-white/5 text-pool-text flex items-center justify-center text-xl leading-none">−</button>
    </div>
  )
}
