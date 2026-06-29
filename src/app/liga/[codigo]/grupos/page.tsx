'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/common/AppShell'
import { Cargando } from '@/components/common/Cargando'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import {
  fetchLiga, fetchPozos, fetchMisParticipaciones,
  getLigaSession, clearLigaSession, setActivePozoId, getActivePozoId,
} from '@/lib/liga'
import { nombreFase } from '@/lib/utils'
import type { Liga, Pozo, Participante } from '@/lib/types'

export default function GruposPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozos, setPozos] = useState<Pozo[]>([])
  const [mias, setMias] = useState<Record<string, Participante>>({})
  const [activo, setActivo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const sess = getLigaSession(codigo)
    if (!sess) { router.replace(`/liga/${codigo}`); return }
    const l = await fetchLiga(codigo)
    if (!l) { router.replace(`/liga/${codigo}`); return }
    setLiga(l)
    const ps = await fetchPozos(l.id)
    setPozos(ps)
    setMias(await fetchMisParticipaciones(ps, sess.documento))
    setActivo(getActivePozoId(codigo))
    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  function elegir(pozo: Pozo) {
    setActivePozoId(codigo, pozo.id)
    setActivo(pozo.id)
    router.push(`/liga/${codigo}/${pozo.modo === 'survivor' ? 'survivor' : 'predicciones'}`)
  }

  async function unirse(pozo: Pozo) {
    const sess = getLigaSession(codigo)
    if (!sess) return
    setJoining(pozo.id)
    const r = await fetch('/api/pozo/unirse', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pozoId: pozo.id }),
    })
    if (r.status === 401) { clearLigaSession(codigo); router.replace(`/liga/${codigo}`); return }
    const data = await r.json().catch(() => ({}))
    if (r.ok && data.participante) setMias(prev => ({ ...prev, [pozo.id]: data.participante }))
    setJoining(null)
  }

  if (loading) return <Cargando />

  const sess = getLigaSession(codigo)
  const right = (
    <button onClick={() => { clearLigaSession(codigo); router.replace(`/liga/${codigo}`) }}
      className="text-pool-muted hover:text-pool-text text-xs font-condensed uppercase tracking-wide">Salir</button>
  )

  return (
    <AppShell codigo={codigo} active="grupos" ligaNombre={liga?.nombre} right={right}>
      <div className="mb-5">
        <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide">Pozos de la liga</h2>
        <p className="text-pool-muted text-sm">Hola {sess?.nombre} · elegí un pozo para jugar</p>
      </div>

      <div className="flex flex-col gap-3">
        {pozos.map(pozo => {
          const ins = mias[pozo.id]
          const esActivo = activo === pozo.id
          const label = pozo.fases.length === 1 ? nombreFase(pozo.fases[0]) : pozo.nombre
          return (
            <Card key={pozo.id} accent={esActivo} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-condensed font-bold text-lg uppercase truncate">{label}</h3>
                    {pozo.modo === 'survivor' && <Badge tone="gold">Survivor</Badge>}
                    {esActivo && <Badge tone="green">Activo</Badge>}
                  </div>
                  <p className="text-pool-muted text-xs mt-0.5">
                    {pozo.costo_inscripcion > 0 ? `Inscripción S/ ${pozo.costo_inscripcion}` : 'Gratis'}
                    {ins && (ins.pago ? ' · ✅ Pagaste' : pozo.costo_inscripcion > 0 ? ' · ⏳ Pago pendiente' : '')}
                  </p>
                </div>
                <div className="flex-none">
                  {ins ? (
                    <Button size="sm" variant={esActivo ? 'primary' : 'outline'} onClick={() => elegir(pozo)}>
                      {pozo.modo === 'survivor' ? 'Jugar' : 'Predecir'}
                    </Button>
                  ) : (
                    <Button size="sm" variant="ghost" disabled={joining === pozo.id} onClick={() => unirse(pozo)}>
                      {joining === pozo.id ? 'Uniendo…' : 'Unirme'}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
