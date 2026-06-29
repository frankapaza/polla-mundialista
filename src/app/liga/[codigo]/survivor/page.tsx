'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/common/AppShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Flag } from '@/components/common/Flag'
import { nombreFase, partidoCerrado, formatearCountdown } from '@/lib/utils'
import { fetchLiga, fetchPozos, getLigaSession } from '@/lib/liga'
import {
  fasesDelPozo, equiposDeFase, faseProgramada, faseCerrada, estadoPick, standings,
  fetchSurvivorPicks, type Standing,
} from '@/lib/survivor'
import type { Liga, Pozo, Partido, Participante, SurvivorPick, FaseTorneo } from '@/lib/types'

export default function SurvivorPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [yo, setYo] = useState<Participante | null>(null)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [picks, setPicks] = useState<SurvivorPick[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [, setTick] = useState(0)

  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i) }, [])

  const cargar = useCallback(async () => {
    try {
      const sess = getLigaSession(codigo)
      if (!sess) { router.replace(`/liga/${codigo}`); return }
      const l = await fetchLiga(codigo); if (!l) { router.replace(`/liga/${codigo}`); return }
      setLiga(l)
      const pozos = await fetchPozos(l.id)
      const sv = pozos.find(p => p.modo === 'survivor')
      if (!sv) { router.replace(`/liga/${codigo}/grupos`); return }
      setPozo(sv)

      const { data: parts } = await supabase.from('participantes').select().eq('grupo_id', sv.id).order('created_at')
      const ps = (parts ?? []) as Participante[]
      setParticipantes(ps)
      const mio = ps.find(p => p.documento === sess.documento) ?? null
      setYo(mio)

      const { data: partData } = await supabase.from('partidos').select().in('fase', sv.fases)
      setPartidos((partData ?? []) as Partido[])
      setPicks(await fetchSurvivorPicks(ps.map(p => p.id)))
    } catch (e) {
      console.error('Error cargando survivor:', e)
    } finally {
      setLoading(false)
    }
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <main className="min-h-screen flex items-center justify-center text-pool-muted">Cargando…</main>

  const fasesOrden = pozo ? fasesDelPozo(pozo) : []
  const picksByPart: Record<string, Record<string, SurvivorPick>> = {}
  for (const pk of picks) { (picksByPart[pk.participante_id] ??= {})[pk.fase] = pk }
  const partidosById: Record<string, Partido> = {}
  for (const p of partidos) partidosById[p.id] = p

  const tabla = standings(participantes, picksByPart, partidos, fasesOrden)
  const vivos = tabla.filter(s => s.vivo).length
  const miStanding = tabla.find(s => s.participante.id === yo?.id)
  const misPicks = yo ? (picksByPart[yo.id] ?? {}) : {}

  // Ronda en la que me toca actuar
  let activeFase: FaseTorneo | null = null
  let estadoRonda: 'elegir' | 'esperando' | null = null
  if (yo && miStanding?.vivo) {
    for (const fase of fasesOrden) {
      if (!faseProgramada(partidos, fase)) break
      const pk = misPicks[fase]
      if (pk && estadoPick(pk, partidosById) === 'sobrevive') continue
      if (pk) { activeFase = fase; estadoRonda = 'esperando'; break }
      if (!faseCerrada(partidos, fase)) { activeFase = fase; estadoRonda = 'elegir'; break }
    }
  }

  const right = yo ? (
    <Badge tone={miStanding?.vivo ? 'green' : 'danger'}>{miStanding?.vivo ? '🟢 Vivo' : '🔴 Eliminado'}</Badge>
  ) : null

  return (
    <AppShell codigo={codigo} active="grupos" ligaNombre={liga?.nombre} right={right}>
      <div className="mb-4">
        <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide">Survivor — Recta Final</h2>
        <p className="text-pool-muted text-sm">Elegí un equipo por ronda. Si pierde, quedás afuera. Último en pie gana el pozo.</p>
      </div>

      {/* No inscrito */}
      {!yo && (
        <Card className="p-8 text-center">
          <p className="text-pool-muted mb-4">Todavía no estás en el Survivor.</p>
          <Link href={`/liga/${codigo}/grupos`}><Button>Unirme desde Pozos</Button></Link>
        </Card>
      )}

      {yo && (
        <>
          {/* Contador de sobrevivientes */}
          <Card accent className="p-5 mb-5 text-center">
            <div className="font-condensed font-bold text-xs uppercase tracking-widest text-pool-muted-2">Sobrevivientes</div>
            <div className="font-condensed font-extrabold text-4xl text-pool-gold mt-1">{vivos} <span className="text-pool-muted text-xl">/ {participantes.length}</span></div>
          </Card>

          {/* Mi ronda */}
          {!activeFase && (
            <Card className="p-6 text-center text-pool-muted mb-5">
              {miStanding?.vivo
                ? '⏳ La recta final todavía no empezó. Cuando se definan los cuartos vas a poder elegir tu equipo.'
                : `Quedaste eliminado en ${miStanding?.eliminadoEn ? nombreFase(miStanding.eliminadoEn) : 'una ronda'}. ¡Seguí mirando el pozo!`}
            </Card>
          )}

          {activeFase && estadoRonda === 'esperando' && (
            <Card accent className="p-5 mb-5 text-center">
              <div className="text-pool-muted text-sm">Tu elección en {nombreFase(activeFase)}</div>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Flag equipo={misPicks[activeFase].equipo} className="w-8 h-auto" />
                <span className="font-condensed font-extrabold text-xl">{misPicks[activeFase].equipo}</span>
              </div>
              <div className="text-pool-muted-2 text-xs mt-2">Esperando el resultado…</div>
            </Card>
          )}

          {activeFase && estadoRonda === 'elegir' && (
            <div className="mb-6">
              <h3 className="font-condensed font-extrabold text-lg uppercase mb-1">Elegí en {nombreFase(activeFase)}</h3>
              <p className="text-pool-muted text-sm mb-3">Un equipo que creas que gana su partido (podés repetir equipo entre rondas).</p>
              <div className="grid grid-cols-2 gap-2">
                {equiposDeFase(partidos, activeFase).map(({ equipo, partido }) => {
                  const elegido = misPicks[activeFase!]?.equipo === equipo
                  const cerrado = partidoCerrado(partido.fecha)
                  const cd = formatearCountdown(partido.fecha)
                  return (
                    <button key={equipo} disabled={cerrado || saving === equipo}
                      onClick={async () => {
                        setSaving(equipo)
                        const r = await fetch('/api/survivor/pick', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ participanteId: yo.id, fase: activeFase, equipo, partidoId: partido.id }),
                        })
                        if (r.ok) setPicks(await fetchSurvivorPicks(participantes.map(p => p.id)))
                        setSaving('')
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-colors disabled:opacity-40 ${elegido ? 'border-pool-green bg-pool-green/12' : 'border-white/10 bg-pool-surface hover:border-pool-green/40'}`}>
                      <Flag equipo={equipo} className="w-7 h-auto" />
                      <div className="min-w-0">
                        <div className="font-condensed font-bold truncate">{equipo}</div>
                        <div className="text-pool-muted text-[11px]">{cerrado ? '🔒 cerrado' : cd ? `cierra en ${cd}` : 'vs ' + (partido.equipo_local === equipo ? partido.equipo_visitante : partido.equipo_local)}</div>
                      </div>
                      {elegido && <span className="ml-auto text-pool-green">✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tabla de sobrevivientes */}
          <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Estado del pozo</h3>
          <Card className="p-2 flex flex-col">
            {tabla.map((s: Standing) => {
              const esYo = s.participante.id === yo.id
              return (
                <div key={s.participante.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${esYo ? 'bg-pool-green/10' : ''}`}>
                  <span className="w-8 h-8 rounded-full bg-pool-line flex items-center justify-center font-condensed font-bold text-xs text-pool-muted-2">{s.participante.nombre.slice(0, 2).toUpperCase()}</span>
                  <span className={`flex-1 text-sm ${esYo ? 'font-semibold' : 'text-pool-muted'}`}>{s.participante.nombre}</span>
                  {s.vivo
                    ? <Badge tone="green">🟢 {s.sobrevividas} rondas</Badge>
                    : <Badge tone="danger">🔴 {s.eliminadoEn ? nombreFase(s.eliminadoEn) : 'fuera'}</Badge>}
                </div>
              )
            })}
            {tabla.length === 0 && <div className="p-6 text-center text-pool-muted text-sm">Nadie se unió al Survivor todavía.</div>}
          </Card>
        </>
      )}
    </AppShell>
  )
}
