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
