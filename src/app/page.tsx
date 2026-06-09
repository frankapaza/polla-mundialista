'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')

  function unirse() {
    const c = codigo.trim().toUpperCase()
    if (c.length < 4) { setError('Ingresá el código del grupo'); return }
    router.push(`/grupo/${c}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-slate-950">
      <div className="text-center mb-12">
        <div className="text-5xl mb-3">⚽</div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
          Polla Mundialista
        </h1>
        <p className="text-emerald-400 text-xl font-semibold mt-1">FIFA World Cup 2026™</p>
        <p className="text-slate-400 mt-3 text-sm">
          USA · Canadá · México &nbsp;|&nbsp; 11 jun – 19 jul
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        <Link
          href="/crear"
          className="block bg-emerald-600 hover:bg-emerald-500 transition-colors rounded-2xl p-6 text-center"
        >
          <div className="text-3xl mb-2">🏆</div>
          <div className="text-white font-bold text-lg">Crear un grupo</div>
          <div className="text-emerald-200 text-sm mt-1">
            Generá un link y compartilo con tus amigos
          </div>
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
            <button
              onClick={unirse}
              className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap"
            >
              Entrar
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>
      </div>

      <p className="text-slate-600 text-xs mt-16">
        Sistema de puntos: resultado exacto 3pts · ganador/empate correcto 1pt
      </p>
    </main>
  )
}
