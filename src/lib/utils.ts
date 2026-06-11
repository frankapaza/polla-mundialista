export function calcularPuntos(
  pronosticoLocal: number,
  pronosticoVisitante: number,
  resultadoLocal: number,
  resultadoVisitante: number,
): number {
  if (pronosticoLocal === resultadoLocal && pronosticoVisitante === resultadoVisitante) {
    return 3
  }
  const signoPronostico = Math.sign(pronosticoLocal - pronosticoVisitante)
  const signoResultado  = Math.sign(resultadoLocal  - resultadoVisitante)
  return signoPronostico === signoResultado ? 1 : 0
}

export function generarCodigo(largo = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: largo }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

export function formatearFecha(fecha: string | null): string {
  if (!fecha) return 'Fecha por confirmar'
  return new Date(fecha).toLocaleString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}

export function partidoYaEmpezó(fecha: string | null): boolean {
  if (!fecha) return false
  return new Date(fecha) <= new Date()
}

// Cuánto antes del partido se cierran los pronósticos (1 hora)
const CIERRE_ANTES_MS = 60 * 60 * 1000

// Pronósticos cerrados 1h antes del partido
export function partidoCerrado(fecha: string | null): boolean {
  if (!fecha) return false
  return Date.now() >= new Date(fecha).getTime() - CIERRE_ANTES_MS
}

// Fecha/hora exacta en que se cierran los pronósticos (1h antes del partido)
export function fechaCierre(fecha: string | null): string {
  if (!fecha) return ''
  return new Date(new Date(fecha).getTime() - CIERRE_ANTES_MS).toLocaleString('es-PE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  })
}

// Partido actualmente en juego (entre el inicio y 2h después)
export function partidoEnVivo(fecha: string | null): boolean {
  if (!fecha) return false
  const inicio = new Date(fecha).getTime()
  const ahora = Date.now()
  return ahora >= inicio && ahora <= inicio + 2 * 60 * 60 * 1000
}

// Texto de countdown hasta el cierre (null si faltan más de 48h)
export function formatearCountdown(fecha: string | null): string | null {
  if (!fecha) return null
  const deadline = new Date(fecha).getTime() - CIERRE_ANTES_MS
  const diff = deadline - Date.now()
  if (diff <= 0 || diff > 48 * 60 * 60 * 1000) return null
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Semáforo: color según urgencia del cierre
export type SemaforoColor = 'green' | 'yellow' | 'red' | 'closed' | 'open'
export function semaforoColor(fecha: string | null): SemaforoColor {
  if (!fecha) return 'open'
  const deadline = new Date(fecha).getTime() - CIERRE_ANTES_MS
  const diff = deadline - Date.now()
  if (diff <= 0) return 'closed'
  if (diff < 60 * 60 * 1000) return 'red'          // < 1h
  if (diff < 6 * 60 * 60 * 1000) return 'yellow'   // < 6h
  if (diff < 48 * 60 * 60 * 1000) return 'green'   // < 48h
  return 'open'
}
