'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Grupo } from '@/lib/types'

interface GrupoStats extends Grupo {
  participantes: number
  pronosticos_llenos: number
  total_posible: number
  recaudado: number
  pagaron: number
}

function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function SuperAdminPage() {
  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState('')
  const [errorLogin, setErrorLogin] = useState('')
  const [grupos, setGrupos] = useState<GrupoStats[]>([])
  const [loading, setLoading] = useState(false)
  const [editandoPass, setEditandoPass] = useState<string | null>(null)
  const [nuevoPass, setNuevoPass] = useState('')
  const [mostrarPasses, setMostrarPasses] = useState<Set<string>>(new Set())
  const [guardandoPass, setGuardandoPass] = useState(false)

  const cargarGrupos = useCallback(async () => {
    setLoading(true)
    const { data: gruposData } = await supabase
      .from('grupos').select().order('created_at', { ascending: false })

    if (!gruposData) { setLoading(false); return }

    const { data: participantesData } = await supabase
      .from('participantes').select('id,grupo_id,pago')

    const { data: pronosData } = await supabase
      .from('pronosticos').select('id,participante_id')

    type PartRow = { id: string; grupo_id: string; pago: boolean }
    type PronoRow = { id: string; participante_id: string }

    const stats: GrupoStats[] = gruposData.map((g: Grupo) => {
      const parts = (participantesData ?? [] as PartRow[]).filter((p: PartRow) => p.grupo_id === g.id)
      const partIds = parts.map((p: PartRow) => p.id)
      const pronos = (pronosData ?? [] as PronoRow[]).filter((pr: PronoRow) => partIds.includes(pr.participante_id))
      const pagaron = parts.filter((p: PartRow) => p.pago).length

      return {
        ...g,
        participantes: parts.length,
        pronosticos_llenos: pronos.length,
        total_posible: parts.length * 72,
        recaudado: pagaron * g.costo_inscripcion,
        pagaron,
      }
    })

    setGrupos(stats)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('polla_superadmin') === 'true') {
      setAutenticado(true)
      cargarGrupos()
    }
  }, [cargarGrupos])

  async function login(e: React.FormEvent) {
    e.preventDefault()
    setErrorLogin('')
    const res = await fetch('/api/superadmin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      sessionStorage.setItem('polla_superadmin', 'true')
      setAutenticado(true)
      cargarGrupos()
    } else {
      setErrorLogin('Contraseña incorrecta')
    }
  }

  async function guardarPassword(grupoId: string) {
    if (!nuevoPass.trim()) return
    setGuardandoPass(true)
    await supabase.from('grupos').update({ admin_password: nuevoPass.trim() }).eq('id', grupoId)
    setGuardandoPass(false)
    setEditandoPass(null)
    setNuevoPass('')
    cargarGrupos()
  }

  function toggleMostrarPass(id: string) {
    setMostrarPasses(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!autenticado) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🛡️</div>
          <h1 className="text-2xl font-bold text-white">Super Admin</h1>
          <p className="text-slate-500 text-sm mt-1">Panel global de todos los grupos</p>
        </div>
        <form onSubmit={login} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrorLogin('') }}
            placeholder="Contraseña de superadmin"
            autoFocus
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {errorLogin && <p className="text-red-400 text-sm">{errorLogin}</p>}
          <button type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors">
            Ingresar
          </button>
        </form>
        <div className="mt-4 text-center">
          <Link href="/" className="text-slate-600 hover:text-slate-400 text-sm transition-colors">← Volver al inicio</Link>
        </div>
      </div>
    </main>
  )

  const totalParticipantes = grupos.reduce((s, g) => s + g.participantes, 0)
  const totalPronos = grupos.reduce((s, g) => s + g.pronosticos_llenos, 0)
  const totalRecaudado = grupos.reduce((s, g) => s + g.recaudado, 0)

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">Super Admin</p>
            <h1 className="text-white font-bold text-lg">Todos los grupos</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/crear"
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              + Nuevo grupo
            </Link>
            <button
              onClick={() => { sessionStorage.removeItem('polla_superadmin'); setAutenticado(false) }}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Salir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6">

        {/* Stats globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Grupos', value: grupos.length, color: 'text-white' },
            { label: 'Participantes', value: totalParticipantes, color: 'text-emerald-400' },
            { label: 'Pronósticos', value: totalPronos, color: 'text-blue-400' },
            { label: 'Recaudado', value: `S/ ${totalRecaudado.toFixed(2)}`, color: 'text-amber-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-slate-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tabla de grupos */}
        {loading ? (
          <div className="text-center py-12 text-slate-500">Cargando...</div>
        ) : grupos.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No hay grupos todavía</div>
        ) : (
          <div className="space-y-3">
            {grupos.map(g => (
              <div key={g.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-start gap-3 flex-wrap">

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-white font-semibold">{g.nombre}</h2>
                      <span className="bg-slate-800 text-emerald-400 font-mono text-xs px-2 py-0.5 rounded font-bold">
                        {g.codigo}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Creado {new Date(g.created_at).toLocaleDateString('es-PE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Lima' })}
                    </p>
                  </div>

                  {/* Stats del grupo */}
                  <div className="flex items-center gap-4 text-center flex-shrink-0">
                    <div>
                      <p className="text-white font-bold">{g.participantes}</p>
                      <p className="text-slate-600 text-xs">jugadores</p>
                    </div>
                    <div>
                      <p className="text-blue-400 font-bold">{g.pronosticos_llenos}</p>
                      <p className="text-slate-600 text-xs">pronós.</p>
                    </div>
                    {g.costo_inscripcion > 0 && (
                      <div>
                        <p className="text-amber-400 font-bold">S/ {g.recaudado.toFixed(0)}</p>
                        <p className="text-slate-600 text-xs">{g.pagaron}/{g.participantes} pagó</p>
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href={`/grupo/${g.codigo}/admin`}
                      className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      Admin
                    </Link>
                    <Link href={`/grupo/${g.codigo}/ranking`}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                      Ranking
                    </Link>
                  </div>
                </div>

                {/* Contraseña admin */}
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-500 text-xs">Contraseña admin:</span>

                    {editandoPass === g.id ? (
                      <>
                        <input
                          type="text"
                          value={nuevoPass}
                          onChange={e => setNuevoPass(e.target.value)}
                          placeholder="Nueva contraseña"
                          className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs font-mono w-36 focus:outline-none focus:border-emerald-500"
                          autoFocus
                        />
                        <button
                          onClick={() => setNuevoPass(generarPassword())}
                          className="text-xs text-slate-400 hover:text-white underline transition-colors">
                          Generar
                        </button>
                        <button
                          onClick={() => guardarPassword(g.id)}
                          disabled={guardandoPass}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2 py-1 rounded transition-colors">
                          {guardandoPass ? '...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => { setEditandoPass(null); setNuevoPass('') }}
                          className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        {g.admin_password ? (
                          <>
                            <span className="font-mono text-xs text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                              {mostrarPasses.has(g.id) ? g.admin_password : '••••••••'}
                            </span>
                            <button
                              onClick={() => toggleMostrarPass(g.id)}
                              className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                              {mostrarPasses.has(g.id) ? 'Ocultar' : 'Ver'}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-amber-500">Usa ADMIN_SECRET global</span>
                        )}
                        <button
                          onClick={() => { setEditandoPass(g.id); setNuevoPass(g.admin_password ?? '') }}
                          className="text-xs text-slate-500 hover:text-emerald-400 underline transition-colors ml-1">
                          Cambiar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
