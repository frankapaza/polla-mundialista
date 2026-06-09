'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { formatearFecha, semaforoColor, formatearCountdown, partidoYaEmpezó } from '@/lib/utils'
import type { Partido, Grupo } from '@/lib/types'

interface MiGrupo { codigo: string; nombre: string; participanteNombre: string }

const FASE_LABEL: Record<string, string> = {
  grupos: 'Grupos', octavos: 'Octavos', cuartos: 'Cuartos',
  semis: 'Semifinal', tercero: '3° Puesto', final: 'Final',
}

export default function Home() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [misGrupos, setMisGrupos] = useState<MiGrupo[]>([])
  const [partidosHoy, setPartidosHoy] = useState<Partido[]>([])
  const [, setTick] = useState(0)

  useEffect(() => {
    // Mis grupos desde localStorage
    const grupos: MiGrupo[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith('polla_participant_')) {
        try {
          const val = JSON.parse(localStorage.getItem(key)!)
          if (val?.grupoId) {
            const cod = key.replace('polla_participant_', '')
            grupos.push({ codigo: cod, nombre: val.grupoNombre ?? cod, participanteNombre: val.nombre ?? '' })
          }
        } catch {}
      }
    }
    setMisGrupos(grupos)

    // Partidos de hoy y mañana
    const ahora = new Date()
    const en48h = new Date(ahora.getTime() + 48 * 60 * 60 * 1000)
    supabase.from('partidos')
      .select()
      .gte('fecha', ahora.toISOString())
      .lte('fecha', en48h.toISOString())
      .order('fecha')
      .then(({ data }) => setPartidosHoy((data ?? []) as Partido[]))

    const interval = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [])

  // Enriquecer misGrupos con nombre real del grupo
  useEffect(() => {
    if (misGrupos.length === 0) return
    const codigos = misGrupos.map(g => g.codigo)
    supabase.from('grupos').select('codigo,nombre').in('codigo', codigos)
      .then(({ data }) => {
        if (!data) return
        setMisGrupos(prev => prev.map(g => {
          const found = (data as Grupo[]).find(d => d.codigo === g.codigo)
          return found ? { ...g, nombre: found.nombre } : g
        }))
      })
  }, [misGrupos.length]) // eslint-disable-line react-hooks/exhaustive-deps

  function unirse() {
    const c = codigo.trim().toUpperCase()
    if (c.length < 4) { setError('Ingresá el código del grupo'); return }
    router.push(`/grupo/${c}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 bg-slate-950">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Polla Mundialista</h1>
        <p className="text-emerald-400 text-xl font-semibold mt-1">FIFA World Cup 2026™</p>
        <p className="text-slate-400 mt-2 text-sm">USA · Canadá · México &nbsp;|&nbsp; 11 jun – 19 jul</p>
      </div>

      <div className="w-full max-w-md space-y-4">

        {/* Mis grupos */}
        {misGrupos.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">Mis grupos</p>
            <div className="space-y-2">
              {misGrupos.map(g => (
                <Link key={g.codigo} href={`/grupo/${g.codigo}/pronosticos`}
                  className="flex items-center justify-between bg-slate-800 hover:bg-slate-700 rounded-xl px-4 py-3 transition-colors">
                  <div>
                    <p className="text-white font-semibold text-sm">{g.nombre}</p>
                    <p className="text-slate-500 text-xs">{g.participanteNombre}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 font-mono text-xs">{g.codigo}</span>
                    <span className="text-slate-500">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Próximos partidos (48h) */}
        {partidosHoy.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-3">
              Próximos partidos
            </p>
            <div className="space-y-2">
              {partidosHoy.map(p => {
                const color = semaforoColor(p.fecha)
                const cd = formatearCountdown(p.fecha)
                const enVivo = partidoYaEmpezó(p.fecha) && p.goles_local === null
                const jugado = p.goles_local !== null
                const dotColors = { red: 'bg-red-500 animate-pulse', yellow: 'bg-amber-400', green: 'bg-emerald-500', closed: 'bg-slate-600', open: 'bg-slate-500' }
                return (
                  <div key={p.id} className="flex items-center gap-3 py-1.5">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[color]}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">
                        {p.equipo_local} <span className="text-slate-500">vs</span> {p.equipo_visitante}
                      </p>
                      <p className="text-slate-500 text-xs">{formatearFecha(p.fecha)} · {FASE_LABEL[p.fase] ?? p.fase}{p.grupo_torneo ? ` ${p.grupo_torneo}` : ''}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {jugado ? (
                        <span className="text-slate-400 text-sm font-bold">{p.goles_local}-{p.goles_visitante}</span>
                      ) : enVivo ? (
                        <span className="text-amber-400 text-xs font-medium animate-pulse">🔴 En juego</span>
                      ) : cd ? (
                        <span className={`text-xs font-semibold ${color === 'red' ? 'text-red-400' : color === 'yellow' ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {cd}
                        </span>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Crear / Unirse */}
        <Link href="/crear"
          className="block bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-2xl p-6 text-center">
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-white font-bold text-lg">Crear un grupo</div>
          <div className="text-emerald-200 text-sm mt-1">Generá un link y compartilo con tus amigos</div>
        </Link>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="text-center mb-4">
            <div className="text-3xl mb-2">🔗</div>
            <div className="text-white font-bold text-lg">Tengo un código</div>
            <div className="text-slate-400 text-sm mt-1">Ingresá al grupo de un amigo</div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={codigo}
              onChange={e => { setCodigo(e.target.value.toUpperCase()); setError('') }}
              onKeyDown={e => e.key === 'Enter' && unirse()}
              placeholder="Ej: ABC123"
              maxLength={8}
              className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase tracking-widest"
            />
            <button onClick={unirse}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
              Entrar
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <p className="text-slate-600 text-xs text-center pt-4">
          Resultado exacto 3pts · ganador/empate correcto 1pt
        </p>
      </div>
    </main>
  )
}
