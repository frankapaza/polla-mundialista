'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { PinPad } from '@/components/common/PinPad'
import { Cargando } from '@/components/common/Cargando'
import { fetchLiga, getLigaSession, setLigaSession } from '@/lib/liga'
import type { Liga } from '@/lib/types'

type Paso = 'dni' | 'pin' | 'crear' | 'nuevo'

async function api(path: string, body: Record<string, string>) {
  const r = await fetch(`/api/auth/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  })
  const data = await r.json().catch(() => ({}))
  return { ok: r.ok, status: r.status, data }
}

export default function LigaLoginPage() {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()

  const [liga, setLiga] = useState<Liga | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [paso, setPaso] = useState<Paso>('dni')
  const [documento, setDocumento] = useState('')
  const [nombre, setNombre] = useState('')
  const [pin, setPin] = useState('')
  const [pin1, setPin1] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (getLigaSession(codigo)) { router.replace(`/liga/${codigo}/inicio`); return }
    fetchLiga(codigo).then(l => l ? setLiga(l) : setNotFound(true))
  }, [codigo, router])

  function finish(nom: string) {
    setLigaSession(codigo, { documento: documento.trim(), nombre: nom })
    router.push(`/liga/${codigo}/inicio`)
  }

  async function submitDni(e: React.FormEvent) {
    e.preventDefault()
    if (!documento.trim()) { setError('Ingresá tu documento'); return }
    setLoading(true); setError('')
    const { data } = await api('check', { codigo, documento: documento.trim() })
    setLoading(false)
    setPin(''); setPin1(null)
    if (data.exists && data.hasPin) { setNombre(data.nombre ?? ''); setPaso('pin') }
    else if (data.exists) { setNombre(data.nombre ?? ''); setPaso('crear') }
    else { setPaso('nuevo') }
  }

  // Login: al completar 6 dígitos, validar
  useEffect(() => {
    if (paso !== 'pin' || pin.length !== 6) return
    let cancel = false
    ;(async () => {
      setLoading(true); setError('')
      const { ok, status, data } = await api('login', { codigo, documento: documento.trim(), pin })
      if (cancel) return
      setLoading(false)
      if (ok) { finish(data.nombre ?? nombre); return }
      setPin('')
      if (status === 429) setError('Demasiados intentos fallidos. Esperá unos minutos.')
      else if (data?.intentosRestantes != null) setError(`PIN incorrecto. Te quedan ${data.intentosRestantes} intentos.`)
      else setError('PIN incorrecto.')
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, paso])

  // Crear / Nuevo: doble ingreso (definir + repetir)
  useEffect(() => {
    if ((paso !== 'crear' && paso !== 'nuevo') || pin.length !== 6) return
    if (pin1 === null) { setPin1(pin); setPin(''); setError(''); return }
    if (pin !== pin1) { setError('Los PIN no coinciden. Empezá de nuevo.'); setPin(''); setPin1(null); return }
    let cancel = false
    ;(async () => {
      setLoading(true); setError('')
      const body: Record<string, string> = { codigo, documento: documento.trim(), pin }
      if (paso === 'nuevo') body.nombre = nombre.trim()
      const { ok, data } = await api('set-pin', body)
      if (cancel) return
      setLoading(false)
      if (ok) { finish(data.nombre ?? nombre); return }
      setPin(''); setPin1(null)
      setError(data?.error === 'ya-tiene-pin' ? 'Ya tenías PIN. Ingresá con tu PIN.' : 'No se pudo crear el PIN.')
    })()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, paso, pin1])

  if (notFound) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
      <div className="text-5xl mb-4">🐓</div>
      <h1 className="text-2xl font-condensed font-extrabold uppercase">Liga no encontrada</h1>
      <p className="text-pool-muted mt-2">El código <span className="font-mono text-pool-text">{codigo}</span> no existe.</p>
    </main>
  )
  if (!liga) return <Cargando />

  const tituloPin =
    paso === 'pin' ? 'Ingresá tu PIN'
    : pin1 === null ? 'Creá tu PIN (6 dígitos)'
    : 'Repetí tu PIN'

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gollo-tablet.png" alt="Gollo" className="w-32 h-auto mx-auto mb-2 drop-shadow-2xl" />
          <h1 className="font-condensed font-extrabold text-3xl uppercase tracking-wide">{liga.nombre}</h1>
          <p className="text-pool-muted text-sm mt-1">Polla Mundialista 2026</p>
        </div>

        <div className="rounded-2xl bg-pool-surface border border-white/[0.06] p-6">
          {paso === 'dni' && (
            <form onSubmit={submitDni} className="space-y-4">
              <h2 className="font-condensed font-bold text-lg uppercase text-center">Ingresá a tu polla</h2>
              <div>
                <label className="block text-sm text-pool-muted mb-1.5">Número de documento (DNI)</label>
                <input type="text" value={documento} autoFocus maxLength={20}
                  onChange={e => { setDocumento(e.target.value); setError('') }}
                  placeholder="Ej: 30123456"
                  className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 text-pool-text placeholder-pool-muted/50 focus:outline-none focus:ring-2 focus:ring-pool-green" />
              </div>
              {error && <p className="text-pool-gold text-sm">{error}</p>}
              <Button type="submit" size="lg" disabled={loading} className="w-full">{loading ? '...' : 'Continuar'}</Button>
            </form>
          )}

          {(paso === 'pin' || paso === 'crear' || paso === 'nuevo') && (
            <div className="space-y-5">
              <button onClick={() => { setPaso('dni'); setPin(''); setPin1(null); setError('') }}
                className="text-pool-muted text-xs hover:text-pool-text">← cambiar documento</button>

              {paso === 'nuevo' && (
                <div>
                  <label className="block text-sm text-pool-muted mb-1.5">Tu nombre (primera vez)</label>
                  <input type="text" value={nombre} maxLength={80}
                    onChange={e => { setNombre(e.target.value); setError('') }}
                    placeholder="Ej: Juan García"
                    className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-pool-green" />
                </div>
              )}

              <h2 className="font-condensed font-bold text-lg uppercase text-center">{tituloPin}</h2>
              {nombre && paso !== 'nuevo' && <p className="text-center text-pool-muted-2 text-sm -mt-3">Hola {nombre} 👋</p>}

              {(paso !== 'nuevo' || nombre.trim()) ? (
                <PinPad value={pin} onChange={v => { setPin(v); setError('') }} />
              ) : (
                <p className="text-center text-pool-muted text-sm">Primero escribí tu nombre arriba.</p>
              )}

              {loading && <p className="text-center text-pool-muted text-sm">Verificando…</p>}
              {error && <p className="text-pool-gold text-sm text-center">{error}</p>}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
