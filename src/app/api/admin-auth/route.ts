import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: NextRequest) {
  const { password, codigo } = await req.json()

  if (!password) return NextResponse.json({ ok: false }, { status: 401 })

  // Si viene con código de grupo, verificar contraseña del grupo primero
  if (codigo) {
    const { data: grupo } = await supabase
      .from('grupos')
      .select('admin_password')
      .eq('codigo', codigo.toUpperCase())
      .single()

    if (grupo?.admin_password) {
      if (password === grupo.admin_password) return NextResponse.json({ ok: true })
      // Si tiene contraseña propia, no permitir el ADMIN_SECRET global
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  }

  // Sin contraseña propia → caer al ADMIN_SECRET global (superadmin siempre puede entrar)
  if (password === process.env.ADMIN_SECRET) {
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ ok: false }, { status: 401 })
}
