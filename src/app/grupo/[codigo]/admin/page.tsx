'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatearFecha, calcularPuntos } from '@/lib/utils'
import type { Grupo, Participante, Partido, Pronostico } from '@/lib/types'

type Tab = 'pagos' | 'resultados' | 'config' | 'dashboard'

const GRUPOS_TORNEO = ['A','B','C','D','E','F','G','H','I','J','K','L']

function PartidoResultadoCard({ partido, resultados, savingRes, resMsg, setResultado, guardarResultado, verWhatsApp }: {
  partido: Partido
  resultados: Record<string, { local: string; visitante: string }>
  savingRes: Record<string, boolean>
  resMsg: Record<string, string>
  setResultado: (id: string, side: 'local' | 'visitante', val: string) => void
  guardarResultado: (partido: Partido) => void
  verWhatsApp: (partido: Partido) => void
}) {
  const r = resultados[partido.id] ?? { local: '', visitante: '' }
  const yaIngresado = partido.goles_local !== null
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
      <div className="text-xs text-slate-500 mb-3">
        {formatearFecha(partido.fecha)} · #{partido.numero_partido}
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 text-right">
          <span className="text-white font-semibold text-sm">{partido.equipo_local}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <input type="text" inputMode="numeric" value={r.local}
            onChange={e => setResultado(partido.id, 'local', e.target.value)}
            placeholder="0"
            className="w-10 h-10 bg-slate-800 border border-slate-600 rounded-lg text-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <span className="text-slate-500 font-bold">-</span>
          <input type="text" inputMode="numeric" value={r.visitante}
            onChange={e => setResultado(partido.id, 'visitante', e.target.value)}
            placeholder="0"
            className="w-10 h-10 bg-slate-800 border border-slate-600 rounded-lg text-center text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div className="flex-1">
          <span className="text-white font-semibold text-sm">{partido.equipo_visitante}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">
          {resMsg[partido.id] || (yaIngresado
            ? `Resultado: ${partido.goles_local}-${partido.goles_visitante}`
            : 'Sin resultado')}
        </span>
        <div className="flex items-center gap-2">
          {yaIngresado && (
            <button
              onClick={() => verWhatsApp(partido)}
              className="bg-green-800 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
              💬 Ver WhatsApp
            </button>
          )}
          <button
            onClick={() => guardarResultado(partido)}
            disabled={savingRes[partido.id]}
            className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40">
            {savingRes[partido.id] ? 'Guardando...' : yaIngresado ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminGrupoPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [errorAuth, setErrorAuth] = useState('')

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [partidos, setPartidos] = useState<Partido[]>([])
  const [tab, setTab] = useState<Tab>('pagos')
  const [loading, setLoading] = useState(false)

  // Config
  const [costo, setCosto] = useState('')
  const [cierre, setCierre] = useState('')
  const [campeonConfig, setCampeonConfig] = useState('')
  const [savingConfig, setSavingConfig] = useState(false)
  const [configMsg, setConfigMsg] = useState('')

  // Pagos
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [eliminando, setEliminando] = useState<Record<string, boolean>>({})

  // Resultados
  const [resultados, setResultados] = useState<Record<string, { local: string; visitante: string }>>({})
  const [savingRes, setSavingRes] = useState<Record<string, boolean>>({})
  const [resMsg, setResMsg] = useState<Record<string, string>>({})
  const [waMensaje, setWaMensaje] = useState<string | null>(null)
  const [waCopiado, setWaCopiado] = useState(false)
  const [grupoActivo, setGrupoActivo] = useState('A')
  const [faseResultados, setFaseResultados] = useState<'grupos' | 'eliminatoria'>('grupos')
  const [faseElim, setFaseElim] = useState('16avos')

  const EQUIPOS_MUNDIAL = [
    'Alemania','Arabia Saudita','Argelia','Argentina','Australia','Austria',
    'Bosnia y Herzegovina','Brasil','Bélgica','Cabo Verde','Canadá','Catar',
    'Chequia','Colombia','Congo RD','Corea del Sur','Costa de Marfil','Croacia',
    'Curazao','Ecuador','Egipto','Escocia','España','Estados Unidos',
    'Francia','Ghana','Haití','Inglaterra','Iraq','Irán','Japón','Jordania',
    'Marruecos','México','Noruega','Nueva Zelanda','Panamá','Paraguay',
    'Países Bajos','Portugal','Senegal','Sudáfrica','Suecia','Suiza',
    'Turquía','Túnez','Uruguay','Uzbekistán',
  ]

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    const [{ data: grupoData }, { data: partidosData }] = await Promise.all([
      supabase.from('grupos').select().eq('codigo', codigo).single(),
      supabase.from('partidos').select().order('numero_partido'),
    ])

    if (!grupoData) { router.replace('/'); return }

    const { data: partData } = await supabase
      .from('participantes').select().eq('grupo_id', grupoData.id).order('created_at')

    const g = grupoData as Grupo
    setGrupo(g)
    setParticipantes((partData ?? []) as Participante[])
    setCosto(g.costo_inscripcion > 0 ? String(g.costo_inscripcion) : '')
    setCampeonConfig(g.campeon ?? '')
    setCierre(g.cierre_inscripciones
      ? new Date(g.cierre_inscripciones).toISOString().slice(0, 16)
      : '')

    const ps = (partidosData ?? []) as Partido[]
    setPartidos(ps)
    const resMap: Record<string, { local: string; visitante: string }> = {}
    for (const p of ps) {
      if (p.goles_local !== null) {
        resMap[p.id] = { local: String(p.goles_local), visitante: String(p.goles_visitante) }
      }
    }
    setResultados(resMap)
    setLoading(false)
  }, [codigo, router])

  useEffect(() => {
    if (sessionStorage.getItem('polla_admin') === 'true') {
      setAutenticado(true)
      cargarDatos()
    }
  }, [cargarDatos])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, codigo }),
    })
    if (res.ok) {
      sessionStorage.setItem('polla_admin', 'true')
      setAutenticado(true)
      cargarDatos()
    } else {
      setErrorAuth('Contraseña incorrecta')
    }
  }

  async function guardarConfig(e: React.FormEvent) {
    e.preventDefault()
    if (!grupo) return
    setSavingConfig(true)
    setConfigMsg('')
    const { error } = await supabase.from('grupos').update({
      costo_inscripcion: costo ? parseFloat(costo) : 0,
      cierre_inscripciones: cierre ? new Date(cierre).toISOString() : null,
      campeon: campeonConfig || null,
      updated_by: `admin:${codigo}`,
    }).eq('id', grupo.id)
    setSavingConfig(false)
    if (error) {
      setConfigMsg('Error al guardar')
    } else {
      setConfigMsg('✅ Guardado')
      setGrupo(prev => prev ? {
        ...prev,
        costo_inscripcion: costo ? parseFloat(costo) : 0,
        cierre_inscripciones: cierre ? new Date(cierre).toISOString() : null,
      } : prev)
      setTimeout(() => setConfigMsg(''), 3000)
    }
  }

  async function togglePago(participante: Participante) {
    setToggling(prev => ({ ...prev, [participante.id]: true }))
    const nuevoPago = !participante.pago
    const { error } = await supabase.from('participantes')
      .update({ pago: nuevoPago, updated_by: `admin:${codigo}` }).eq('id', participante.id)
    if (!error) {
      setParticipantes(prev =>
        prev.map(p => p.id === participante.id ? { ...p, pago: nuevoPago } : p)
      )
    }
    setToggling(prev => ({ ...prev, [participante.id]: false }))
  }

  async function eliminarParticipante(participante: Participante) {
    const ok = window.confirm(
      `¿Eliminar a ${participante.nombre} (Doc: ${participante.documento})?\n\nSe borrarán también todos sus pronósticos. Esta acción no se puede deshacer.`
    )
    if (!ok) return

    setEliminando(prev => ({ ...prev, [participante.id]: true }))

    // Borrar primero los pronósticos (FK) y luego el participante
    await supabase.from('pronosticos').delete().eq('participante_id', participante.id)
    const { error } = await supabase.from('participantes').delete().eq('id', participante.id)

    if (error) {
      setEliminando(prev => ({ ...prev, [participante.id]: false }))
      window.alert('No se pudo eliminar. Intentá de nuevo.')
      return
    }

    setParticipantes(prev => prev.filter(p => p.id !== participante.id))
    setEliminando(prev => { const n = { ...prev }; delete n[participante.id]; return n })
  }

  function setResultado(partidoId: string, side: 'local' | 'visitante', val: string) {
    const num = val.replace(/\D/g, '').slice(0, 2)
    setResultados(prev => ({ ...prev, [partidoId]: { ...(prev[partidoId] ?? { local: '', visitante: '' }), [side]: num } }))
    setResMsg(prev => ({ ...prev, [partidoId]: '' }))
  }

  async function guardarResultado(partido: Partido) {
    const r = resultados[partido.id]
    if (!r?.local && r?.local !== '0') return
    if (!r?.visitante && r?.visitante !== '0') return
    const gl = parseInt(r.local)
    const gv = parseInt(r.visitante)

    setSavingRes(prev => ({ ...prev, [partido.id]: true }))
    const { error } = await supabase.from('partidos')
      .update({ goles_local: gl, goles_visitante: gv, updated_by: `admin:${codigo}` }).eq('id', partido.id)

    if (error) {
      setSavingRes(prev => ({ ...prev, [partido.id]: false }))
      setResMsg(prev => ({ ...prev, [partido.id]: 'Error al guardar' }))
      return
    }

    const { data: pronos } = await supabase.from('pronosticos').select().eq('partido_id', partido.id)

    // Recalcular puntos de todos (los puntos no dependen del grupo).
    // No tocamos updated_by: así sigue reflejando quién editó el pronóstico,
    // no el recálculo automático de puntos.
    for (const prono of (pronos ?? []) as Pronostico[]) {
      // Una infracción siempre vale 0, no se recalcula
      const puntos = prono.infraccion ? 0 : calcularPuntos(prono.goles_local, prono.goles_visitante, gl, gv)
      await supabase.from('pronosticos')
        .update({ puntos }).eq('id', prono.id)
    }

    // Solo los pronósticos de ESTE grupo (los partidos son globales entre grupos)
    const idsGrupo = new Set(participantes.map(p => p.id))
    const pronosGrupo = ((pronos ?? []) as Pronostico[]).filter(pr => idsGrupo.has(pr.participante_id))

    setSavingRes(prev => ({ ...prev, [partido.id]: false }))
    setResMsg(prev => ({ ...prev, [partido.id]: `✅ ${pronosGrupo.length} pronósticos actualizados` }))
    setPartidos(prev => prev.map(p => p.id === partido.id ? { ...p, goles_local: gl, goles_visitante: gv } : p))

    const msg = await construirMensajeWhatsApp(partido, gl, gv)
    if (msg) { setWaMensaje(msg); setWaCopiado(false) }
  }

  // Construye el mensaje de WhatsApp de un resultado SIN escribir en la base (solo lectura).
  async function construirMensajeWhatsApp(partido: Partido, gl: number, gv: number): Promise<string | null> {
    const { data: pronos } = await supabase.from('pronosticos').select().eq('partido_id', partido.id)
    const idsGrupo = new Set(participantes.map(p => p.id))
    const pronosGrupo = ((pronos ?? []) as Pronostico[]).filter(pr => idsGrupo.has(pr.participante_id))
    if (pronosGrupo.length === 0) return null

    const nombrePart = (id: string) => participantes.find(p => p.id === id)?.nombre ?? 'Jugador'
    const ptsDe = (pr: Pronostico) => pr.infraccion ? 0 : calcularPuntos(pr.goles_local, pr.goles_visitante, gl, gv)
    const exactos = pronosGrupo.filter(pr => ptsDe(pr) === 3)
    const ganadores = pronosGrupo.filter(pr => ptsDe(pr) === 1)
    const fallaron = pronosGrupo.filter(pr => ptsDe(pr) === 0)

    // Ranking del grupo para felicitar al puntero
    const { data: todos } = await supabase
      .from('pronosticos').select('participante_id, puntos').in('participante_id', [...idsGrupo])
    const totales: Record<string, number> = {}
    for (const pr of (todos ?? []) as { participante_id: string; puntos: number | null }[]) {
      totales[pr.participante_id] = (totales[pr.participante_id] ?? 0) + (pr.puntos ?? 0)
    }
    const lider = Object.entries(totales).sort((a, b) => b[1] - a[1])[0]

    const secciones: string[] = [
      `⚽ *${partido.equipo_local} ${gl} - ${gv} ${partido.equipo_visitante}* ⚽`,
      `_${grupo?.nombre ?? ''}_`,
      '',
    ]
    if (exactos.length > 0)
      secciones.push(`🎯 *Resultado exacto* (+3 pts)\n${exactos.map(pr => `• ${nombrePart(pr.participante_id)}`).join('\n')}`, '')
    if (ganadores.length > 0)
      secciones.push(`✅ *Acertaron el ganador* (+1 pt)\n${ganadores.map(pr => `• ${nombrePart(pr.participante_id)} _(${pr.goles_local}-${pr.goles_visitante})_`).join('\n')}`, '')
    if (fallaron.length > 0)
      secciones.push(`❌ *No acertaron*\n${fallaron.map(pr => `• ${nombrePart(pr.participante_id)} _(${pr.goles_local}-${pr.goles_visitante})_`).join('\n')}`, '')
    if (lider && lider[1] > 0)
      secciones.push('━━━━━━━━━━━━', `🏆 *Puntero del grupo:* ${nombrePart(lider[0])} — *${lider[1]} pts*`, '¡Felicidades! 🎉👏')

    return secciones.join('\n').replace(/\n{3,}/g, '\n\n').trim()
  }

  // Ver el WhatsApp de un resultado YA cargado, sin re-guardar ni recalcular nada.
  async function verWhatsApp(partido: Partido) {
    if (partido.goles_local === null || partido.goles_visitante === null) return
    const msg = await construirMensajeWhatsApp(partido, partido.goles_local, partido.goles_visitante)
    setWaMensaje(msg ?? `⚽ *${partido.equipo_local} ${partido.goles_local} - ${partido.goles_visitante} ${partido.equipo_visitante}*\n_Todavía no hay pronósticos de este grupo._`)
    setWaCopiado(false)
  }

  if (!autenticado) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-slate-950">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h1 className="text-2xl font-bold text-white">Admin del grupo</h1>
            <p className="text-slate-400 text-sm mt-1">Ingresá la contraseña de administrador</p>
          </div>
          <form onSubmit={login} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrorAuth('') }}
              placeholder="Contraseña de admin"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            {errorAuth && <p className="text-red-400 text-sm">{errorAuth}</p>}
            <button type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors">
              Ingresar
            </button>
            <Link href={`/grupo/${codigo}/ranking`}
              className="block text-center text-slate-500 hover:text-slate-400 text-sm transition-colors">
              Volver al ranking
            </Link>
          </form>
        </div>
      </main>
    )
  }

  if (loading || !grupo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Cargando...</div>
      </main>
    )
  }

  const totalPagaron = participantes.filter(p => p.pago).length
  const totalPendientes = participantes.length - totalPagaron
  const recaudado = totalPagaron * grupo.costo_inscripcion
  const tieneCosto = grupo.costo_inscripcion > 0
  const inscripcionesCerradas = grupo.cierre_inscripciones
    ? new Date(grupo.cierre_inscripciones) <= new Date()
    : false

  const partidosPorGrupo = GRUPOS_TORNEO.reduce((acc, g) => {
    acc[g] = partidos.filter(p => p.grupo_torneo === g && p.fase === 'grupos')
    return acc
  }, {} as Record<string, Partido[]>)

  const FASES_ELIM: { id: string; label: string }[] = [
    { id: '16avos', label: '16avos' },
    { id: 'octavos', label: 'Octavos' },
    { id: 'cuartos', label: 'Cuartos' },
    { id: 'semis', label: 'Semifinal' },
    { id: 'tercero', label: '3° Puesto' },
    { id: 'final', label: 'Final' },
  ]
  const partidosElim = partidos.filter(p => p.fase !== 'grupos')

  const TABS: { id: Tab; label: string }[] = [
    { id: 'pagos', label: 'Pagos' },
    { id: 'resultados', label: 'Resultados' },
    { id: 'config', label: 'Configuración' },
    { id: 'dashboard', label: 'Dashboard' },
  ]

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">Admin · <span className="font-mono">{codigo}</span></p>
            <h1 className="text-white font-bold text-lg">{grupo.nombre}</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href={`/grupo/${codigo}/ranking`}
              className="text-slate-400 hover:text-slate-300 text-xs transition-colors">
              Ver ranking
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('polla_admin'); setAutenticado(false) }}
              className="text-slate-500 hover:text-slate-400 text-xs transition-colors">
              Salir
            </button>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* ── PAGOS ── */}
        {tab === 'pagos' && (
          <div>
            {tieneCosto && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-5">
                <div className="flex items-center justify-around gap-4 flex-wrap">
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Inscripción</p>
                    <p className="text-white font-bold">S/ {grupo.costo_inscripcion}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Pagaron</p>
                    <p className="text-emerald-400 font-bold">{totalPagaron}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Pendientes</p>
                    <p className="text-amber-400 font-bold">{totalPendientes}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500">Recaudado</p>
                    <p className="text-emerald-400 font-bold">S/ {recaudado.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}

            {participantes.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="text-4xl mb-3">👥</div>
                <p>Nadie se anotó todavía</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participantes.map((p, i) => (
                  <div key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-slate-600 text-sm w-6 flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold truncate">{p.nombre}</p>
                      <p className="text-slate-600 text-xs">Doc: {p.documento}</p>
                    </div>
                    {tieneCosto ? (
                      <button
                        onClick={() => togglePago(p)}
                        disabled={toggling[p.id]}
                        className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                          p.pago
                            ? 'bg-emerald-900/60 text-emerald-400 hover:bg-emerald-900'
                            : 'bg-amber-900/60 text-amber-400 hover:bg-amber-900'
                        }`}>
                        {toggling[p.id] ? '...' : p.pago ? '✓ Pagó' : '⏳ Pendiente'}
                      </button>
                    ) : (
                      <span className="text-slate-600 text-xs">Sin costo</span>
                    )}
                    <button
                      onClick={() => eliminarParticipante(p)}
                      disabled={eliminando[p.id]}
                      title="Eliminar participante"
                      className="flex-shrink-0 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-500 hover:bg-red-900/60 hover:text-red-300 transition-colors disabled:opacity-50">
                      {eliminando[p.id] ? '...' : '🗑'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!tieneCosto && participantes.length > 0 && (
              <p className="text-slate-600 text-xs text-center mt-4">
                Configurá un costo en la pestaña Configuración para gestionar pagos
              </p>
            )}
          </div>
        )}

        {/* ── RESULTADOS ── */}
        {tab === 'resultados' && (
          <div>
            {/* WhatsApp share */}
            {waMensaje && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 mb-4">
                <p className="text-green-400 text-xs font-semibold mb-2">Compartir resultado</p>
                <pre className="text-slate-300 text-xs whitespace-pre-wrap font-sans bg-slate-900 rounded-lg p-3 mb-3 leading-relaxed">{waMensaje}</pre>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(waMensaje); setWaCopiado(true); setTimeout(() => setWaCopiado(false), 2500) }}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors">
                    {waCopiado ? '✅ Copiado' : '📋 Copiar'}
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(waMensaje)}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors text-center">
                    💬 WhatsApp
                  </a>
                  <button onClick={() => setWaMensaje(null)}
                    className="px-3 text-slate-500 hover:text-slate-300 text-xs transition-colors">
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Sub-tabs: Grupos / Eliminatoria */}
            <div className="flex gap-2 mb-4">
              <button onClick={() => setFaseResultados('grupos')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${faseResultados === 'grupos' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                Fase de Grupos
              </button>
              <button onClick={() => setFaseResultados('eliminatoria')}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${faseResultados === 'eliminatoria' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                Eliminatoria
              </button>
            </div>

            {faseResultados === 'grupos' && (
              <>
                <div className="flex gap-1 overflow-x-auto mb-4">
                  {GRUPOS_TORNEO.map(g => (
                    <button key={g} onClick={() => setGrupoActivo(g)}
                      className={`flex-shrink-0 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                        grupoActivo === g ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
                <h2 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Grupo {grupoActivo}</h2>
                <div className="space-y-3">
                  {partidosPorGrupo[grupoActivo]?.map(partido => <PartidoResultadoCard key={partido.id} partido={partido} resultados={resultados} savingRes={savingRes} resMsg={resMsg} setResultado={setResultado} guardarResultado={guardarResultado} verWhatsApp={verWhatsApp} />)}
                </div>
              </>
            )}

            {faseResultados === 'eliminatoria' && (
              <>
                {partidosElim.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <p className="text-4xl mb-3">🏆</p>
                    <p>No hay partidos de eliminatoria cargados aún</p>
                    <p className="text-xs mt-2">Pedile al superadmin que corra el seed_knockout.sql</p>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-1 overflow-x-auto mb-4">
                      {FASES_ELIM.map(f => (
                        <button key={f.id} onClick={() => setFaseElim(f.id)}
                          className={`flex-shrink-0 px-3 py-1 rounded-md text-sm font-semibold transition-colors ${
                            faseElim === f.id ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                          }`}>
                          {f.label}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-3">
                      {partidosElim.filter(p => p.fase === faseElim).map(partido => <PartidoResultadoCard key={partido.id} partido={partido} resultados={resultados} savingRes={savingRes} resMsg={resMsg} setResultado={setResultado} guardarResultado={guardarResultado} verWhatsApp={verWhatsApp} />)}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── CONFIGURACIÓN ── */}
        {tab === 'config' && (
          <form onSubmit={guardarConfig} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Costo de inscripción <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" value={costo}
                  onChange={e => { setCosto(e.target.value); setConfigMsg('') }}
                  placeholder="0" min="0" step="0.01"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-7 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Cierre de inscripciones <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <input type="datetime-local" value={cierre}
                onChange={e => { setCierre(e.target.value); setConfigMsg('') }}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]" />
              <p className="text-slate-600 text-xs mt-1">
                Después de esta fecha todos podrán ver los pronósticos de los demás
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                🏆 Campeón del grupo <span className="text-slate-500 font-normal">(quién ganó la polla)</span>
              </label>
              <select value={campeonConfig}
                onChange={e => { setCampeonConfig(e.target.value); setConfigMsg('') }}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">— Sin campeón aún —</option>
                {participantes.map(p => (
                  <option key={p.id} value={p.nombre}>{p.nombre}</option>
                ))}
              </select>
              <p className="text-slate-600 text-xs mt-1">
                Seleccioná al ganador de la polla para mostrarlo en el ranking
              </p>
            </div>
            <div className="flex items-center justify-between pt-1">
              {configMsg ? (
                <span className={`text-sm ${configMsg.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {configMsg}
                </span>
              ) : <span />}
              <button type="submit" disabled={savingConfig}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-50">
                {savingConfig ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        )}

        {/* ── DASHBOARD ── */}
        {tab === 'dashboard' && (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">{inscripcionesCerradas ? '📊' : '🔒'}</div>
            <h2 className="text-xl font-bold text-white mb-2">
              {inscripcionesCerradas ? 'Dashboard disponible' : 'Dashboard bloqueado para participantes'}
            </h2>
            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-6">
              {inscripcionesCerradas
                ? 'Las inscripciones están cerradas. Todos pueden ver los pronósticos.'
                : grupo.cierre_inscripciones
                  ? <>Se desbloquea el{' '}
                      <strong className="text-white">
                        {new Date(grupo.cierre_inscripciones).toLocaleString('es-PE', {
                          day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                        })}
                      </strong>.
                    </>
                  : 'Configurá una fecha de cierre para habilitarlo automáticamente.'
              }
            </p>
            <Link href={`/grupo/${codigo}/dashboard?admin=1`}
              className="inline-block bg-amber-600 hover:bg-amber-500 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
              Ver dashboard ahora →
            </Link>
            {!inscripcionesCerradas && (
              <p className="text-slate-600 text-xs mt-3">Como admin podés verlo aunque no esté cerrado</p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
