import { supabase } from './supabase'
import type { Liga, Pozo, Participante, Pronostico, FaseTorneo } from './types'

// Orden de presentación de los pozos: por fase del torneo y Survivor al final.
const FASE_ORDEN: Record<FaseTorneo, number> = {
  grupos: 0, '16avos': 1, octavos: 2, cuartos: 3, semis: 4, tercero: 5, final: 6,
}
function ordenPozo(p: Pozo): number {
  if (p.modo === 'survivor') return 100
  const idxs = p.fases.map(f => FASE_ORDEN[f] ?? 50)
  return idxs.length ? Math.min(...idxs) : 50
}

// ── Sesión del jugador dentro de una liga (localStorage) ──
// La identidad persiste por (liga, documento); el pago es por pozo.
const SESSION_KEY = (codigo: string) => `polla_liga_${codigo}`
const ACTIVE_POZO_KEY = (codigo: string) => `polla_liga_pozo_${codigo}`

export interface LigaSession {
  documento: string
  nombre: string
}

export function getLigaSession(codigo: string): LigaSession | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem(SESSION_KEY(codigo))
  if (!raw) return null
  try { return JSON.parse(raw) as LigaSession } catch { return null }
}

export function setLigaSession(codigo: string, s: LigaSession) {
  localStorage.setItem(SESSION_KEY(codigo), JSON.stringify(s))
}

export function clearLigaSession(codigo: string) {
  localStorage.removeItem(SESSION_KEY(codigo))
  localStorage.removeItem(ACTIVE_POZO_KEY(codigo))
}

export function getActivePozoId(codigo: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(ACTIVE_POZO_KEY(codigo))
}

export function setActivePozoId(codigo: string, pozoId: string) {
  localStorage.setItem(ACTIVE_POZO_KEY(codigo), pozoId)
}

/**
 * Verifica la sesión por la COOKIE (fuente de verdad). Devuelve la sesión si la
 * cookie es válida (y sincroniza el localStorage), o null si no hay (limpiando
 * la sesión local). Si la red falla, cae al localStorage para no bloquear.
 */
export async function verificarSesion(codigo: string): Promise<LigaSession | null> {
  try {
    const r = await fetch('/api/auth/me')
    if (r.status === 401) { clearLigaSession(codigo); return null }
    if (r.ok) {
      const me = await r.json()
      if (me?.ok && me.codigo === codigo) {
        const s: LigaSession = { documento: me.documento, nombre: me.nombre }
        setLigaSession(codigo, s)
        return s
      }
      clearLigaSession(codigo)
      return null
    }
  } catch { /* red caída: usar lo local */ }
  return getLigaSession(codigo)
}

/** Pozo clásico activo. Por defecto: 16avos (la ronda actual). Conserva la
 *  elección del jugador si eligió un pozo no-grupos. */
export function elegirPozoActivo(pozos: Pozo[], codigo: string): Pozo | null {
  const elegido = pozos.find(p => p.id === getActivePozoId(codigo) && p.modo === 'clasico' && !p.fases.includes('grupos'))
  if (elegido) return elegido
  const def = pozos.find(p => p.modo === 'clasico' && p.fases.includes('16avos'))
    ?? pozos.find(p => p.modo === 'clasico') ?? null
  if (def) setActivePozoId(codigo, def.id)
  return def
}

// ── Datos ──
export async function fetchLiga(codigo: string): Promise<Liga | null> {
  const { data } = await supabase.from('ligas').select().eq('codigo', codigo).maybeSingle()
  return (data as Liga) ?? null
}

export async function fetchPozos(ligaId: string): Promise<Pozo[]> {
  const { data } = await supabase.from('grupos').select().eq('liga_id', ligaId).order('created_at')
  // Orden del torneo: grupos → 16avos → octavos → … → Survivor (created_at desempata).
  return ((data ?? []) as Pozo[]).sort((a, b) => ordenPozo(a) - ordenPozo(b))
}

/** Participantes de este jugador (por documento) en todos los pozos de la liga. */
export async function fetchMisParticipaciones(
  pozos: Pozo[],
  documento: string,
): Promise<Record<string, Participante>> {
  const ids = pozos.map(p => p.id)
  const out: Record<string, Participante> = {}
  if (ids.length === 0) return out
  const { data } = await supabase.from('participantes').select()
    .in('grupo_id', ids).eq('documento', documento)
  for (const p of (data ?? []) as Participante[]) out[p.grupo_id] = p
  return out
}

// ── Ranking de un pozo clásico ──
export interface RankingRow {
  participante: Participante
  total: number
  exactos: number   // aciertos exactos (+3)
  ganador: number   // acertó el ganador/empate pero no el marcador (+1)
  jugados: number
}

export async function fetchRankingPozo(pozoId: string): Promise<RankingRow[]> {
  const { data: parts } = await supabase.from('participantes').select().eq('grupo_id', pozoId).order('created_at')
  const participantes = (parts ?? []) as Participante[]
  const ids = participantes.map(p => p.id)
  let pronos: Pronostico[] = []
  if (ids.length) {
    const { data } = await supabase.from('pronosticos').select().in('participante_id', ids)
    pronos = (data ?? []) as Pronostico[]
  }
  const acc: Record<string, { total: number; exactos: number; ganador: number; jugados: number }> = {}
  for (const p of pronos) {
    const e = acc[p.participante_id] ?? { total: 0, exactos: 0, ganador: 0, jugados: 0 }
    if (p.puntos != null) {
      e.total += p.puntos; e.jugados++
      if (p.puntos === 3) e.exactos++
      else if (p.puntos === 1) e.ganador++
    }
    acc[p.participante_id] = e
  }
  return participantes
    .map(pt => ({ participante: pt, ...(acc[pt.id] ?? { total: 0, exactos: 0, ganador: 0, jugados: 0 }) }))
    .sort((a, b) => b.total - a.total)
}

/** Une al jugador a un pozo (crea participante con pago=false). Idempotente. */
export async function unirseAPozo(
  pozo: Pozo,
  documento: string,
  nombre: string,
): Promise<Participante | null> {
  const actor = `${nombre} (${documento})`
  const { data, error } = await supabase.from('participantes')
    .insert({ grupo_id: pozo.id, nombre, documento, created_by: actor, updated_by: actor })
    .select().single()
  if (!error) return data as Participante
  if (error.code === '23505') {
    const { data: existing } = await supabase.from('participantes').select()
      .eq('grupo_id', pozo.id).eq('documento', documento).maybeSingle()
    return (existing as Participante) ?? null
  }
  return null
}
