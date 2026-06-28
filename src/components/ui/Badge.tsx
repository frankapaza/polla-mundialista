import type { HTMLAttributes } from 'react'

type Tone = 'gold' | 'green' | 'muted' | 'danger'

const TONES: Record<Tone, string> = {
  gold: 'bg-pool-gold/12 border-pool-gold/30 text-pool-gold',
  green: 'bg-pool-green/12 border-pool-green/40 text-pool-green',
  muted: 'bg-white/5 border-white/10 text-pool-muted',
  danger: 'bg-pool-danger/16 border-pool-danger/40 text-[#ffb3b3]',
}

interface Props extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone
}

/** Pill chico (puntos, estado, etiquetas). */
export function Badge({ tone = 'muted', className = '', ...props }: Props) {
  return (
    <span
      {...props}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-condensed font-bold text-sm ${TONES[tone]} ${className}`}
    />
  )
}
