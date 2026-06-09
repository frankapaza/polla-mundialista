import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { flagUrl } from '@/lib/flags'
import type { Grupo, Participante, Partido, Pronostico } from '@/lib/types'

interface Props {
  params: Promise<{ codigo: string }>
  searchParams: Promise<{ admin?: string }>
}

export const revalidate = 60

const GRUPOS_TORNEO = ['A','B','C','D','E','F','G','H','I','J','K','L']

function Flag({ equipo }: { equipo: string }) {
  const url = flagUrl(equipo)
  if (!url) return null
  return <img src={url} alt={equipo} className="inline-block w-4 h-auto rounded-sm" />
}

function PuntosBadge({ puntos }: { puntos: number | null | undefined }) {
  if (puntos === null || puntos === undefined) return (
    <span className="text-slate-600 text-xs">-</span>
  )
  if (puntos === 3) return <span className="text-emerald-400 font-bold text-xs">🎯</span>
  if (puntos === 1) return <span className="text-blue-400 font-bold text-xs">✅</span>
  return <span className="text-red-500 font-bold text-xs">✗</span>
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { codigo } = await params
  const { admin } = await searchParams
  const codigoUpper = codigo.toUpperCase()

  const { data: grupo } = await supabase.from('grupos').select().eq('codigo', codigoUpper).single()

  if (!grupo) return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <Link href="/" className="text-emerald-400">Volver al inicio</Link>
    </main>
  )

  const g = grupo as Grupo
  const inscripcionesCerradas = g.cierre_inscripciones ? new Date(g.cierre_inscripciones) <= new Date() : false
  const esAdmin = admin === '1'

  if (!inscripcionesCerradas && !esAdmin) return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 bg-slate-950 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard bloqueado</h1>
      <p className="text-slate-400 max-w-sm">
        Los pronósticos de todos se revelan después del cierre de inscripciones.
        {g.cierre_inscripciones && (
          <> Cierra el <strong className="text-white">{new Date(g.cierre_inscripciones).toLocaleString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</strong>.</>
        )}
      </p>
      <Link href={`/grupo/${codigoUpper}/ranking`} className="mt-6 text-emerald-400 hover:text-emerald-300 transition-colors">
        Ver ranking →
      </Link>
    </main>
  )

  const { data: participantes } = await supabase
    .from('participantes').select().eq('grupo_id', g.id).order('created_at')

  const { data: partidos } = await supabase
    .from('partidos').select().eq('fase', 'grupos').order('numero_partido')

  const { data: pronosticos } = await supabase
    .from('pronosticos')
    .select()
    .in('participante_id', (participantes ?? []).map((p: Participante) => p.id))

  // Índice de pronósticos: [participante_id][partido_id] → pronostico
  const pronosIdx: Record<string, Record<string, Pronostico>> = {}
  for (const pr of (pronosticos ?? []) as Pronostico[]) {
    if (!pronosIdx[pr.participante_id]) pronosIdx[pr.participante_id] = {}
    pronosIdx[pr.participante_id][pr.partido_id] = pr
  }

  // Calcular ranking para ordenar columnas por puntos
  const participantesOrdenados = (participantes ?? [] as Participante[]).map((p: Participante) => {
    const total = Object.values(pronosIdx[p.id] ?? {}).reduce((s, pr) => s + (pr.puntos ?? 0), 0)
    return { ...p, total }
  }).sort((a: { total: number }, b: { total: number }) => b.total - a.total)

  const partidosPorGrupo = GRUPOS_TORNEO.reduce((acc, g) => {
    acc[g] = (partidos ?? []).filter((p: Partido) => p.grupo_torneo === g)
    return acc
  }, {} as Record<string, Partido[]>)

  return (
    <main className="min-h-screen bg-slate-950 pb-16">
      {/* Header */}
      <div className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-full px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-xs">Dashboard de pronósticos</p>
            <h1 className="text-white font-bold text-lg">{g.nombre}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/grupo/${codigoUpper}/ranking`}
              className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
              Ranking
            </Link>
          </div>
        </div>
      </div>

      <div className="px-4 pt-6">
        <p className="text-slate-500 text-xs mb-4">
          {participantesOrdenados.length} participantes · 🎯 exacto · ✅ ganador/empate · ✗ incorrecto
        </p>

        {GRUPOS_TORNEO.map(grupoTorneo => {
          const matchs = partidosPorGrupo[grupoTorneo]
          if (!matchs?.length) return null

          return (
            <div key={grupoTorneo} className="mb-8">
              <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                Grupo {grupoTorneo}
              </h2>

              {/* Tabla scrollable */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      {/* Columna de partido */}
                      <th className="sticky left-0 bg-slate-900 px-3 py-2 text-left text-slate-400 font-semibold min-w-[180px] z-10">
                        Partido
                      </th>
                      <th className="px-2 py-2 text-slate-500 font-medium whitespace-nowrap">
                        Resultado
                      </th>
                      {participantesOrdenados.map((p: Participante & { total: number }) => (
                        <th key={p.id} className="px-2 py-2 text-slate-300 font-medium whitespace-nowrap max-w-[80px] truncate">
                          <div className="truncate max-w-[80px]" title={p.nombre}>
                            {p.nombre.split(' ')[0]}
                          </div>
                          <div className="text-emerald-500 font-bold">{p.total}pts</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matchs.map((partido: Partido, idx: number) => {
                      const jugado = partido.goles_local !== null
                      return (
                        <tr key={partido.id}
                          className={`border-b border-slate-800/50 ${idx % 2 === 0 ? 'bg-slate-900/30' : 'bg-slate-900/60'}`}>
                          {/* Partido */}
                          <td className="sticky left-0 bg-inherit px-3 py-2.5 z-10">
                            <div className="flex items-center gap-1.5 whitespace-nowrap">
                              <Flag equipo={partido.equipo_local} />
                              <span className="text-white font-medium">{partido.equipo_local.split(' ')[0]}</span>
                              <span className="text-slate-600">vs</span>
                              <Flag equipo={partido.equipo_visitante} />
                              <span className="text-white font-medium">{partido.equipo_visitante.split(' ')[0]}</span>
                            </div>
                          </td>

                          {/* Resultado real */}
                          <td className="px-2 py-2.5 text-center whitespace-nowrap">
                            {jugado ? (
                              <span className="text-emerald-400 font-bold">
                                {partido.goles_local}-{partido.goles_visitante}
                              </span>
                            ) : (
                              <span className="text-slate-600">–</span>
                            )}
                          </td>

                          {/* Pronósticos por participante */}
                          {participantesOrdenados.map((p: Participante & { total: number }) => {
                            const pron = pronosIdx[p.id]?.[partido.id]
                            return (
                              <td key={p.id} className="px-2 py-2.5 text-center whitespace-nowrap">
                                {pron ? (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className={`font-semibold ${
                                      jugado
                                        ? pron.puntos === 3 ? 'text-emerald-400'
                                        : pron.puntos === 1 ? 'text-blue-400'
                                        : 'text-red-400'
                                        : 'text-slate-300'
                                    }`}>
                                      {pron.goles_local}-{pron.goles_visitante}
                                    </span>
                                    {jugado && <PuntosBadge puntos={pron.puntos} />}
                                  </div>
                                ) : (
                                  <span className="text-slate-700">–</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
