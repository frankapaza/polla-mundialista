import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { verifyPin, signSession, SESSION_COOKIE, cookieOptions, MAX_INTENTOS, BLOQUEO_MS, pinValido } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const { codigo, documento, pin } = await req.json()
  if (!codigo || !documento || !pinValido(pin)) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const cod = String(codigo).toUpperCase(), doc = String(documento).trim()
  const { data: liga } = await supabaseAdmin.from('ligas').select('id').eq('codigo', cod).maybeSingle()
  if (!liga) return NextResponse.json({ error: 'liga' }, { status: 404 })

  const { data: jug } = await supabaseAdmin.from('jugadores')
    .select('*').eq('liga_id', liga.id).eq('documento', doc).maybeSingle()
  if (!jug) return NextResponse.json({ error: 'no-jugador' }, { status: 404 })
  if (!jug.pin_hash) return NextResponse.json({ error: 'sin-pin' }, { status: 409 })

  // Bloqueo por fuerza bruta
  if (jug.bloqueado_hasta && new Date(jug.bloqueado_hasta).getTime() > Date.now()) {
    return NextResponse.json({ error: 'bloqueado', hasta: jug.bloqueado_hasta }, { status: 429 })
  }

  if (!verifyPin(pin, jug.pin_hash)) {
    const intentos = (jug.intentos_fallidos ?? 0) + 1
    const bloquea = intentos >= MAX_INTENTOS
    await supabaseAdmin.from('jugadores').update({
      intentos_fallidos: bloquea ? 0 : intentos,
      bloqueado_hasta: bloquea ? new Date(Date.now() + BLOQUEO_MS).toISOString() : null,
      updated_by: 'auth',
    }).eq('id', jug.id)
    return NextResponse.json(
      { error: 'pin', intentosRestantes: bloquea ? 0 : MAX_INTENTOS - intentos, bloqueado: bloquea },
      { status: 401 },
    )
  }

  // OK: resetear contadores y emitir sesión
  await supabaseAdmin.from('jugadores').update({ intentos_fallidos: 0, bloqueado_hasta: null, updated_by: 'auth' }).eq('id', jug.id)
  const token = signSession({ liga_id: liga.id, documento: doc, nombre: jug.nombre, codigo: cod })
  const r = NextResponse.json({ ok: true, nombre: jug.nombre })
  r.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return r
}
