'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function Gollo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

export default function CrearPage() {
  const router = useRouter()
  const [nombre, setNombre] = useState('')
  const [pass, setPass] = useState('')
  const [codigo, setCodigo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function crear(e: React.FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) { setError('Ponele un nombre a tu polla'); return }
    if (!pass.trim()) { setError('Elegí una contraseña de admin'); return }
    setLoading(true); setError('')
    const r = await fetch('/api/liga/crear', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombre.trim(), adminPassword: pass.trim() }) })
    const data = await r.json().catch(() => ({}))
    setLoading(false)
    if (r.ok && data.codigo) setCodigo(data.codigo)
    else setError('No se pudo crear. Probá de nuevo.')
  }

  if (codigo) {
    const url = typeof window !== 'undefined' ? `${window.location.origin}/liga/${codigo}` : ''
    const wsp = `⚽ *${nombre}* — Polla Mundialista 2026 🐓\nSumate: ${url}\nO con el código: *${codigo}*`
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-3">🐓🎉</div>
          <h1 className="font-condensed font-extrabold text-3xl uppercase">¡Polla creada!</h1>
          <p className="text-pool-muted mt-1 mb-5">Gollo ya tiene todo listo. Compartí el código:</p>
          <Card accent className="p-5 mb-4">
            <div className="text-pool-muted text-xs uppercase">Código de tu polla</div>
            <div className="font-mono font-extrabold text-3xl text-pool-gold tracking-widest my-1">{codigo}</div>
          </Card>
          <div className="flex flex-col gap-2">
            <a href={`https://wa.me/?text=${encodeURIComponent(wsp)}`} target="_blank" rel="noopener noreferrer">
              <Button className="w-full">💬 Invitar por WhatsApp</Button>
            </a>
            <Button variant="ghost" className="w-full" onClick={() => router.push(`/liga/${codigo}`)}>Ir a mi polla →</Button>
          </div>
          <p className="text-pool-muted text-xs mt-4">Anotá la contraseña de admin para cargar resultados: <b className="text-pool-text">{pass}</b></p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-pool-gold text-[#231a05] items-center justify-center mb-4"><Gollo /></span>
          <h1 className="font-condensed font-extrabold text-3xl uppercase tracking-wide">Creá tu polla</h1>
          <p className="text-pool-muted mt-1">Gollo te arma el torneo completo en un toque</p>
        </div>
        <form onSubmit={crear} className="rounded-2xl bg-pool-surface border border-white/[0.06] p-6 space-y-4">
          <div>
            <label className="block text-sm text-pool-muted mb-1.5">Nombre de la polla</label>
            <input value={nombre} autoFocus maxLength={60} onChange={e => { setNombre(e.target.value); setError('') }}
              placeholder="Ej: Los Cracks de la Oficina"
              className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pool-green" />
          </div>
          <div>
            <label className="block text-sm text-pool-muted mb-1.5">Contraseña de admin <span className="text-pool-muted/60">(para cargar resultados)</span></label>
            <input value={pass} maxLength={40} onChange={e => { setPass(e.target.value); setError('') }}
              placeholder="Una que recuerdes"
              className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pool-green" />
          </div>
          {error && <p className="text-pool-gold text-sm">{error}</p>}
          <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? 'Creando…' : 'Crear mi polla 🐓'}</Button>
        </form>
        <div className="text-center mt-4">
          <Link href="/" className="text-pool-muted hover:text-pool-text text-sm">← Volver</Link>
        </div>
      </div>
    </main>
  )
}
