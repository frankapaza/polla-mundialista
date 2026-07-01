import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { adminFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

// El admin de la liga configura su cobro con Yape (uno por liga).
export async function POST(req: NextRequest) {
  if (!adminFromReq(req)) return NextResponse.json({ error: 'no-admin' }, { status: 401 })

  const { ligaId, yapeNumero, yapeNombre, yapeQrUrl } = await req.json()
  if (!ligaId) return NextResponse.json({ error: 'datos' }, { status: 400 })

  const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  await supabaseAdmin.from('ligas').update({
    yape_numero: clean(yapeNumero),
    yape_nombre: clean(yapeNombre),
    yape_qr_url: clean(yapeQrUrl),
    updated_by: 'admin',
  }).eq('id', ligaId)
  return NextResponse.json({ ok: true })
}
