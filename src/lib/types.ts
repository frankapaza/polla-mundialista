// Campos de auditoría comunes (migration_006). created_* es inmutable (trigger).
interface Auditoria {
  created_at?: string
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}

export interface Grupo extends Auditoria {
  id: string
  nombre: string
  codigo: string
  costo_inscripcion: number
  cierre_inscripciones: string | null
  admin_password: string | null
  campeon: string | null
  created_at: string
}

export interface Participante extends Auditoria {
  id: string
  grupo_id: string
  nombre: string
  documento: string
  pago: boolean
  prediccion_campeon: string | null
  created_at: string
}

export interface Partido extends Auditoria {
  id: string
  numero_partido: number
  fase: 'grupos' | 'octavos' | 'cuartos' | 'semis' | 'tercero' | 'final'
  grupo_torneo: string | null
  equipo_local: string
  equipo_visitante: string
  fecha: string | null
  goles_local: number | null
  goles_visitante: number | null
}

export interface Pronostico extends Auditoria {
  id: string
  participante_id: string
  partido_id: string
  goles_local: number
  goles_visitante: number
  puntos: number | null
  infraccion: boolean
  created_at: string
  updated_at: string
}

export interface RankingEntry {
  participante_id: string
  nombre: string
  documento: string
  pago: boolean
  total_puntos: number
  exactos: number
  ganadores: number
}
