// Campos de auditoría comunes (migration_006). created_* es inmutable (trigger).
interface Auditoria {
  created_at?: string
  updated_at?: string | null
  created_by?: string | null
  updated_by?: string | null
}

// Una "liga" agrupa varios pozos bajo un único código (migration_008).
export interface Liga extends Auditoria {
  id: string
  nombre: string
  codigo: string
  admin_password: string | null
  yape_numero: string | null    // cobro con Yape (migration_012)
  yape_nombre: string | null
  yape_qr_url: string | null
  campeon: string | null
  created_at: string
}

export type FaseTorneo = 'grupos' | '16avos' | 'octavos' | 'cuartos' | 'semis' | 'tercero' | 'final'

// `grupos` es ahora un "pozo" dentro de una liga (migration_008).
export interface Grupo extends Auditoria {
  id: string
  nombre: string
  codigo: string
  costo_inscripcion: number
  cierre_inscripciones: string | null
  admin_password: string | null
  admin_nombre: string | null   // quién administra (lo fija el superadmin)
  campeon: string | null
  created_at: string
  liga_id: string | null
  modo: 'clasico' | 'survivor'
  fases: FaseTorneo[]
}

// Alias semántico: dentro del modelo nuevo, un Grupo se usa como Pozo.
export type Pozo = Grupo

export interface Participante extends Auditoria {
  id: string
  grupo_id: string
  nombre: string
  documento: string
  pago: boolean
  pago_estado: 'pendiente' | 'reportado' | 'confirmado'  // flujo Yape (migration_012)
  pago_operacion: string | null
  pago_reportado_at: string | null
  prediccion_campeon: string | null
  created_at: string
}

export interface Partido extends Auditoria {
  id: string
  numero_partido: number
  fase: FaseTorneo
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

// Marcador probable calculado por el modelo (skill prediccion-mundial, migration_011).
export interface PrediccionModelo {
  id: string
  partido_id: string
  goles_local: number
  goles_visitante: number
  prob_local: number
  prob_empate: number
  prob_visitante: number
  fuerza_local: number | null
  fuerza_visitante: number | null
  confianza: 'alta' | 'media' | 'baja'
  datos_completos: boolean
  justificacion: string | null
  fuentes: string[] | null
  generado_at: string
}

// Pick del pozo Survivor: un equipo por fase (migration_008).
export interface SurvivorPick extends Auditoria {
  id: string
  participante_id: string
  fase: FaseTorneo
  equipo: string
  partido_id: string | null
  estado: 'pendiente' | 'sobrevive' | 'eliminado'
  created_at: string
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
