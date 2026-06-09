'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { generarCodigo } from '@/lib/utils'

function generarPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CrearForm() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [costo, setCosto] = useState('')
  const [cierre, setCierre] = useState('')
  const [adminPass, setAdminPass] = useState(() => generarPassword())
  const [mostrarPass, setMostrarPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ingresá un nombre para el grupo'); return }
    if (!adminPass.trim()) { setError('La contraseña de admin no puede estar vacía'); return }

    setLoading(true)
    setError('')

    let codigo = generarCodigo()
    for (let i = 0; i < 5; i++) {
      const { data } = await supabase.from('grupos').select('id').eq('codigo', codigo).single()
      if (!data) break
      codigo = generarCodigo()
    }

    const { error: dbError } = await supabase.from('grupos').insert({
      nombre: nombre.trim(),
      codigo,
      costo_inscripcion: costo ? parseFloat(costo) : 0,
      cierre_inscripciones: cierre || null,
      admin_password: adminPass.trim(),
    })

    if (dbError) {
      setError('Error al crear el grupo. Intentá de nuevo.')
      setLoading(false)
      return
    }

    router.push(`/grupo/${codigo}?nuevo=1`)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Nombre del grupo
        </label>
        <input
          type="text"
          value={nombre}
          onChange={e => { setNombre(e.target.value); setError('') }}
          placeholder="Ej: Los Pibes del Trabajo"
          maxLength={60}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Costo de inscripción <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">S/</span>
          <input
            type="number"
            value={costo}
            onChange={e => setCosto(e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Cierre de inscripciones <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          type="datetime-local"
          value={cierre}
          onChange={e => setCierre(e.target.value)}
          className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 [color-scheme:dark]"
        />
        <p className="text-slate-600 text-xs mt-1">
          Después de esta fecha todos podrán ver los pronósticos de los demás
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1.5">
          Contraseña del admin del grupo
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={mostrarPass ? 'text' : 'password'}
              value={adminPass}
              onChange={e => setAdminPass(e.target.value)}
              maxLength={50}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={() => setMostrarPass(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs">
              {mostrarPass ? 'Ocultar' : 'Ver'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setAdminPass(generarPassword())}
            className="flex-shrink-0 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium px-3 rounded-lg transition-colors">
            Generar
          </button>
        </div>
        <p className="text-slate-600 text-xs mt-1">
          Con esta contraseña el admin accede a pagos, resultados y configuración
        </p>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear grupo'}
      </button>

      <Link href="/" className="block text-center text-slate-500 hover:text-slate-400 text-sm transition-colors">
        Volver
      </Link>
    </form>
  )
}
