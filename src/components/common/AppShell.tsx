'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export type TabKey = 'inicio' | 'predicciones' | 'ranking' | 'grupos' | 'premios'

function Rooster({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  )
}

const ICONS: Record<TabKey, ReactNode> = {
  inicio: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></svg>,
  predicciones: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
  ranking: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>,
  grupos: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>,
  premios: <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" /><path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" /><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" /></svg>,
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'inicio', label: 'Inicio' },
  { key: 'predicciones', label: 'Predice' },
  { key: 'ranking', label: 'Ranking' },
  { key: 'grupos', label: 'Pozos' },
  { key: 'premios', label: 'Premios' },
]

interface Props {
  codigo: string
  active: TabKey
  ligaNombre?: string
  /** Slot a la derecha del header (ej. badge de puntos + avatar). */
  right?: ReactNode
  children: ReactNode
}

export function AppShell({ codigo, active, ligaNombre, right, children }: Props) {
  return (
    <div className="min-h-screen bg-pool-bg text-pool-text flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-pool-header/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href={`/liga/${codigo}/inicio`} className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-pool-gold text-[#231a05] flex items-center justify-center flex-none">
              <Rooster className="w-5 h-5" />
            </span>
            <span className="font-condensed font-extrabold text-lg uppercase tracking-wide truncate">
              {ligaNombre ?? 'Polla Mundialista'}
            </span>
          </Link>

          {/* Nav web */}
          <nav className="hidden md:flex items-center gap-7 font-condensed font-semibold text-[15px] uppercase tracking-wide">
            {TABS.map(t => (
              <Link key={t.key} href={`/liga/${codigo}/${t.key}`}
                className={active === t.key ? 'text-pool-green border-b-2 border-pool-green pb-1' : 'text-pool-muted hover:text-pool-text'}>
                {t.key === 'grupos' ? 'Pozos' : t.key === 'predicciones' ? 'Predicciones' : t.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-none">{right}</div>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-5 pb-24 md:pb-8">{children}</main>

      {/* Tab bar mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-pool-header/95 backdrop-blur border-t border-white/[0.08]">
        <div className="max-w-lg mx-auto grid grid-cols-5">
          {TABS.map(t => (
            <Link key={t.key} href={`/liga/${codigo}/${t.key}`}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-condensed font-semibold uppercase tracking-wide ${
                active === t.key ? 'text-pool-green' : 'text-pool-muted'
              }`}>
              {ICONS[t.key]}
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
