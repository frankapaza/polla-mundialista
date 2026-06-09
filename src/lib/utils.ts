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
  return new Date(fecha).toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

export function partidoYaEmpezó(fecha: string | null): boolean {
  if (!fecha) return false
  return new Date(fecha) <= new Date()
}

// Pronósticos cerrados 24h antes del partido
export function partidoCerrado(fecha: string | null): boolean {
  if (!fecha) return false
  return Date.now() >= new Date(fecha).getTime() - 24 * 60 * 60 * 1000
}

// Partido actualmente en juego (entre el inicio y 2h después)
export function partidoEnVivo(fecha: string | null): boolean {
  if (!fecha) return false
  const inicio = new Date(fecha).getTime()
  const ahora = Date.now()
  return ahora >= inicio && ahora <= inicio + 2 * 60 * 60 * 1000
}

// Texto de countdown hasta el cierre (null si faltan más de 24h)
export function formatearCountdown(fecha: string | null): string | null {
  if (!fecha) return null
  const deadline = new Date(fecha).getTime() - 24 * 60 * 60 * 1000
  const diff = deadline - Date.now()
  if (diff <= 0 || diff > 24 * 60 * 60 * 1000) return null
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  if (h > 0) return `Cierra en ${h}h ${m}m`
  return `Cierra en ${m}m`
}
