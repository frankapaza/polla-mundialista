'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchLiga } from '@/lib/liga'

/**
 * Si el código corresponde a una LIGA (modelo v2), redirige el flujo viejo
 * `/grupo/[codigo]/*` hacia `/liga/[codigo]` para que haya una sola puerta de
 * entrada y no se confundan los participantes. Los grupos que NO son liga
 * (de otra gente) siguen funcionando con el flujo anterior.
 */
export default function GrupoLayout({ children }: { children: React.ReactNode }) {
  const params = useParams()
  const router = useRouter()
  const codigo = (params.codigo as string).toUpperCase()
  const [estado, setEstado] = useState<'check' | 'old'>('check')

  useEffect(() => {
    let cancel = false
    fetchLiga(codigo).then(liga => {
      if (cancel) return
      if (liga) router.replace(`/liga/${codigo}`)
      else setEstado('old')
    })
    return () => { cancel = true }
  }, [codigo, router])

  if (estado === 'check') {
    return <main className="min-h-screen flex items-center justify-center bg-pool-bg text-pool-muted">Redirigiendo a tu polla…</main>
  }
  return <>{children}</>
}
