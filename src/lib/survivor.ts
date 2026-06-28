import { supabase } from './supabase'
import { flagUrl } from './flags'
import { partidoCerrado } from './utils'
import type { Partido, Participante, SurvivorPick, FaseTorneo, Pozo } from './types'

const ORDEN: FaseTorneo[] = ['grupos', '16avos', 'octavos', 'cuartos', 'semis', 'tercero', 'final']

/** Fases del pozo ordenadas por avance del torneo. */
export function fasesDelPozo(pozo: Pozo): FaseTorneo[] {
  return [...pozo.fases].sort((a, b) => ORDEN.indexOf(a) - ORDEN.indexOf(b))
}

/** Un equipo es "real" (no placeholder) si tiene bandera conocida. */
export function esEquipoReal(equipo: string): boolean {
  return !!flagUrl(equipo)
}

/** Equipos que juegan una fase (con su partido), excluyendo placeholders. */
export function equiposDeFase(partidos: Partido[], fase: FaseTorneo): { equipo: string; partido: Partido }[] {
  const out: { equipo: string; partido: Partido }[] = []
  for (const p of partidos) {
    if (p.fase !== fase || !p.fecha) continue
    for (const eq of [p.equipo_local, p.equipo_visitante]) {
      if (esEquipoReal(eq) && !out.some(o => o.equipo === eq)) out.push({ equipo: eq, partido: p })
    }
  }
  return out
}

/** ¿La fase tiene partidos programados (con equipos reales y fecha)? */
export function faseProgramada(partidos: Partido[], fase: FaseTorneo): boolean {
  return equiposDeFase(partidos, fase).length > 0
}

/** ¿Todos los partidos (programados) de la fase ya cerraron? */
export function faseCerrada(partidos: Partido[], fase: FaseTorneo): boolean {
  const ps = partidos.filter(p => p.fase === fase && p.fecha)
  return ps.length > 0 && ps.every(p => partidoCerrado(p.fecha))
}

/** Estado de un pick derivado del resultado de su partido. */
export function estadoPick(pick: SurvivorPick, partidosById: Record<string, Partido>): SurvivorPick['estado'] {
  const p = pick.partido_id ? partidosById[pick.partido_id] : undefined
  if (!p || p.goles_local === null || p.goles_visitante === null) return 'pendiente'
  if (p.goles_local === p.goles_visitante) return 'pendiente' // empate 90': definir por penales (manual)
  const ganador = p.goles_local > p.goles_visitante ? p.equipo_local : p.equipo_visitante
  return pick.equipo === ganador ? 'sobrevive' : 'eliminado'
}

export interface Standing {
  participante: Participante
  vivo: boolean
  eliminadoEn: FaseTorneo | null
  sobrevividas: number
}

export function standings(
  participantes: Participante[],
  picksByPart: Record<string, Record<string, SurvivorPick>>,
  partidos: Partido[],
  fasesOrden: FaseTorneo[],
): Standing[] {
  const byId: Record<string, Partido> = {}
  for (const p of partidos) byId[p.id] = p
  return participantes.map(pt => {
    const picks = picksByPart[pt.id] ?? {}
    let vivo = true, eliminadoEn: FaseTorneo | null = null, sobrevividas = 0
    for (const fase of fasesOrden) {
      if (!faseProgramada(partidos, fase)) break // ronda aún no abierta
      const pick = picks[fase]
      if (!pick) {
        if (faseCerrada(partidos, fase)) { vivo = false; eliminadoEn = fase } // no eligió a tiempo
        break
      }
      const est = estadoPick(pick, byId)
      if (est === 'eliminado') { vivo = false; eliminadoEn = fase; break }
      if (est === 'sobrevive') { sobrevividas++; continue }
      break // pendiente: ronda en curso
    }
    return { participante: pt, vivo, eliminadoEn, sobrevividas }
  }).sort((a, b) => Number(b.vivo) - Number(a.vivo) || b.sobrevividas - a.sobrevividas)
}

// ── Datos ──
export async function fetchSurvivorPicks(participanteIds: string[]): Promise<SurvivorPick[]> {
  if (participanteIds.length === 0) return []
  const { data } = await supabase.from('survivor_picks').select().in('participante_id', participanteIds)
  return (data ?? []) as SurvivorPick[]
}

/** Persiste el estado de los picks según los resultados ya cargados.
 *  Devuelve cuántos picks cambiaron. Usar desde el admin tras cargar resultados. */
export async function resolverSurvivor(participanteIds: string[], partidos: Partido[]): Promise<number> {
  const byId: Record<string, Partido> = {}
  for (const p of partidos) byId[p.id] = p
  const picks = await fetchSurvivorPicks(participanteIds)
  let n = 0
  for (const pk of picks) {
    const est = estadoPick(pk, byId)
    if (est !== 'pendiente' && est !== pk.estado) {
      await supabase.from('survivor_picks').update({ estado: est }).eq('id', pk.id)
      n++
    }
  }
  return n
}

/** Guarda (o reemplaza) el pick de un jugador para una fase. */
export async function guardarPick(
  participante: Participante, fase: FaseTorneo, equipo: string, partidoId: string,
): Promise<SurvivorPick | null> {
  const actor = `${participante.nombre} (${participante.documento})`
  const existing = await supabase.from('survivor_picks').select()
    .eq('participante_id', participante.id).eq('fase', fase).maybeSingle()
  if (existing.data) {
    const { data } = await supabase.from('survivor_picks')
      .update({ equipo, partido_id: partidoId, estado: 'pendiente', updated_by: actor })
      .eq('id', (existing.data as SurvivorPick).id).select().single()
    return (data as SurvivorPick) ?? null
  }
  const { data } = await supabase.from('survivor_picks')
    .insert({ participante_id: participante.id, fase, equipo, partido_id: partidoId, created_by: actor, updated_by: actor })
    .select().single()
  return (data as SurvivorPick) ?? null
}
