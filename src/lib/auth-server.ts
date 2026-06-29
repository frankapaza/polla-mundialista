import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto'

// Helpers de autenticación — SOLO servidor. PIN hasheado con scrypt; sesión
// firmada con HMAC-SHA256 (sin dependencias externas).

export const SESSION_COOKIE = 'polla_sesion'
export const BLOQUEO_MS = 15 * 60 * 1000 // 15 min tras 5 intentos fallidos
export const MAX_INTENTOS = 5
const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 días

const SECRET = process.env.SESSION_SECRET
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || 'dev-secret-no-usar-en-prod'

export function pinValido(pin: unknown): pin is string {
  return typeof pin === 'string' && /^\d{6}$/.test(pin)
}

// ── PIN hashing (scrypt) ──
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 32).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return false
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const calc = scryptSync(pin, salt, 32)
  const orig = Buffer.from(hash, 'hex')
  return calc.length === orig.length && timingSafeEqual(calc, orig)
}

// ── Sesión firmada ──
export interface SessionData { liga_id: string; documento: string; nombre: string; codigo: string }

function sign(body: string): string {
  return createHmac('sha256', SECRET).update(body).digest('base64url')
}

export function signSession(data: SessionData): string {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + TTL_MS })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySession(token: string | undefined | null): SessionData | null {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const expected = sign(body)
  const a = Buffer.from(sig), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!p.exp || Date.now() > p.exp) return null
    return { liga_id: p.liga_id, documento: p.documento, nombre: p.nombre, codigo: p.codigo }
  } catch { return null }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: TTL_MS / 1000,
  }
}

// ── Lectura de sesión desde la request (cookie) ──
interface ReqCookies { cookies: { get(name: string): { value: string } | undefined } }

export function sessionFromReq(req: ReqCookies): SessionData | null {
  return verifySession(req.cookies.get(SESSION_COOKIE)?.value)
}

// ── Sesión de ADMIN (panel) ──
export const ADMIN_COOKIE = 'polla_admin_sesion'
const ADMIN_TTL_MS = 12 * 60 * 60 * 1000 // 12 h

export function signAdmin(codigo: string): string {
  const body = Buffer.from(JSON.stringify({ admin: true, codigo, exp: Date.now() + ADMIN_TTL_MS })).toString('base64url')
  return `${body}.${sign(body)}`
}

export function adminFromReq(req: ReqCookies): { codigo: string } | null {
  const token = req.cookies.get(ADMIN_COOKIE)?.value
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const a = Buffer.from(sig), b = Buffer.from(sign(body))
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!p.admin || !p.exp || Date.now() > p.exp) return null
    return { codigo: p.codigo }
  } catch { return null }
}
