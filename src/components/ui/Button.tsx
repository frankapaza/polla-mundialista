import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'outline' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-pool-green text-[#06210f] hover:brightness-110',
  outline: 'border border-pool-green/40 bg-pool-green/10 text-pool-green hover:bg-pool-green/20',
  ghost: 'bg-white/5 text-pool-text hover:bg-white/10 border border-white/10',
}

const SIZES: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-2.5 text-[15px]',
  lg: 'px-5 py-3.5 text-[17px]',
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

/** Botón con la estética de la polla (font condensada, uppercase). */
export function Button({ variant = 'primary', size = 'md', className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-condensed font-bold uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
    />
  )
}
