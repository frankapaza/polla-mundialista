'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { AppShell } from '@/components/common/AppShell'
import { Card } from '@/components/ui/Card'
import { fetchLiga, fetchPozos, getActivePozoId, getLigaSession } from '@/lib/liga'
import type { Liga, Pozo, Participante } from '@/lib/types'

const REPARTO = [
  { pos: '1°', pct: 0.5, color: 'text-pool-gold', ring: 'border-pool-gold' },
  { pos: '2°', pct: 0.3, color: 'text-[#cfd8d2]', ring: 'border-[#cfd8d2]' },
  { pos: '3°', pct: 0.2, color: 'text-[#d9a066]', ring: 'border-[#d9a066]' },
]

export default function PremiosPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    try {
      if (!getLigaSession(codigo)) { router.replace(`/liga/${codigo}`); return }
      const l = await fetchLiga(codigo); if (!l) { router.replace(`/liga/${codigo}`); return }
      setLiga(l)
      const pozos = await fetchPozos(l.id)
      const activo = pozos.find(p => p.id === getActivePozoId(codigo)) ?? pozos.find(p => p.modo === 'clasico') ?? pozos[0]
      if (!activo) { router.replace(`/liga/${codigo}/grupos`); return }
      setPozo(activo)
      const { data } = await supabase.from('participantes').select().eq('grupo_id', activo.id)
      setParticipantes((data ?? []) as Participante[])
    } catch (e) {
      console.error('Error cargando premios:', e)
    } finally { setLoading(false) }
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <main className="min-h-screen flex items-center justify-center text-pool-muted">Cargando…</main>

  const costo = pozo?.costo_inscripcion ?? 0
  const pagaron = participantes.filter(p => p.pago).length
  const bote = costo * pagaron
  const esSurvivor = pozo?.modo === 'survivor'

  const reglasClasico = [
    { pts: '+3', text: 'Marcador exacto', sub: 'Acertás el resultado completo' },
    { pts: '+1', text: 'Ganador o empate', sub: 'Acertás quién gana (o el empate), no el marcador' },
    { pts: '0', text: 'Fallaste', sub: 'No acertaste ni el ganador' },
  ]
  const reglasSurvivor = [
    { pts: '1', text: 'Elegí un equipo por ronda', sub: 'Podés repetir equipo entre rondas' },
    { pts: '✓', text: 'Gana tu equipo → sobrevivís', sub: 'Pasás a la ronda siguiente' },
    { pts: '✗', text: 'Pierde tu equipo → afuera', sub: 'Si no elegís a tiempo, también quedás eliminado' },
    { pts: '🏆', text: 'Último en pie gana el pozo', sub: 'Si quedan varios, se reparte entre ellos' },
  ]
  const reglas = esSurvivor ? reglasSurvivor : reglasClasico

  const pasos = [
    'Unite al pozo desde la pestaña Pozos.',
    esSurvivor ? 'Cada ronda elegí un equipo que creas que gana.' : 'Cargá tu marcador antes de que empiece cada partido.',
    esSurvivor ? 'Sobreviví ronda a ronda hasta la final.' : 'Sumá puntos a medida que se juegan los partidos.',
    'El que termina arriba se lleva el pozo.',
  ]

  return (
    <AppShell codigo={codigo} active="premios" ligaNombre={liga?.nombre}>
      <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide mb-1">Reglas y premios</h2>
      <p className="text-pool-muted text-sm mb-5">{pozo?.nombre}</p>

      {/* Bote */}
      <Card accent className="p-6 mb-5 relative overflow-hidden">
        <div className="font-condensed font-bold text-xs uppercase tracking-widest text-pool-muted-2">Bote del pozo</div>
        {bote > 0 ? (
          <>
            <div className="font-condensed font-extrabold text-5xl text-pool-gold mt-1">S/ {bote.toFixed(0)}</div>
            <div className="text-pool-muted text-sm mt-1">{pagaron} pagaron · S/ {costo} c/u</div>
          </>
        ) : (
          <div className="font-condensed font-extrabold text-3xl mt-1">Amistoso 🤝</div>
        )}
      </Card>

      {/* Premios */}
      {bote > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          {REPARTO.map(r => (
            <Card key={r.pos} className="p-4 text-center">
              <div className={`mx-auto w-12 h-12 rounded-full bg-pool-line border-2 ${r.ring} flex items-center justify-center font-condensed font-extrabold ${r.color} mb-2`}>{r.pos}</div>
              <div className={`font-condensed font-extrabold text-xl ${r.color}`}>S/ {(bote * r.pct).toFixed(0)}</div>
              <div className="text-pool-muted text-[11px]">{(r.pct * 100).toFixed(0)}%</div>
            </Card>
          ))}
        </div>
      )}

      {/* Cómo se puntúa */}
      <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">{esSurvivor ? 'Cómo funciona' : 'Cómo se puntúa'}</h3>
      <Card className="p-4 mb-6 flex flex-col gap-3">
        {reglas.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="font-condensed font-extrabold text-pool-gold bg-pool-gold/12 rounded-lg px-2.5 py-1 min-w-11 text-center">{r.pts}</span>
            <div className="leading-tight">
              <div className="font-semibold text-sm">{r.text}</div>
              <div className="text-pool-muted text-xs">{r.sub}</div>
            </div>
          </div>
        ))}
      </Card>

      {/* Cómo jugar */}
      <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Cómo jugar</h3>
      <div className="flex flex-col gap-2">
        {pasos.map((p, i) => (
          <Card key={i} className="p-3 flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-pool-green/15 text-pool-green flex items-center justify-center font-condensed font-extrabold flex-none">{i + 1}</span>
            <span className="text-sm">{p}</span>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}
