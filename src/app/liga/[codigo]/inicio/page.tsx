'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/common/AppShell'
import { Cargando } from '@/components/common/Cargando'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Flag } from '@/components/common/Flag'
import { partidoCerrado, partidoYaEmpezó, formatearFecha } from '@/lib/utils'
import {
  fetchLiga, fetchPozos, fetchRankingPozo, getLigaSession, getActivePozoId, setActivePozoId,
  type RankingRow,
} from '@/lib/liga'
import type { Liga, Pozo, Partido, Pronostico, Participante } from '@/lib/types'

export default function InicioPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [participante, setParticipante] = useState<Participante | null>(null)
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [pronos, setPronos] = useState<Record<string, Pronostico>>({})
  const [ranking, setRanking] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [, setTick] = useState(0)

  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 1000); return () => clearInterval(i) }, [])

  const cargar = useCallback(async () => {
   try {
    const sess = getLigaSession(codigo)
    if (!sess) { router.replace(`/liga/${codigo}`); return }
    const l = await fetchLiga(codigo)
    if (!l) { router.replace(`/liga/${codigo}`); return }
    setLiga(l)
    const pozos = await fetchPozos(l.id)
    const activo = pozos.find(p => p.id === getActivePozoId(codigo) && p.modo === 'clasico') ?? pozos.find(p => p.modo === 'clasico')
    if (!activo) { router.replace(`/liga/${codigo}/grupos`); return }
    setActivePozoId(codigo, activo.id); setPozo(activo)

    const { data: part } = await supabase.from('participantes').select()
      .eq('grupo_id', activo.id).eq('documento', sess.documento).maybeSingle()
    if (!part) { router.replace(`/liga/${codigo}/grupos`); return }
    setParticipante(part as Participante)

    const { data: partData } = await supabase.from('partidos').select()
      .in('fase', activo.fases).not('fecha', 'is', null).order('fecha')
    setPartidos((partData ?? []) as Partido[])

    const { data: pr } = await supabase.from('pronosticos').select().eq('participante_id', (part as Participante).id)
    const map: Record<string, Pronostico> = {}
    for (const p of (pr ?? []) as Pronostico[]) map[p.partido_id] = p
    setPronos(map)

    setRanking(await fetchRankingPozo(activo.id))
   } catch (e) {
    console.error('Error cargando inicio:', e)
   } finally {
    setLoading(false)
   }
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <Cargando />

  const total = Object.values(pronos).reduce((s, p) => s + (p.puntos ?? 0), 0)
  const exactos = Object.values(pronos).filter(p => p.puntos === 3).length
  const miPos = ranking.findIndex(r => r.participante.id === participante?.id) + 1
  const proximo = partidos.find(p => !partidoYaEmpezó(p.fecha))
  const porJugar = partidos.filter(p => !partidoCerrado(p.fecha) && !pronos[p.id]).slice(0, 5)
  const top = ranking.slice(0, 5)

  const right = (
    <>
      <Badge tone="gold">{total} pts</Badge>
      <span className="w-9 h-9 rounded-full bg-pool-line border border-white/10 flex items-center justify-center font-condensed font-extrabold text-sm text-pool-muted-2">
        {(participante?.nombre ?? '?').slice(0, 2).toUpperCase()}
      </span>
    </>
  )

  return (
    <AppShell codigo={codigo} active="inicio" ligaNombre={liga?.nombre} right={right}>
      {/* Hero countdown */}
      {proximo && (
        <Card accent className="p-6 mb-5 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <span className="font-condensed font-bold text-xs uppercase tracking-widest text-pool-muted-2">Próximo partido · {pozo?.nombre}</span>
          </div>
          <div className="flex items-center justify-center gap-7 mb-4">
            <TeamMini equipo={proximo.equipo_local} />
            <div className="text-center">
              <div className="font-condensed font-extrabold text-2xl text-pool-muted">VS</div>
              <div className="text-pool-muted-2 text-xs mt-1">{formatearFecha(proximo.fecha)}</div>
            </div>
            <TeamMini equipo={proximo.equipo_visitante} />
          </div>
          <Countdown fecha={proximo.fecha} />
          <Link href={`/liga/${codigo}/predicciones`} className="block mt-4">
            <Button size="lg" className="w-full">Predecir ahora →</Button>
          </Link>
        </Card>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Tile label="Tu posición" value={miPos > 0 ? `#${miPos}` : '—'} sub={`/${ranking.length}`} />
        <Tile label="Puntos" value={String(total)} gold />
        <Tile label="Exactos" value={String(exactos)} />
        <Tile label="Cargados" value={`${Object.keys(pronos).length}`} sub={`/${partidos.length}`} />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Por jugar */}
        <div>
          <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Por jugar</h3>
          <div className="flex flex-col gap-2">
            {porJugar.length === 0 && <Card className="p-4 text-pool-muted text-sm">Estás al día 🎉</Card>}
            {porJugar.map(p => (
              <Card key={p.id} className="p-3 flex items-center gap-3">
                <Flag equipo={p.equipo_local} className="w-6 h-auto" />
                <span className="font-condensed font-bold text-sm">{p.equipo_local}</span>
                <span className="text-pool-muted text-xs">vs</span>
                <span className="font-condensed font-bold text-sm">{p.equipo_visitante}</span>
                <Flag equipo={p.equipo_visitante} className="w-6 h-auto" />
                <div className="flex-1" />
                <Link href={`/liga/${codigo}/predicciones`}>
                  <Button size="sm" variant="outline">Predecir</Button>
                </Link>
              </Card>
            ))}
          </div>
        </div>

        {/* Top del pozo */}
        <div>
          <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Top del pozo</h3>
          <Card className="p-2 flex flex-col">
            {top.map((r, i) => {
              const yo = r.participante.id === participante?.id
              return (
                <div key={r.participante.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg ${yo ? 'bg-pool-green/10' : ''}`}>
                  <span className="font-condensed font-extrabold w-5 text-pool-muted">{i + 1}</span>
                  <span className="w-8 h-8 rounded-full bg-pool-line flex items-center justify-center font-condensed font-bold text-xs text-pool-muted-2">{r.participante.nombre.slice(0, 2).toUpperCase()}</span>
                  <span className={`flex-1 text-sm ${yo ? 'text-pool-text font-semibold' : 'text-pool-muted'}`}>{r.participante.nombre}</span>
                  <span className="font-condensed font-extrabold text-pool-gold">{r.total}</span>
                </div>
              )
            })}
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

function TeamMini({ equipo }: { equipo: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <Flag equipo={equipo} className="w-12 h-auto" />
      <span className="font-condensed font-extrabold">{equipo}</span>
    </div>
  )
}

function Tile({ label, value, sub, gold = false }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <Card className="p-4">
      <div className="font-condensed font-bold text-xs uppercase tracking-wide text-pool-muted">{label}</div>
      <div className={`font-condensed font-extrabold text-3xl leading-none mt-2 ${gold ? 'text-pool-gold' : ''}`}>
        {value}{sub && <span className="text-base text-pool-muted font-semibold"> {sub}</span>}
      </div>
    </Card>
  )
}

function Countdown({ fecha }: { fecha: string | null }) {
  if (!fecha) return null
  const diff = Math.max(0, new Date(fecha).getTime() - Date.now())
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff % 86400000) / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  const parts = d > 0 ? [[d, 'Días'], [h, 'Hrs'], [m, 'Min']] : [[h, 'Hrs'], [m, 'Min'], [s, 'Seg']]
  return (
    <div className="flex items-end justify-center gap-3">
      {parts.map(([v, l], i) => (
        <div key={i} className="text-center">
          <div className="font-condensed font-extrabold text-4xl text-pool-gold leading-none">{String(v).padStart(2, '0')}</div>
          <div className="text-[10px] uppercase tracking-widest text-pool-muted-2 mt-1">{l as string}</div>
        </div>
      ))}
    </div>
  )
}
