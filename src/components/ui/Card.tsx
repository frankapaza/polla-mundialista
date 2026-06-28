import type { HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  accent?: boolean // borde verde de acento
}

/** Tarjeta base de la polla (superficie oscura, borde sutil). */
export function Card({ accent = false, className = '', ...props }: Props) {
  return (
    <div
      {...props}
      className={`rounded-2xl bg-pool-surface ${accent ? 'border border-pool-green/30' : 'border border-white/[0.06]'} ${className}`}
    />
  )
}
