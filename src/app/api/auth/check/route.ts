import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// Dado {codigo, documento}, indica si el jugador existe y si ya tiene PIN,
// para que el frontend muestre "ingresá tu PIN" o "creá tu PIN".
export async function POST(req: NextRequest) {
  const { codigo, documento } = await req.json()
  if (!codigo || !documento) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const { data: liga } = await supabaseAdmin.from('ligas').select('id').eq('codigo', String(codigo).toUpperCase()).maybeSingle()
  if (!liga) return NextResponse.json({ error: 'liga' }, { status: 404 })

  const { data: jug } = await supabaseAdmin.from('jugadores')
    .select('pin_hash, nombre').eq('liga_id', liga.id).eq('documento', String(documento).trim()).maybeSingle()

  return NextResponse.json({
    exists: !!jug,
    hasPin: !!jug?.pin_hash,
    nombre: jug?.nombre ?? null,
  })
}
