import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { pozoId, costo, cierre } = await req.json()
  if (!pozoId) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const c = Number(costo)
  await supabaseAdmin.from('grupos').update({
    costo_inscripcion: Number.isFinite(c) && c >= 0 ? c : 0,
    cierre_inscripciones: cierre ? new Date(cierre).toISOString() : null,
    updated_by: 'admin',
  }).eq('id', pozoId)
  return NextResponse.json({ ok: true })
}
