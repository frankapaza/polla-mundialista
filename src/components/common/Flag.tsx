import { flagUrl } from '@/lib/flags'

/**
 * Bandera de un equipo. Devuelve null si no hay bandera conocida
 * (p.ej. placeholders de eliminatoria como "2° Grupo J" o "Por definir").
 */
export function Flag({ equipo, className = 'w-7 h-auto' }: { equipo: string; className?: string }) {
  const url = flagUrl(equipo)
  if (!url) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={equipo} className={`inline-block rounded-sm shadow-sm ${className}`} loading="lazy" />
}
