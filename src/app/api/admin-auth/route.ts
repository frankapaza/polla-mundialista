import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { signAdmin, ADMIN_COOKIE } from '@/lib/auth-server'

export const runtime = 'nodejs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { password, codigo } = await req.json()
  if (!password) return NextResponse.json({ ok: false }, { status: 401 })

  // Emite la respuesta OK + cookie de admin firmada (para los endpoints de escritura del admin).
  const ok = () => {
    const r = NextResponse.json({ ok: true })
    r.cookies.set(ADMIN_COOKIE, signAdmin(codigo ? String(codigo).toUpperCase() : 'global'), {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 12 * 60 * 60,
    })
    return r
  }

  // Si viene con código de grupo y ese grupo tiene contraseña propia, verificarla primero.
  if (codigo) {
    const { data: grupo } = await supabase.from('grupos').select('admin_password').eq('codigo', String(codigo).toUpperCase()).single()
    if (grupo?.admin_password) {
      if (password === grupo.admin_password) return ok()
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  // Sin contraseña propia → ADMIN_SECRET global.
  if (password === process.env.ADMIN_SECRET) return ok()
  return NextResponse.json({ ok: false }, { status: 401 })
}
