'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AppShell } from '@/components/common/AppShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import {
  fetchLiga, fetchPozos, fetchRankingPozo, getLigaSession, getActivePozoId,
  type RankingRow,
} from '@/lib/liga'
import type { Liga, Pozo } from '@/lib/types'

export default function RankingPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozo, setPozo] = useState<Pozo | null>(null)
  const [rows, setRows] = useState<RankingRow[]>([])
  const [miDoc, setMiDoc] = useState('')
  const [loading, setLoading] = useState(true)

  const cargar = useCallback(async () => {
    const sess = getLigaSession(codigo)
    if (!sess) { router.replace(`/liga/${codigo}`); return }
    setMiDoc(sess.documento)
    const l = await fetchLiga(codigo)
    if (!l) { router.replace(`/liga/${codigo}`); return }
    setLiga(l)
    const pozos = await fetchPozos(l.id)
    const activo = pozos.find(p => p.id === getActivePozoId(codigo) && p.modo === 'clasico') ?? pozos.find(p => p.modo === 'clasico')
    if (!activo) { router.replace(`/liga/${codigo}/grupos`); return }
    setPozo(activo)
    setRows(await fetchRankingPozo(activo.id))
    setLoading(false)
  }, [codigo, router])

  useEffect(() => { cargar() }, [cargar])

  if (loading) return <main className="min-h-screen flex items-center justify-center text-pool-muted">Cargando…</main>

  const podio = rows.slice(0, 3)
  const PODIO_STYLE = [
    { border: 'border-pool-gold/45', ring: 'border-pool-gold', color: 'text-pool-gold', label: '1°' },
    { border: 'border-[#cfd8d2]/30', ring: 'border-[#cfd8d2]', color: 'text-[#cfd8d2]', label: '2°' },
    { border: 'border-[#d9a066]/30', ring: 'border-[#d9a066]', color: 'text-[#d9a066]', label: '3°' },
  ]

  return (
    <AppShell codigo={codigo} active="ranking" ligaNombre={liga?.nombre}>
      <div className="mb-5">
        <h2 className="font-condensed font-extrabold text-2xl uppercase tracking-wide">Tabla de posiciones</h2>
        <p className="text-pool-muted text-sm">{pozo?.nombre}</p>
      </div>

      {/* Podio */}
      {podio.length > 0 && (
        <div className="grid grid-cols-3 gap-3 items-end mb-6">
          {[1, 0, 2].map(idx => {
            const r = podio[idx]; if (!r) return <div key={idx} />
            const st = PODIO_STYLE[idx]
            const big = idx === 0
            return (
              <Card key={r.participante.id} className={`p-4 text-center border ${st.border} ${big ? 'animate-float-y' : ''}`}>
                <div className={`mx-auto rounded-full bg-pool-line border-2 ${st.ring} flex items-center justify-center font-condensed font-extrabold ${st.color} ${big ? 'w-16 h-16 text-xl' : 'w-12 h-12 text-base'} mb-2`}>
                  {r.participante.nombre.slice(0, 2).toUpperCase()}
                </div>
                <div className={`font-condensed font-extrabold ${st.color} ${big ? 'text-3xl' : 'text-2xl'} leading-none`}>{st.label}</div>
                <div className="text-sm mt-1 truncate">{r.participante.nombre.split(' ')[0]}</div>
                <div className="font-condensed font-extrabold text-pool-gold mt-0.5">{r.total} pts</div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Tabla */}
      <Card className="overflow-hidden p-0">
        <div className="grid grid-cols-[40px_1fr_60px_70px] px-4 py-3 border-b border-white/[0.07] font-condensed font-bold text-[11px] uppercase tracking-widest text-pool-muted">
          <span>#</span><span>Jugador</span><span className="text-center">Exactos</span><span className="text-right">Puntos</span>
        </div>
        {rows.map((r, i) => {
          const yo = r.participante.documento === miDoc
          return (
            <div key={r.participante.id} className={`grid grid-cols-[40px_1fr_60px_70px] items-center px-4 py-3 border-b border-white/[0.04] ${yo ? 'bg-pool-green/10' : ''}`}>
              <span className="font-condensed font-extrabold text-pool-muted">{i + 1}</span>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-full bg-pool-line flex items-center justify-center font-condensed font-bold text-[11px] text-pool-muted-2 flex-none">{r.participante.nombre.slice(0, 2).toUpperCase()}</span>
                <span className={`text-sm truncate ${yo ? 'font-semibold' : ''}`}>{r.participante.nombre}{yo && <Badge tone="green" className="ml-2 !px-2 !py-0">Tú</Badge>}</span>
              </div>
              <span className="text-center font-condensed font-bold text-pool-muted-2">{r.exactos}</span>
              <span className="text-right font-condensed font-extrabold text-pool-gold">{r.total}</span>
            </div>
          )
        })}
        {rows.length === 0 && <div className="p-6 text-center text-pool-muted text-sm">Todavía no hay participantes.</div>}
      </Card>
    </AppShell>
  )
}
