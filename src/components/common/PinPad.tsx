'use client'

import { useState } from 'react'

/**
 * Teclado numérico estilo "calculadora" con los dígitos en posición REVUELTA
 * (anti-espionaje). Construye un PIN de `max` dígitos. Muestra puntos por dígito.
 */
export function PinPad({
  value, onChange, max = 6,
}: { value: string; onChange: (v: string) => void; max?: number }) {
  // Orden revuelto de 0-9, fijo por montaje (se re-revuelve al remontar la pantalla).
  const [orden] = useState<number[]>(() => {
    const a = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  })

  function press(d: number) { if (value.length < max) onChange(value + d) }
  function back() { onChange(value.slice(0, -1)) }

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Puntos */}
      <div className="flex gap-3">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 ${i < value.length ? 'bg-pool-gold border-pool-gold' : 'border-white/25'}`} />
        ))}
      </div>

      {/* Teclado revuelto */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {orden.slice(0, 9).map(d => (
          <button key={d} type="button" onClick={() => press(d)}
            className="h-14 rounded-xl bg-pool-surface border border-white/10 text-2xl font-condensed font-extrabold hover:border-pool-green/50 active:bg-pool-green/15 transition-colors">
            {d}
          </button>
        ))}
        <div />
        <button type="button" onClick={() => press(orden[9])}
          className="h-14 rounded-xl bg-pool-surface border border-white/10 text-2xl font-condensed font-extrabold hover:border-pool-green/50 active:bg-pool-green/15 transition-colors">
          {orden[9]}
        </button>
        <button type="button" onClick={back}
          className="h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-pool-muted hover:text-pool-text">
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Z" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
        </button>
      </div>
    </div>
  )
}
