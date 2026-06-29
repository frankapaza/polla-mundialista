import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { generarCodigo } from '@/lib/utils'

export const runtime = 'nodejs'

const FASES_TODAS = ['grupos', '16avos', 'octavos', 'cuartos', 'semis', 'tercero', 'final']

// Crea una polla nueva (liga) con un pozo por defecto que cubre todo el Mundial.
// Público: cualquiera puede crear su polla. La escritura va por service role
// (ligas está cerrada a la clave pública).
export async function POST(req: NextRequest) {
  const { nombre, adminPassword } = await req.json()
  if (!nombre || !String(nombre).trim()) return NextResponse.json({ error: 'nombre' }, { status: 400 })

  // Código único
  let codigo = ''
  for (let i = 0; i < 8; i++) {
    const c = generarCodigo(6)
    const { data } = await supabaseAdmin.from('ligas').select('id').eq('codigo', c).maybeSingle()
    if (!data) { codigo = c; break }
  }
  if (!codigo) return NextResponse.json({ error: 'codigo' }, { status: 500 })

  const { data: liga, error } = await supabaseAdmin.from('ligas')
    .insert({ nombre: String(nombre).trim(), codigo, admin_password: adminPassword ? String(adminPassword) : null, created_by: 'crear' })
    .select().single()
  if (error || !liga) return NextResponse.json({ error: 'crear' }, { status: 500 })

  // Pozo por defecto: toda la copa, marcador clásico.
  await supabaseAdmin.from('grupos').insert({
    nombre: 'Polla del Mundial', codigo: `${codigo}-1`, costo_inscripcion: 0,
    liga_id: liga.id, modo: 'clasico', fases: FASES_TODAS, created_by: 'crear',
  })

  return NextResponse.json({ ok: true, codigo })
}
