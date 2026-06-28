'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Flag } from '@/components/common/Flag'
import { calcularPuntos, formatearFecha, nombreFase } from '@/lib/utils'
import { fetchLiga, fetchPozos } from '@/lib/liga'
import { standings, resolverSurvivor, fetchSurvivorPicks } from '@/lib/survivor'
import type { Liga, Pozo, Partido, Participante, Pronostico, SurvivorPick } from '@/lib/types'

interface Score { local: string; visitante: string }

export default function LigaAdminPage() {
  const params = useParams()
  const codigo = (params.codigo as string).toUpperCase()

  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [errAuth, setErrAuth] = useState('')

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozos, setPozos] = useState<Pozo[]>([])
  const [sel, setSel] = useState<string>('')
  const [partsByPozo, setPartsByPozo] = useState<Record<string, Participante[]>>({})
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [picks, setPicks] = useState<SurvivorPick[]>([])
  const [res, setRes] = useState<Record<string, Score>>({})
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const l = await fetchLiga(codigo); if (!l) { setLoading(false); return }
    setLiga(l)
    const ps = await fetchPozos(l.id); setPozos(ps)
    setSel(s => s || ps[0]?.id || '')

    const ids = ps.map(p => p.id)
    const { data: parts } = await supabase.from('participantes').select().in('grupo_id', ids).order('created_at')
    const byPozo: Record<string, Participante[]> = {}
    for (const p of (parts ?? []) as Participante[]) (byPozo[p.grupo_id] ??= []).push(p)
    setPartsByPozo(byPozo)

    const fases = Array.from(new Set(ps.flatMap(p => p.fases)))
    const { data: pd } = await supabase.from('partidos').select().in('fase', fases).order('numero_partido')
    const partidosData = (pd ?? []) as Partido[]
    setPartidos(partidosData)
    const rmap: Record<string, Score> = {}
    for (const p of partidosData) if (p.goles_local !== null) rmap[p.id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
    setRes(rmap)

    setPicks(await fetchSurvivorPicks(((parts ?? []) as Participante[]).map(p => p.id)))
    setLoading(false)
  }, [codigo])

  useEffect(() => {
    if (sessionStorage.getItem('polla_admin') === 'true') { setAuth(true); cargar() }
  }, [cargar])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, codigo }) })
    if (r.ok) { sessionStorage.setItem('polla_admin', 'true'); setAuth(true); cargar() }
    else setErrAuth('Contraseña incorrecta')
  }

  async function togglePago(p: Participante) {
    const nuevo = !p.pago
    await supabase.from('participantes').update({ pago: nuevo, updated_by: `admin:${codigo}` }).eq('id', p.id)
    setPartsByPozo(prev => ({ ...prev, [p.grupo_id]: prev[p.grupo_id].map(x => x.id === p.id ? { ...x, pago: nuevo } : x) }))
  }

  async function guardarResultado(partido: Partido) {
    const r = res[partido.id]
    if (r?.local === '' || r?.local === undefined || r?.visitante === '' || r?.visitante === undefined) return
    const gl = parseInt(r.local), gv = parseInt(r.visitante)
    await supabase.from('partidos').update({ goles_local: gl, goles_visitante: gv, updated_by: `admin:${codigo}` }).eq('id', partido.id)
    // Recalcular puntos de todos los pronósticos de ese partido (global).
    const { data: pronos } = await supabase.from('pronosticos').select().eq('partido_id', partido.id)
    for (const pr of (pronos ?? []) as Pronostico[]) {
      const puntos = pr.infraccion ? 0 : calcularPuntos(pr.goles_local, pr.goles_visitante, gl, gv)
      await supabase.from('pronosticos').update({ puntos }).eq('id', pr.id)
    }
    setPartidos(prev => prev.map(p => p.id === partido.id ? { ...p, goles_local: gl, goles_visitante: gv } : p))
    setMsg(`✅ Resultado guardado (${(pronos ?? []).length} pronósticos recalculados)`)
    setTimeout(() => setMsg(''), 3500)
  }

  async function resolverSurvivorPozo(pozo: Pozo) {
    const ids = (partsByPozo[pozo.id] ?? []).map(p => p.id)
    const n = await resolverSurvivor(ids, partidos)
    setPicks(await fetchSurvivorPicks(ids))
    setMsg(`✅ Survivor resuelto: ${n} picks actualizados`)
    setTimeout(() => setMsg(''), 3500)
  }

  function setScore(id: string, side: 'local' | 'visitante', v: string) {
    const num = v.replace(/\D/g, '').slice(0, 2)
    setRes(prev => ({ ...prev, [id]: { ...(prev[id] ?? { local: '', visitante: '' }), [side]: num } }))
  }

  if (!auth) return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={login} className="w-full max-w-sm rounded-2xl bg-pool-surface border border-white/[0.06] p-6 space-y-4">
        <h1 className="font-condensed font-extrabold text-xl uppercase text-center">Admin · {codigo}</h1>
        <input type="password" value={password} onChange={e => { setPassword(e.target.value); setErrAuth('') }}
          placeholder="Contraseña de admin" autoFocus
          className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pool-green" />
        {errAuth && <p className="text-pool-gold text-sm">{errAuth}</p>}
        <Button type="submit" className="w-full">Entrar</Button>
      </form>
    </main>
  )

  const pozo = pozos.find(p => p.id === sel)
  const inscritos = pozo ? (partsByPozo[pozo.id] ?? []) : []
  const pagaron = inscritos.filter(p => p.pago).length
  const partidosPozo = pozo ? partidos.filter(p => pozo.fases.includes(p.fase) && p.fecha).sort((a, b) => a.numero_partido - b.numero_partido) : []

  return (
    <main className="min-h-screen bg-pool-bg text-pool-text">
      <header className="sticky top-0 z-10 bg-pool-header/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-pool-muted text-xs">Admin · {liga?.nombre}</p>
            <h1 className="font-condensed font-extrabold text-lg uppercase">Gestión de pozos</h1>
          </div>
          <button onClick={() => { sessionStorage.removeItem('polla_admin'); setAuth(false) }} className="text-pool-muted hover:text-pool-text text-xs uppercase">Salir</button>
        </div>
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {pozos.map(p => (
            <button key={p.id} onClick={() => setSel(p.id)}
              className={`flex-none px-3 py-1.5 rounded-md text-sm font-condensed font-bold uppercase ${sel === p.id ? 'bg-pool-green text-[#06210f]' : 'text-pool-muted hover:bg-white/5'}`}>
              {p.fases.length === 1 ? nombreFase(p.fases[0]) : p.nombre}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-5">
        {loading && <p className="text-pool-muted">Cargando…</p>}
        {msg && <div className="mb-4 rounded-lg bg-pool-green/10 border border-pool-green/30 text-pool-green text-sm px-4 py-2.5">{msg}</div>}

        {pozo && (
          <>
            <Card className="p-4 mb-5 flex items-center justify-around text-center">
              <div><div className="text-pool-muted text-xs uppercase">Inscritos</div><div className="font-condensed font-extrabold text-2xl">{inscritos.length}</div></div>
              <div><div className="text-pool-muted text-xs uppercase">Pagaron</div><div className="font-condensed font-extrabold text-2xl text-pool-green">{pagaron}</div></div>
              <div><div className="text-pool-muted text-xs uppercase">Recaudado</div><div className="font-condensed font-extrabold text-2xl text-pool-gold">S/ {(pagaron * pozo.costo_inscripcion).toFixed(0)}</div></div>
              {pozo.modo === 'survivor' && (
                <Button size="sm" onClick={() => resolverSurvivorPozo(pozo)}>Resolver Survivor</Button>
              )}
            </Card>

            {/* Survivor standings */}
            {pozo.modo === 'survivor' && (
              <div className="mb-6">
                <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Estado Survivor</h3>
                <Card className="p-2">
                  {standings(inscritos, picksByPart(picks), partidos, [...pozo.fases]).map(s => (
                    <div key={s.participante.id} className="flex items-center gap-3 px-3 py-2">
                      <span className="flex-1 text-sm">{s.participante.nombre}</span>
                      {s.vivo ? <Badge tone="green">🟢 {s.sobrevividas}</Badge> : <Badge tone="danger">🔴 {s.eliminadoEn ? nombreFase(s.eliminadoEn) : 'fuera'}</Badge>}
                    </div>
                  ))}
                  {inscritos.length === 0 && <div className="p-4 text-center text-pool-muted text-sm">Sin inscritos.</div>}
                </Card>
              </div>
            )}

            {/* Resultados */}
            <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Resultados</h3>
            <div className="flex flex-col gap-2 mb-6">
              {partidosPozo.length === 0 && <Card className="p-4 text-pool-muted text-sm">Sin partidos programados en este pozo.</Card>}
              {partidosPozo.map(p => (
                <Card key={p.id} className="p-3">
                  <div className="text-pool-muted text-xs mb-1.5">{formatearFecha(p.fecha)} · #{p.numero_partido}</div>
                  <div className="flex items-center gap-2">
                    <Flag equipo={p.equipo_local} className="w-6 h-auto" />
                    <span className="flex-1 text-sm font-semibold truncate">{p.equipo_local}</span>
                    <input value={res[p.id]?.local ?? ''} onChange={e => setScore(p.id, 'local', e.target.value)} inputMode="numeric"
                      className="w-12 h-10 bg-pool-bg border border-white/15 rounded-lg text-center font-bold" />
                    <span className="text-pool-muted">-</span>
                    <input value={res[p.id]?.visitante ?? ''} onChange={e => setScore(p.id, 'visitante', e.target.value)} inputMode="numeric"
                      className="w-12 h-10 bg-pool-bg border border-white/15 rounded-lg text-center font-bold" />
                    <span className="flex-1 text-sm font-semibold truncate text-right">{p.equipo_visitante}</span>
                    <Flag equipo={p.equipo_visitante} className="w-6 h-auto" />
                    <Button size="sm" onClick={() => guardarResultado(p)}>Guardar</Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagos */}
            <h3 className="font-condensed font-extrabold text-lg uppercase mb-3">Pagos</h3>
            <div className="flex flex-col gap-2">
              {inscritos.map((p, i) => (
                <Card key={p.id} className="p-3 flex items-center gap-3">
                  <span className="text-pool-muted text-sm w-6">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{p.nombre}</div>
                    <div className="text-pool-muted text-xs">Doc: {p.documento}</div>
                  </div>
                  <button onClick={() => togglePago(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-condensed font-bold uppercase ${p.pago ? 'bg-pool-green/15 text-pool-green' : 'bg-pool-gold/15 text-pool-gold'}`}>
                    {p.pago ? '✓ Pagó' : 'Pendiente'}
                  </button>
                </Card>
              ))}
              {inscritos.length === 0 && <Card className="p-4 text-pool-muted text-sm">Nadie se inscribió en este pozo.</Card>}
            </div>
          </>
        )}
      </div>
    </main>
  )
}

function picksByPart(picks: SurvivorPick[]): Record<string, Record<string, SurvivorPick>> {
  const out: Record<string, Record<string, SurvivorPick>> = {}
  for (const pk of picks) (out[pk.participante_id] ??= {})[pk.fase] = pk
  return out
}
