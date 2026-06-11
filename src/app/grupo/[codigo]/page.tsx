'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { Grupo } from '@/lib/types'

const STORAGE_KEY = (codigo: string) => `polla_participant_${codigo}`

function CompartirWhatsApp({ grupo, codigo }: { grupo: Grupo; codigo: string }) {
  const [copiado, setCopiado] = useState(false)
  const url = typeof window !== 'undefined' ? `${window.location.origin}/grupo/${codigo}` : ''

  const cierreTexto = grupo.cierre_inscripciones
    ? `⏰ Inscribite antes del ${new Date(grupo.cierre_inscripciones).toLocaleString('es-PE', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`
    : ''
  const costoTexto = grupo.costo_inscripcion > 0
    ? `💵 Inscripción: S/ ${grupo.costo_inscripcion}`
    : ''

  const mensaje = [
    `⚽ *Polla del Mundial 2026* ⚽`,
    `Te invito a jugar en el grupo *${grupo.nombre}*`,
    ``,
    `🔗 Entrá acá:`,
    url,
    ``,
    `📝 O usá el código: *${codigo}*`,
    costoTexto,
    cierreTexto,
    ``,
    `¡A pronosticar! 🏆`,
  ].filter(l => l !== undefined && !(l === '' && false)).join('\n').replace(/\n{3,}/g, '\n\n').trim()

  function copiar() {
    navigator.clipboard.writeText(mensaje)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`

  return (
    <div className="mt-4 bg-slate-900 border border-emerald-800 rounded-xl p-4 text-left">
      <p className="text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
        ✅ Grupo creado · Invitá a tus amigos
      </p>
      <pre className="text-slate-300 text-xs whitespace-pre-wrap break-words font-sans bg-slate-800 rounded-lg px-3 py-2.5 mb-3 leading-relaxed">
        {mensaje}
      </pre>
      <div className="flex gap-2">
        <button
          onClick={copiar}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
        >
          {copiado ? '✅ Copiado' : '📋 Copiar mensaje'}
        </button>
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-green-700 hover:bg-green-600 text-white text-xs font-semibold py-2 rounded-lg transition-colors text-center"
        >
          💬 Abrir WhatsApp
        </a>
      </div>
    </div>
  )
}

export default function GrupoPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()
  const esNuevo = searchParams.get('nuevo') === '1'

  const [grupo, setGrupo] = useState<Grupo | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [campeon, setCampeon] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const EQUIPOS = [
    'Alemania','Arabia Saudita','Argelia','Argentina','Australia','Austria',
    'Bosnia y Herzegovina','Brasil','Bélgica','Cabo Verde','Canadá','Catar',
    'Chequia','Colombia','Congo RD','Corea del Sur','Costa de Marfil','Croacia',
    'Curazao','Ecuador','Egipto','Escocia','España','Estados Unidos',
    'Francia','Ghana','Haití','Inglaterra','Iraq','Irán','Japón','Jordania',
    'Marruecos','México','Noruega','Nueva Zelanda','Panamá','Paraguay',
    'Países Bajos','Portugal','Senegal','Sudáfrica','Suecia','Suiza',
    'Turquía','Túnez','Uruguay','Uzbekistán',
  ]

  useEffect(() => {
    // Si ya está registrado, ir a pronósticos
    const saved = localStorage.getItem(STORAGE_KEY(codigo))
    if (saved) {
      const { participanteId } = JSON.parse(saved)
      if (participanteId) {
        router.replace(`/grupo/${codigo}/pronosticos`)
        return
      }
    }

    // Cargar datos del grupo
    supabase
      .from('grupos')
      .select()
      .eq('codigo', codigo)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return }
        setGrupo(data as Grupo)
      })
  }, [codigo, router])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!documento.trim()) { setError('Ingresá tu número de documento'); return }

    setLoading(true)
    setError('')

    const { data: existing } = await supabase
      .from('participantes')
      .select()
      .eq('grupo_id', grupo!.id)
      .eq('documento', documento.trim())
      .maybeSingle()

    if (!existing) {
      setError('No encontramos ese documento en este grupo. ¿Es tu primera vez? Registrate abajo.')
      setLoading(false)
      return
    }

    localStorage.setItem(STORAGE_KEY(codigo), JSON.stringify({
      participanteId: existing.id,
      nombre: existing.nombre,
      grupoId: grupo!.id,
    }))
    router.push(`/grupo/${codigo}/pronosticos`)
  }

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresá tu nombre'); return }
    if (!documento.trim()) { setError('Ingresá tu número de documento'); return }

    setLoading(true)
    setError('')

    const { data, error: dbError } = await supabase
      .from('participantes')
      .insert({ grupo_id: grupo!.id, nombre: nombre.trim(), documento: documento.trim(), prediccion_campeon: campeon || null })
      .select()
      .single()

    if (dbError) {
      if (dbError.code === '23505') {
        // Ya registrado — buscar por documento y reconectar sesión
        const { data: existing } = await supabase
          .from('participantes')
          .select()
          .eq('grupo_id', grupo!.id)
          .eq('documento', documento.trim())
          .single()

        if (existing) {
          localStorage.setItem(STORAGE_KEY(codigo), JSON.stringify({
            participanteId: existing.id,
            nombre: existing.nombre,
            grupoId: grupo!.id,
          }))
          router.push(`/grupo/${codigo}/pronosticos`)
          return
        }
        setError('Ya existe alguien con ese documento pero no se pudo recuperar la sesión.')
      } else {
        setError('Error al registrarse. Intentá de nuevo.')
      }
      setLoading(false)
      return
    }

    localStorage.setItem(STORAGE_KEY(codigo), JSON.stringify({
      participanteId: data.id,
      nombre: data.nombre,
      grupoId: grupo!.id,
    }))

    router.push(`/grupo/${codigo}/pronosticos`)
  }

  if (notFound) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-2">Grupo no encontrado</h1>
          <p className="text-slate-400 mb-6">El código <span className="text-white font-mono font-bold">{codigo}</span> no existe.</p>
          <Link href="/" className="text-emerald-400 hover:text-emerald-300 transition-colors">
            Volver al inicio
          </Link>
        </div>
      </main>
    )
  }

  if (!grupo) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Cargando...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-950">
      <div className="w-full max-w-md">

        {/* Header del grupo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚽</div>
          <h1 className="text-3xl font-bold text-white">{grupo.nombre}</h1>
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-slate-400 text-sm">Código:</span>
            <span className="bg-slate-800 text-emerald-400 font-mono font-bold px-3 py-1 rounded-lg text-sm tracking-widest">
              {codigo}
            </span>
          </div>
          {esNuevo && <CompartirWhatsApp grupo={grupo} codigo={codigo} />}
        </div>

        {/* Formulario de login (entrar con DNI) */}
        {modo === 'login' ? (
          <form onSubmit={handleLogin} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white text-center">
              Ingresá a tus pronósticos
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Número de documento (DNI/Pasaporte)
              </label>
              <input
                type="text"
                value={documento}
                onChange={e => { setDocumento(e.target.value); setError('') }}
                placeholder="Ej: 30123456"
                maxLength={20}
                autoFocus
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>

            <p className="text-center text-sm text-slate-400">
              ¿Es tu primera vez?{' '}
              <button
                type="button"
                onClick={() => { setModo('registro'); setError('') }}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Registrate acá
              </button>
            </p>
          </form>
        ) : (
          /* Formulario de registro */
          <form onSubmit={handleRegistro} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white text-center">
              Registrate para jugar
            </h2>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nombre completo
              </label>
              <input
                type="text"
                value={nombre}
                onChange={e => { setNombre(e.target.value); setError('') }}
                placeholder="Ej: Juan García"
                maxLength={80}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Número de documento (DNI/Pasaporte)
              </label>
              <input
                type="text"
                value={documento}
                onChange={e => { setDocumento(e.target.value); setError('') }}
                placeholder="Ej: 30123456"
                maxLength={20}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                🏆 ¿Quién ganará el Mundial? <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <select
                value={campeon}
                onChange={e => setCampeon(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">— Elige un campeón —</option>
                {EQUIPOS.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Registrando...' : 'Ingresar y hacer pronósticos'}
            </button>

            <p className="text-center text-sm text-slate-400">
              ¿Ya estás registrado?{' '}
              <button
                type="button"
                onClick={() => { setModo('login'); setError('') }}
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Ingresá con tu DNI
              </button>
            </p>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link
            href={`/grupo/${codigo}/ranking`}
            className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
          >
            Ver ranking del grupo →
          </Link>
        </div>
      </div>
    </main>
  )
}
