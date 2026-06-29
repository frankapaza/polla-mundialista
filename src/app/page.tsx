'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function Home() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [ligas, setLigas] = useState<string[]>([])

  useEffect(() => {
    const out: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('polla_liga_') && !k.startsWith('polla_liga_pozo_')) {
        out.push(k.replace('polla_liga_', ''))
      }
    }
    setLigas(out)
  }, [])

  function entrar(e: React.FormEvent) {
    e.preventDefault()
    const c = codigo.trim().toUpperCase()
    if (c) router.push(`/liga/${c}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex w-16 h-16 rounded-2xl bg-pool-gold text-[#231a05] items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>
          </span>
          <h1 className="font-condensed font-extrabold text-4xl uppercase tracking-wide">Polla Mundialista</h1>
          <p className="text-pool-muted mt-1">Pronósticos del Mundial 2026 con tus amigos</p>
        </div>

        {ligas.length > 0 && (
          <div className="mb-5">
            <p className="text-pool-muted text-xs uppercase font-condensed font-bold tracking-widest mb-2">Tus ligas</p>
            <div className="flex flex-col gap-2">
              {ligas.map(c => (
                <Link key={c} href={`/liga/${c}/inicio`}>
                  <Card className="p-4 flex items-center justify-between hover:border-pool-green/40 transition-colors">
                    <span className="font-condensed font-bold uppercase">Liga {c}</span>
                    <span className="text-pool-green">→</span>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={entrar} className="rounded-2xl bg-pool-surface border border-white/[0.06] p-6 space-y-4">
          <h2 className="font-condensed font-bold text-lg uppercase text-center">Entrá con tu código</h2>
          <input type="text" value={codigo} onChange={e => setCodigo(e.target.value)}
            placeholder="Ej: NZK74Y" maxLength={12}
            className="w-full bg-pool-bg border border-white/10 rounded-lg px-4 py-2.5 text-center font-mono tracking-widest uppercase placeholder-pool-muted/40 focus:outline-none focus:ring-2 focus:ring-pool-green" />
          <Button type="submit" size="lg" className="w-full">Entrar</Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-pool-muted text-xs uppercase">
          <div className="flex-1 h-px bg-white/10" /> o <div className="flex-1 h-px bg-white/10" />
        </div>
        <Link href="/crear"><Button variant="outline" size="lg" className="w-full">🐓 Crear tu propia polla</Button></Link>

        {/* Cómo funciona */}
        <div className="mt-10">
          <h3 className="font-condensed font-extrabold text-lg uppercase text-center mb-4">Cómo funciona</h3>
          <div className="flex flex-col gap-2">
            {([
              ['Creá o sumate', 'Armá tu polla o entrá con el código que te pasaron.'],
              ['Poné tu PIN', 'Entrás con tu DNI + un PIN de 6 dígitos. Nadie juega por vos.'],
              ['Pronosticá', 'Cargá los marcadores antes de que empiece cada partido.'],
              ['Sumá puntos', 'Resultado exacto +3 · acertar el ganador +1. ¡El que más suma, gana!'],
            ] as [string, string][]).map(([t, d], i) => (
              <Card key={i} className="p-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-pool-green/15 text-pool-green flex items-center justify-center font-condensed font-extrabold flex-none">{i + 1}</span>
                <div><div className="font-semibold text-sm">{t}</div><div className="text-pool-muted text-xs">{d}</div></div>
              </Card>
            ))}
          </div>
          <p className="text-center text-pool-muted text-xs mt-4">🐓 Te acompaña <b className="text-pool-gold">Gollo</b>, la mascota oficial de la Polla Mundialista.</p>
        </div>
      </div>
    </main>
  )
}
