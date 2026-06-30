import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { PrediccionModelo } from '@/lib/types'

/** Bloque "Marcador probable del modelo" (skill prediccion-mundial, migration_011).
 *  Muestra el marcador sugerido, la barra 1/X/2, la confianza y permite adoptar
 *  el marcador en el stepper del jugador. */
export function PrediccionModeloPanel({ pred, local, visitante, editable, onUsar }: {
  pred: PrediccionModelo; local: string; visitante: string; editable: boolean; onUsar: () => void
}) {
  const tone = pred.confianza === 'alta' ? 'green' : pred.confianza === 'media' ? 'gold' : 'muted'
  const pct = (n: number) => Math.round(n * 100)
  const pl = pct(pred.prob_local), px = pct(pred.prob_empate), pv = pct(pred.prob_visitante)
  const abbr = (s: string) => s.replace(/\s+/g, '').slice(0, 3).toUpperCase()

  return (
    <Card className="p-5 mt-4 bg-pool-surface-2 border-pool-green/15">
      <div className="flex items-center justify-between mb-3">
        <span className="font-condensed font-bold text-xs uppercase tracking-widest text-pool-muted-2 flex items-center gap-1.5">
          📊 Marcador probable · modelo
        </span>
        <Badge tone={tone as 'green' | 'gold' | 'muted'}>Confianza {pred.confianza}</Badge>
      </div>

      <div className="flex items-center justify-center gap-4 mb-4">
        <span className="font-condensed font-bold text-sm text-pool-muted w-12 text-right">{abbr(local)}</span>
        <div className="flex items-center gap-2">
          <span className="font-condensed font-extrabold text-3xl text-pool-gold w-9 text-center">{pred.goles_local}</span>
          <span className="text-pool-muted">-</span>
          <span className="font-condensed font-extrabold text-3xl text-pool-gold w-9 text-center">{pred.goles_visitante}</span>
        </div>
        <span className="font-condensed font-bold text-sm text-pool-muted w-12">{abbr(visitante)}</span>
      </div>

      <div className="flex h-2 rounded-full overflow-hidden mb-1.5 bg-pool-bg">
        <div className="bg-pool-green" style={{ width: `${pl}%` }} />
        <div className="bg-white/20" style={{ width: `${px}%` }} />
        <div className="bg-pool-gold" style={{ width: `${pv}%` }} />
      </div>
      <div className="flex justify-between text-[11px] mb-3">
        <span className="text-pool-green font-medium">{abbr(local)} {pl}%</span>
        <span className="text-pool-muted">Empate {px}%</span>
        <span className="text-pool-gold font-medium">{abbr(visitante)} {pv}%</span>
      </div>

      {pred.justificacion && (
        <p className="text-pool-muted text-xs leading-relaxed mb-3">{pred.justificacion}</p>
      )}

      <div className="flex items-center justify-between gap-3">
        {!pred.datos_completos && (
          <span className="text-[10px] text-pool-muted-2 uppercase tracking-wide">Modelo base · sin ajuste reciente</span>
        )}
        {editable && (
          <Button variant="outline" size="sm" className="ml-auto" onClick={onUsar}>Usar este marcador</Button>
        )}
      </div>
    </Card>
  )
}
