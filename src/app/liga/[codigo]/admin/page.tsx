'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Flag } from '@/components/common/Flag'
import { formatearFecha, nombreFase, partidoCerrado, calcularPuntos } from '@/lib/utils'
import { fetchLiga, fetchPozos } from '@/lib/liga'
import { standings, fetchSurvivorPicks } from '@/lib/survivor'
import type { Liga, Pozo, Partido, Participante, SurvivorPick, Pronostico } from '@/lib/types'

interface Score { local: string; visitante: string }
type Seccion = 'resultados' | 'pagos' | 'dashboard' | 'config'

export default function LigaAdminPage() {
  const params = useParams()
  const codigo = (params.codigo as string).toUpperCase()

  const [auth, setAuth] = useState(false)
  const [password, setPassword] = useState('')
  const [errAuth, setErrAuth] = useState('')

  const [liga, setLiga] = useState<Liga | null>(null)
  const [pozos, setPozos] = useState<Pozo[]>([])
  const [sel, setSel] = useState<string>('')
  const [seccion, setSeccion] = useState<Seccion>('resultados')
  const [partsByPozo, setPartsByPozo] = useState<Record<string, Participante[]>>({})
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [picks, setPicks] = useState<SurvivorPick[]>([])
  const [pronoMap, setPronoMap] = useState<Record<string, Pronostico>>({})
  const [res, setRes] = useState<Record<string, Score>>({})
  const [cfgCosto, setCfgCosto] = useState('')
  const [cfgCierre, setCfgCierre] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [waMsg, setWaMsg] = useState('')
  const [waCopiado, setWaCopiado] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    const l = await fetchLiga(codigo); if (!l) { setLoading(false); return }
    setLiga(l)
    const ps = await fetchPozos(l.id); setPozos(ps)
    setSel(s => s || ps[0]?.id || '')

    const ids = ps.map(p => p.id)
    const { data: parts } = await supabase.from('participantes').select().in('grupo_id', ids).order('created_at')
    const allParts = (parts ?? []) as Participante[]
    const byPozo: Record<string, Participante[]> = {}
    for (const p of allParts) (byPozo[p.grupo_id] ??= []).push(p)
    setPartsByPozo(byPozo)

    const fases = Array.from(new Set(ps.flatMap(p => p.fases)))
    const { data: pd } = await supabase.from('partidos').select().in('fase', fases).order('numero_partido')
    const partidosData = (pd ?? []) as Partido[]
    setPartidos(partidosData)
    const rmap: Record<string, Score> = {}
    for (const p of partidosData) if (p.goles_local !== null) rmap[p.id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
    setRes(rmap)

    const partIds = allParts.map(p => p.id)
    if (partIds.length) {
      const { data: pr } = await supabase.from('pronosticos').select().in('participante_id', partIds)
      const pm: Record<string, Pronostico> = {}
      for (const p of (pr ?? []) as Pronostico[]) pm[`${p.participante_id}:${p.partido_id}`] = p
      setPronoMap(pm)
    }
    setPicks(await fetchSurvivorPicks(partIds))
    setLoading(false)
  }, [codigo])

  useEffect(() => {
    if (sessionStorage.getItem('polla_admin') === 'true') { setAuth(true); cargar() }
  }, [cargar])

  // Cargar el editor de config cuando cambia el pozo seleccionado
  useEffect(() => {
    const p = pozos.find(x => x.id === sel)
    if (!p) return
    setCfgCosto(p.costo_inscripcion > 0 ? String(p.costo_inscripcion) : '')
    setCfgCierre(p.cierre_inscripciones ? new Date(p.cierre_inscripciones).toISOString().slice(0, 16) : '')
  }, [sel, pozos])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const r = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, codigo }) })
    if (r.ok) { sessionStorage.setItem('polla_admin', 'true'); setAuth(true); cargar() }
    else setErrAuth('Contraseña incorrecta')
  }

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 3500) }

  // Si la sesión de admin venció (401), salir a re-loguear.
  function sesionVencida(status: number) {
    if (status === 401) { sessionStorage.removeItem('polla_admin'); setAuth(false); return true }
    return false
  }

  async function togglePago(p: Participante) {
    const nuevo = !p.pago
    const r = await fetch('/api/admin/pago', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ participanteId: p.id, pago: nuevo }) })
    if (sesionVencida(r.status)) return
    if (r.ok) setPartsByPozo(prev => ({ ...prev, [p.grupo_id]: prev[p.grupo_id].map(x => x.id === p.id ? { ...x, pago: nuevo } : x) }))
  }

  async function resetPin(p: Participante) {
    if (!window.confirm(`¿Resetear el PIN de ${p.nombre}? Va a tener que crear uno nuevo en su próximo ingreso.`)) return
    const r = await fetch('/api/admin/reset-pin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ documento: p.documento }) })
    if (sesionVencida(r.status)) return
    flash(r.ok ? `✅ PIN de ${p.nombre} reseteado` : 'Error al resetear PIN')
  }

  async function guardarResultado(partido: Partido) {
    const sc = res[partido.id]
    if (sc?.local === '' || sc?.local === undefined || sc?.visitante === '' || sc?.visitante === undefined) return
    const gl = parseInt(sc.local), gv = parseInt(sc.visitante)
    const resp = await fetch('/api/admin/resultado', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ partidoId: partido.id, golesLocal: gl, golesVisitante: gv }) })
    const data = await resp.json().catch(() => ({}))
    if (resp.ok) {
      setPartidos(prev => prev.map(p => p.id === partido.id ? { ...p, goles_local: gl, goles_visitante: gv } : p))
      setWaMsg(construirWsp(partido, gl, gv, partsByPozo[sel] ?? []))
      flash(`✅ Resultado guardado (${data.recalculados ?? 0} pronósticos recalculados)`)
    } else if (!sesionVencida(resp.status)) flash('Error al guardar')
  }

  // Arma el mensaje de WhatsApp del resultado (quién acertó), sin escribir nada.
  function construirWsp(partido: Partido, gl: number, gv: number, insc: Participante[]): string {
    const ex: string[] = [], gan: string[] = [], fall: string[] = []
    for (const p of insc) {
      const pr = pronoMap[`${p.id}:${partido.id}`]
      if (!pr) continue
      const pts = pr.infraccion ? 0 : calcularPuntos(pr.goles_local, pr.goles_visitante, gl, gv)
      const linea = `* ${p.nombre} (${pr.goles_local}-${pr.goles_visitante})`
      if (pts === 3) ex.push(linea)
      else if (pts === 1) gan.push(linea)
      else fall.push(linea)
    }
    const L = [`⚽ ${partido.equipo_local} ${gl} - ${gv} ${partido.equipo_visitante} ⚽`, liga?.nombre ?? '']
    if (ex.length) L.push('', '🎯 Exactos (+3 pts)', ...ex)
    if (gan.length) L.push('', '✅ Acertaron el ganador (+1 pt)', ...gan)
    if (fall.length) L.push('', '❌ No acertaron', ...fall)
    if (!ex.length && !gan.length && !fall.length) L.push('', '_Nadie pronosticó este partido._')

    // Puntero del pozo (incluyendo este partido)
    const totalDe = (p: Participante) => {
      let t = 0
      for (const [k, pr] of Object.entries(pronoMap)) {
        if (!k.startsWith(`${p.id}:`)) continue
        const pid = k.slice(p.id.length + 1)
        t += pid === partido.id ? (pr.infraccion ? 0 : calcularPuntos(pr.goles_local, pr.goles_visitante, gl, gv)) : (pr.puntos ?? 0)
      }
      return t
    }
    const orden = insc.map(p => ({ p, t: totalDe(p) })).sort((a, b) => b.t - a.t)
    if (orden.length && orden[0].t > 0) {
      L.push('', '━━━━━━━━━━━━', `🏆 Puntero del grupo: ${orden[0].p.nombre} — ${orden[0].t} pts`, '¡Felicidades! 🎉👏')
    }
    return L.join('\n')
  }

  function copiarWsp() { navigator.clipboard.writeText(waMsg); setWaCopiado(true); setTimeout(() => setWaCopiado(false), 2000) }

  async function resolverSurvivorPozo(pozo: Pozo) {
    const ids = (partsByPozo[pozo.id] ?? []).map(p => p.id)
    const resp = await fetch('/api/admin/survivor-resolver', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pozoId: pozo.id }) })
    const data = await resp.json().catch(() => ({}))
    if (resp.ok) { setPicks(await fetchSurvivorPicks(ids)); flash(`✅ Survivor resuelto: ${data.actualizados ?? 0} picks`) }
    else if (!sesionVencida(resp.status)) flash('Error al resolver')
  }

  async function guardarConfig() {
    const resp = await fetch('/api/admin/pozo-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pozoId: sel, costo: cfgCosto ? parseFloat(cfgCosto) : 0, cierre: cfgCierre || null }) })
    if (resp.ok) {
      setPozos(prev => prev.map(p => p.id === sel ? { ...p, costo_inscripcion: cfgCosto ? parseFloat(cfgCosto) : 0, cierre_inscripciones: cfgCierre ? new Date(cfgCierre).toISOString() : null } : p))
      flash('✅ Configuración guardada')
    } else if (!sesionVencida(resp.status)) flash('Error al guardar config')
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
  const SECCIONES: { id: Seccion; label: string }[] = [
    { id: 'resultados', label: 'Resultados' }, { id: 'pagos', label: 'Pagos' },
    { id: 'dashboard', label: 'Dashboard' }, { id: 'config', label: 'Config' },
  ]

  return (
    <main className="min-h-screen bg-pool-bg text-pool-text">
      <header className="sticky top-0 z-10 bg-pool-header/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-pool-muted text-xs">Admin · {liga?.nombre}</p>
            <h1 className="font-condensed font-extrabold text-lg uppercase">Gestión de pozos</h1>
          </div>
          <button onClick={() => { sessionStorage.removeItem('polla_admin'); setAuth(false) }} className="text-pool-muted hover:text-pool-text text-xs uppercase">Salir</button>
        </div>
        <div className="max-w-5xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {pozos.map(p => (
            <button key={p.id} onClick={() => setSel(p.id)}
              className={`flex-none px-3 py-1.5 rounded-md text-sm font-condensed font-bold uppercase ${sel === p.id ? 'bg-pool-green text-[#06210f]' : 'text-pool-muted hover:bg-white/5'}`}>
              {p.fases.length === 1 ? nombreFase(p.fases[0]) : p.nombre}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-5">
        {loading && <p className="text-pool-muted">Cargando…</p>}
        {msg && <div className="mb-4 rounded-lg bg-pool-green/10 border border-pool-green/30 text-pool-green text-sm px-4 py-2.5">{msg}</div>}

        {waMsg && (
          <Card accent className="p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-condensed font-bold uppercase text-sm">Mensaje de WhatsApp</span>
              <button onClick={() => setWaMsg('')} className="text-pool-muted hover:text-pool-text">✕</button>
            </div>
            <pre className="whitespace-pre-wrap text-sm bg-pool-bg rounded-lg p-3 mb-3 font-sans leading-relaxed">{waMsg}</pre>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={copiarWsp}>{waCopiado ? '✅ Copiado' : '📋 Copiar'}</Button>
              <a href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button size="sm" className="w-full">💬 Enviar por WhatsApp</Button>
              </a>
            </div>
          </Card>
        )}

        {pozo && (
          <>
            <Card className="p-4 mb-4 flex items-center justify-around text-center flex-wrap gap-3">
              <div><div className="text-pool-muted text-xs uppercase">Inscritos</div><div className="font-condensed font-extrabold text-2xl">{inscritos.length}</div></div>
              <div><div className="text-pool-muted text-xs uppercase">Pagaron</div><div className="font-condensed font-extrabold text-2xl text-pool-green">{pagaron}</div></div>
              <div><div className="text-pool-muted text-xs uppercase">Recaudado</div><div className="font-condensed font-extrabold text-2xl text-pool-gold">S/ {(pagaron * pozo.costo_inscripcion).toFixed(0)}</div></div>
              {pozo.modo === 'survivor' && <Button size="sm" onClick={() => resolverSurvivorPozo(pozo)}>Resolver Survivor</Button>}
            </Card>

            {/* Sub-tabs de sección */}
            <div className="flex gap-1 mb-5 border-b border-white/[0.07]">
              {SECCIONES.map(s => (
                <button key={s.id} onClick={() => setSeccion(s.id)}
                  className={`px-4 py-2 text-sm font-condensed font-bold uppercase ${seccion === s.id ? 'text-pool-green border-b-2 border-pool-green' : 'text-pool-muted hover:text-pool-text'}`}>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Survivor standings (siempre visible si es survivor) */}
            {pozo.modo === 'survivor' && seccion !== 'config' && (
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

            {/* ── RESULTADOS ── */}
            {seccion === 'resultados' && (
              <div className="flex flex-col gap-2">
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
                      {p.goles_local !== null && (
                        <Button size="sm" variant="ghost" onClick={() => setWaMsg(construirWsp(p, p.goles_local!, p.goles_visitante!, inscritos))}>WSP</Button>
                      )}
                      <Button size="sm" onClick={() => guardarResultado(p)}>Guardar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* ── PAGOS ── */}
            {seccion === 'pagos' && (
              <div className="flex flex-col gap-2">
                {inscritos.map((p, i) => (
                  <Card key={p.id} className="p-3 flex items-center gap-3">
                    <span className="text-pool-muted text-sm w-6">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.nombre}</div>
                      <div className="text-pool-muted text-xs">Doc: {p.documento}</div>
                    </div>
                    <button onClick={() => resetPin(p)} className="px-2.5 py-1.5 rounded-lg text-xs font-condensed font-bold uppercase bg-white/5 text-pool-muted hover:text-pool-text" title="Resetear PIN">🔑 PIN</button>
                    <button onClick={() => togglePago(p)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-condensed font-bold uppercase ${p.pago ? 'bg-pool-green/15 text-pool-green' : 'bg-pool-gold/15 text-pool-gold'}`}>
                      {p.pago ? '✓ Pagó' : 'Pendiente'}
                    </button>
                  </Card>
                ))}
                {inscritos.length === 0 && <Card className="p-4 text-pool-muted text-sm">Nadie se inscribió en este pozo.</Card>}
              </div>
            )}

            {/* ── DASHBOARD: quién pronosticó ── */}
            {seccion === 'dashboard' && (
              <Card className="p-0 overflow-x-auto">
                {inscritos.length === 0 || partidosPozo.length === 0 ? (
                  <div className="p-6 text-center text-pool-muted text-sm">Sin datos para mostrar.</div>
                ) : (
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07]">
                        <th className="sticky left-0 bg-pool-surface px-3 py-2 text-left text-pool-muted font-condensed uppercase min-w-[150px]">Partido</th>
                        {inscritos.map(p => (
                          <th key={p.id} className="px-2 py-2 text-pool-muted-2 font-medium whitespace-nowrap max-w-[70px] truncate" title={p.nombre}>{p.nombre.split(' ')[0]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {partidosPozo.map(partido => {
                        const jugado = partido.goles_local !== null
                        return (
                          <tr key={partido.id} className="border-b border-white/[0.04]">
                            <td className="sticky left-0 bg-pool-surface px-3 py-2 whitespace-nowrap">
                              <span className="text-pool-text">{partido.equipo_local.split(' ')[0]} v {partido.equipo_visitante.split(' ')[0]}</span>
                              {jugado && <span className="text-pool-gold ml-1">{partido.goles_local}-{partido.goles_visitante}</span>}
                            </td>
                            {inscritos.map(p => {
                              const pr = pronoMap[`${p.id}:${partido.id}`]
                              const revelar = jugado || partidoCerrado(partido.fecha)
                              return (
                                <td key={p.id} className="px-2 py-2 text-center">
                                  {pr ? (revelar ? <span className="text-pool-muted-2">{pr.goles_local}-{pr.goles_visitante}</span> : <span className="text-pool-green">✓</span>)
                                      : <span className="text-pool-gold/70 text-[10px]">falta</span>}
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
            )}

            {/* ── CONFIG: costo/cierre ── */}
            {seccion === 'config' && (
              <Card className="p-5 max-w-md space-y-4">
                <div>
                  <label className="block text-sm text-pool-muted mb-1.5">Costo de inscripción (S/)</label>
                  <input value={cfgCosto} onChange={e => setCfgCosto(e.target.value)} inputMode="decimal" placeholder="0"
                    className="w-full bg-pool-bg border border-white/15 rounded-lg px-4 py-2.5" />
                </div>
                <div>
                  <label className="block text-sm text-pool-muted mb-1.5">Cierre de inscripciones</label>
                  <input type="datetime-local" value={cfgCierre} onChange={e => setCfgCierre(e.target.value)}
                    className="w-full bg-pool-bg border border-white/15 rounded-lg px-4 py-2.5 [color-scheme:dark]" />
                </div>
                <Button onClick={guardarConfig} className="w-full">Guardar configuración</Button>
              </Card>
            )}
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
