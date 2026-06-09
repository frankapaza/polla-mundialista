import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import type { Grupo, Participante, Pronostico } from '@/lib/types'

interface Props { params: Promise<{ codigo: string }> }

export const revalidate = 60

export default async function RankingPage({ params }: Props) {
  const { codigo } = await params
  const codigoUpper = codigo.toUpperCase()

  const { data: grupo } = await supabase.from('grupos').select().eq('codigo', codigoUpper).single()

  if (!grupo) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="text-center">
        <p className="text-white text-xl font-bold mb-2">Grupo no encontrado</p>
        <Link href="/" className="text-emerald-400 hover:text-emerald-300">Volver</Link>
      </div>
    </main>
  )

  const { data: participantes } = await supabase
    .from('participantes').select().eq('grupo_id', grupo.id).order('created_at')

  const { data: pronosticos } = await supabase
    .from('pronosticos')
    .select()
    .in('participante_id', (participantes ?? []).map((p: Participante) => p.id))

  const ranking = (participantes ?? []).map((p: Participante) => {
    const pronos = (pronosticos ?? []).filter((pr: Pronostico) => pr.participante_id === p.id)
    const total    = pronos.reduce((s: number, pr: Pronostico) => s + (pr.puntos ?? 0), 0)
    const exactos  = pronos.filter((pr: Pronostico) => pr.puntos === 3).length
    const ganadores = pronos.filter((pr: Pronostico) => pr.puntos === 1).length
    return { ...p, total, exactos, ganadores }
  }).sort((a: { total: number }, b: { total: number }) => b.total - a.total)

  const g = grupo as Grupo
  const hayPuntos = ranking.some((r: { total: number }) => r.total > 0)
  const inscripcionesCerradas = g.cierre_inscripciones ? new Date(g.cierre_inscripciones) <= new Date() : false
  const tieneCosto = g.costo_inscripcion > 0
  const totalPagaron = (participantes ?? []).filter((p: Participante) => p.pago).length
  const totalPendientes = (participantes ?? []).length - totalPagaron
  const recaudado = totalPagaron * g.costo_inscripcion

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">Ranking</p>
            <h1 className="text-white font-bold text-lg">{g.nombre}</h1>
          </div>
          <div className="flex gap-2">
            {inscripcionesCerradas && (
              <Link href={`/grupo/${codigoUpper}/dashboard`}
                className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                Dashboard
              </Link>
            )}
            <Link href={`/grupo/${codigoUpper}/pronosticos`}
              className="bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Mis pronósticos
            </Link>
            <Link href={`/grupo/${codigoUpper}/admin`}
              className="bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6">

        {/* Info del grupo */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-xs text-slate-500">Código para compartir</p>
              <p className="text-emerald-400 font-mono text-sm font-bold">{codigoUpper}</p>
            </div>
            {tieneCosto && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Inscripción</p>
                <p className="text-white font-bold">S/ {g.costo_inscripcion}</p>
              </div>
            )}
            {tieneCosto && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Recaudado</p>
                <p className="text-emerald-400 font-bold">S/ {recaudado.toFixed(2)}</p>
              </div>
            )}
            {tieneCosto && totalPendientes > 0 && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Pendiente de pago</p>
                <p className="text-amber-400 font-bold">{totalPendientes} personas</p>
              </div>
            )}
            {g.cierre_inscripciones && (
              <div className="text-center">
                <p className="text-xs text-slate-500">Cierre inscripciones</p>
                <p className={`text-xs font-medium ${inscripcionesCerradas ? 'text-red-400' : 'text-slate-300'}`}>
                  {inscripcionesCerradas ? '🔒 Cerrado' : new Date(g.cierre_inscripciones).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {ranking.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <div className="text-4xl mb-3">👥</div>
            <p>Nadie se anotó todavía</p>
            <p className="text-sm mt-1">Compartí el código <span className="text-white font-mono font-bold">{codigoUpper}</span></p>
          </div>
        ) : (
          <div className="space-y-2">
            {!hayPuntos && (
              <p className="text-slate-500 text-xs text-center mb-4">
                Los puntos aparecen cuando se registren resultados de partidos
              </p>
            )}

            {ranking.map((p: Participante & { total: number; exactos: number; ganadores: number }, i: number) => (
              <div key={p.id} className={`bg-slate-900 border rounded-xl px-4 py-3.5 flex items-center gap-3 ${
                i === 0 && hayPuntos ? 'border-amber-600/60' :
                i === 1 && hayPuntos ? 'border-slate-500/60' :
                i === 2 && hayPuntos ? 'border-amber-800/60' : 'border-slate-800'
              }`}>
                <div className="w-8 text-center flex-shrink-0">
                  {i === 0 && hayPuntos ? '🥇' : i === 1 && hayPuntos ? '🥈' : i === 2 && hayPuntos ? '🥉' :
                    <span className="text-slate-500 font-bold text-sm">{i + 1}</span>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-semibold truncate">{p.nombre}</p>
                    {tieneCosto && (
                      <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${
                        p.pago ? 'bg-emerald-900/60 text-emerald-400' : 'bg-amber-900/60 text-amber-400'
                      }`}>
                        {p.pago ? '✓ Pagó' : '⏳ Pendiente'}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 text-xs">Doc: {p.documento}</p>
                </div>

                <div className="flex items-center gap-4 flex-shrink-0 text-right">
                  {hayPuntos && (
                    <>
                      <div className="hidden sm:block text-center">
                        <p className="text-emerald-400 font-bold text-sm">{p.exactos}</p>
                        <p className="text-slate-600 text-xs">exactos</p>
                      </div>
                      <div className="hidden sm:block text-center">
                        <p className="text-blue-400 font-bold text-sm">{p.ganadores}</p>
                        <p className="text-slate-600 text-xs">ganadores</p>
                      </div>
                    </>
                  )}
                  <div className="text-center">
                    <p className="text-white font-bold text-xl">{p.total}</p>
                    <p className="text-slate-500 text-xs">pts</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-400 mb-2">Sistema de puntos</p>
          <p>🎯 Resultado exacto: <span className="text-emerald-400 font-bold">3 puntos</span></p>
          <p>✅ Ganador o empate correcto: <span className="text-blue-400 font-bold">1 punto</span></p>
          <p>❌ Incorrecto: <span className="text-slate-500">0 puntos</span></p>
        </div>
      </div>
    </main>
  )
}
