/** Pantalla de carga con la mascota Gollo 🐓 (festejando). */
export function Cargando({ texto = 'Gollo está cargando…' }: { texto?: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-pool-bg">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/gollo-festejo.png" alt="Gollo" className="w-32 h-auto animate-float-y drop-shadow-2xl" />
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" />
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" style={{ animationDelay: '.2s' }} />
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" style={{ animationDelay: '.4s' }} />
      </div>
      <p className="text-pool-muted font-condensed uppercase tracking-widest text-sm">{texto}</p>
    </main>
  )
}
