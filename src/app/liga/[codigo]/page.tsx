'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import {
  fetchLiga, fetchPozos, fetchMisParticipaciones,
  getLigaSession, setLigaSession,
} from '@/lib/liga'
import type { Liga } from '@/lib/types'

export default function LigaLoginPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [modo, setModo] = useState<'login' | 'registro'>('login')
  const [documento, setDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getLigaSession(codigo)) { router.replace(`/liga/${codigo}/inicio`); return }
    fetchLiga(codigo).then(l => { if (l) setLiga(l); else setNotFound(true) })
  }, [codigo, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!documento.trim()) { setError('Ingresá tu número de documento'); return }
    setLoading(true); setError('')

    const pozos = await fetchPozos(liga!.id)
    const mias = await fetchMisParticipaciones(pozos, documento.trim())
    const algunaInscripcion = Object.values(mias)[0]

    if (algunaInscripcion) {
      setLigaSession(codigo, { documento: documento.trim(), nombre: algunaInscripcion.nombre })
      router.push(`/liga/${codigo}/inicio`)
      return
    }

    // No está en ningún pozo todavía: pedir nombre para crear su identidad.
    if (modo === 'login') {
      setModo('registro'); setLoading(false)
      setError('No te encontramos en esta liga. Completá tu nombre para unirte.')
      return
    }
    if (!nombre.trim()) { setError('Ingresá tu nombre'); setLoading(false); return }
    setLigaSession(codigo, { documento: documento.trim(), nombre: nombre.trim() })
    router.push(`/liga/${codigo}/grupos`) // a elegir/unirse a un pozo
  }

  if (notFound) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">🐓</div>
      <h1 className="text-2xl font-condensed font-extrabold uppercase">Liga no encontrada</h1>
      <p className="text-pool-muted mt-2">El código <span className="font-mono text-pool-text">{codigo}</span> no existe.</p>
    </main>
  )

  if (!liga) return (
    <main className="min-h-screen flex items-center justify-center text-pool-muted">Cargando…</main>
  )

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-pool-gold text-[#231a05] items-center justify-center mb-3">
            <svg viewBox="0 0 24 24" className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
          </span>
          <h1 className="font-condensed font-extrabold text-3xl uppercase tracking-wide">{liga.nombre}</h1>
          <p className="text-pool-muted text-sm mt-1">Polla Mundialista 2026</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl bg-pool-surface border border-white/[0.06] p-6 space-y-4">
          <h2 className="font-condensed font-bold text-lg uppercase text-center">Ingresá a tu polla</h2>

          <div>
            <label className="block text-sm text-pool-muted mb-1.5">Número de documento (DNI)</label>
            <input type="text" value={documento} autoFocus maxLength={20}
              onChange={e => { setDocumento(e.target.value); setError('') }}
              placeholder="Ej: 30123456"
              className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 text-pool-text placeholder-pool-muted/50 focus:outline-none focus:ring-2 focus:ring-pool-green" />
          </div>

          {modo === 'registro' && (
            <div>
              <label className="block text-sm text-pool-muted mb-1.5">Nombre completo</label>
              <input type="text" value={nombre} maxLength={80}
                onChange={e => { setNombre(e.target.value); setError('') }}
                placeholder="Ej: Juan García"
                className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 text-pool-text placeholder-pool-muted/50 focus:outline-none focus:ring-2 focus:ring-pool-green" />
            </div>
          )}

          {error && <p className="text-pool-gold text-sm">{error}</p>}

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading ? 'Ingresando…' : modo === 'registro' ? 'Unirme a la liga' : 'Ingresar'}
          </Button>
        </form>
      </div>
    </main>
  )
}
