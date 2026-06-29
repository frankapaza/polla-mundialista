/**
 * Pantalla de carga con la mascota "Gollo" 🐓.
 * (Usa el ícono vectorial del gallo; se puede cambiar por un PNG de Gollo
 *  con fondo transparente cuando esté disponible.)
 */
export function Cargando({ texto = 'Gollo está cargando…' }: { texto?: string }) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-5 bg-pool-bg">
      <span className="inline-flex w-20 h-20 rounded-3xl bg-pool-gold text-[#231a05] items-center justify-center animate-float-y shadow-lg shadow-pool-gold/10">
        <svg viewBox="0 0 24 24" className="w-11 h-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" /><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
          <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
          <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" /><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
        </svg>
      </span>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" />
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" style={{ animationDelay: '.2s' }} />
        <span className="w-2 h-2 rounded-full bg-pool-green animate-pulse-dot" style={{ animationDelay: '.4s' }} />
      </div>
      <p className="text-pool-muted font-condensed uppercase tracking-widest text-sm">{texto}</p>
    </main>
  )
}
