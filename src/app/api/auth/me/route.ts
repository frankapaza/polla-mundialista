import { NextRequest, NextResponse } from 'next/server'
import { sessionFromReq } from '@/lib/auth-server'

export const runtime = 'nodejs'

// Indica si hay una sesión válida (cookie). El front lo usa para decidir
// si mostrar el login o dejar pasar.
export async function GET(req: NextRequest) {
  const s = sessionFromReq(req)
  if (!s) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true, documento: s.documento, nombre: s.nombre, codigo: s.codigo })
}
