'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/common/AppShell'
import { Cargando } from '@/components/common/Cargando'
import { Card } from '@/components/ui/Card'
import { partidoYaEmpezó } from '@/lib/utils'
import { fetchLiga, fetchPozos, verificarSesion, elegirPozoActivo } from '@/lib/liga'
import type { Liga, Pozo, Partido, Participante } from '@/lib/types'

/**
 * Pronósticos de todos. El marcador de cada jugador se REVELA solo cuando el
 * partido ya empezó; mientras no empiece, queda bloqueado (🔒). Los marcadores
 * no revelados no se descargan al navegador.
 */
export default function TablaPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [parts, setParts] = useState<Participante[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [scores, setScores] = useState<Record<string, { l: number; v: number }>>({})
  const [exist, setExist] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(i) }, [])

  const cargar = useCallback(async () => {
    const sess = await verificarSesion(codigo)
    if (!sess) { router.replace(`/liga/${codigo}`); return }
    const l = await fetchLiga(codigo); if (!l) { router.replace(`/liga/${codigo}`); return }
    setLiga(l)
    const pozos = await fetchPozos(l.id)
    const activo = elegirPozoActivo(pozos, codigo)
    if (!activo) { router.replace(`/liga/${codigo}/grupos`); return }
    setPozo(activo)

    const { data: ps } = await supabase.from('participantes').select().eq('grupo_id', activo.id).order('created_at')
    const participantes = (ps ?? []) as Participante[]
    setParts(participantes)
    const { data: pd } = await supabase.from('partidos').select().in('fase', activo.fases).not('fecha', 'is', null).order('numero_partido')
    const matches = (pd ?? []) as Partido[]
    setPartidos(matches)

    const ids = participantes.map(p => p.id)
    if (ids.length) {
      // Existencia (sin marcador) de TODOS los pronósticos: para mostrar ✓/falta.
      const { data: keys } = await supabase.from('pronosticos').select('participante_id, partido_id').in('participante_id', ids)
      const e = new Set<string>()
      for (const k of (keys ?? []) as { participante_id: string; partido_id: string }[]) e.add(`${k.participante_id}:${k.partido_id}`)
      setExist(e)
      // Marcadores SOLO de partidos ya empezados (lo no revelado no se descarga).
      const started = matches.filter(m => partidoYaEmpezó(m.fecha)).map(m => m.id)
      if (started.length) {
        const { data: rev } = await supabase.from('pronosticos')
          .select('participante_id, partido_id, goles_local, goles_visitante')
          .in('participante_id', ids).in('partido_id', started)
        const sm: Record<string, { l: number; v: number }> = {}
        for (const r of (rev ?? []) as { participante_id: string; partido_id: string; goles_local: number; goles_visitante: number }[]) {
          sm[`${r.participante_id}:${r.partido_id}`] = { l: r.goles_local, v: r.goles_visitante }
        }
        setScores(sm)
      }
    }
    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <Cargando texto="Cargando pronósticos…" />

  return (
    <AppShell codigo={codigo} active="ranking" ligaNombre={liga?.nombre}>
      <div className="mb-4">
        <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide">Pronósticos de todos</h2>
        <p className="text-pool-muted text-sm">{pozo?.nombre} · el marcador se revela cuando empieza el partido 🔒</p>
      </div>
      <Card className="p-0 overflow-x-auto">
        {parts.length === 0 || partidos.length === 0 ? (
          <div className="p-6 text-center text-pool-muted text-sm">Sin datos para mostrar.</div>
        ) : (
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07]">
                <th className="sticky left-0 bg-pool-surface px-3 py-2 text-left text-pool-muted font-condensed uppercase min-w-[150px] z-10">Partido</th>
                {parts.map(p => (
                  <th key={p.id} className="px-2 py-2 text-pool-muted-2 font-medium whitespace-nowrap max-w-[70px] truncate" title={p.nombre}>{p.nombre.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partidos.map(m => {
                const empezo = partidoYaEmpezó(m.fecha)
                const jugado = m.goles_local !== null
                return (
                  <tr key={m.id} className="border-b border-white/[0.04]">
                    <td className="sticky left-0 bg-pool-surface px-3 py-2 whitespace-nowrap z-10">
                      <span className="text-pool-text">{m.equipo_local.split(' ')[0]} v {m.equipo_visitante.split(' ')[0]}</span>
                      {jugado && <span className="text-pool-gold ml-1 font-bold">{m.goles_local}-{m.goles_visitante}</span>}
                    </td>
                    {parts.map(p => {
                      const key = `${p.id}:${m.id}`
                      const sc = scores[key]
                      const has = exist.has(key)
                      return (
                        <td key={p.id} className="px-2 py-2 text-center">
                          {empezo
                            ? (sc ? <span className="text-pool-muted-2">{sc.l}-{sc.v}</span> : <span className="text-pool-gold/50 text-[10px]">—</span>)
                            : (has ? <span className="text-pool-green" title="Ya pronosticó (se revela al empezar)">🔒</span> : <span className="text-pool-gold/60 text-[10px]">falta</span>)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </AppShell>
  )
}
