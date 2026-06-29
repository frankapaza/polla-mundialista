import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPin, signSession, SESSION_COOKIE, cookieOptions, pinValido } from '@/lib/auth-server'

export const runtime = 'nodejs'

// Define el PIN por primera vez. Si el jugador no existe (alguien nuevo en la
// liga), lo crea con su nombre. Si ya tiene PIN, rechaza (resetea el admin).
export async function POST(req: NextRequest) {
  const { codigo, documento, pin, nombre } = await req.json()
  if (!codigo || !documento || !pinValido(pin)) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const cod = String(codigo).toUpperCase(), doc = String(documento).trim()
  const { data: liga } = await supabaseAdmin.from('ligas').select('id').eq('codigo', cod).maybeSingle()
  if (!liga) return NextResponse.json({ error: 'liga' }, { status: 404 })

  const { data: jug } = await supabaseAdmin.from('jugadores')
    .select('id, nombre, pin_hash').eq('liga_id', liga.id).eq('documento', doc).maybeSingle()

  if (jug?.pin_hash) return NextResponse.json({ error: 'ya-tiene-pin' }, { status: 409 })

  let nombreFinal = jug?.nombre
  if (jug) {
    await supabaseAdmin.from('jugadores').update({ pin_hash: hashPin(pin), updated_by: 'set-pin' }).eq('id', jug.id)
  } else {
    const nom = String(nombre ?? '').trim()
    if (!nom) return NextResponse.json({ error: 'nombre' }, { status: 400 })
    nombreFinal = nom
    const { error } = await supabaseAdmin.from('jugadores')
      .insert({ liga_id: liga.id, documento: doc, nombre: nom, pin_hash: hashPin(pin), created_by: 'set-pin', updated_by: 'set-pin' })
    if (error) return NextResponse.json({ error: 'crear' }, { status: 500 })
  }

  const token = signSession({ liga_id: liga.id, documento: doc, nombre: nombreFinal!, codigo: cod })
  const r = NextResponse.json({ ok: true, nombre: nombreFinal })
  r.cookies.set(SESSION_COOKIE, token, cookieOptions())
  return r
}
