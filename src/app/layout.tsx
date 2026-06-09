import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Polla Mundialista 2026',
  description: 'Hacé tus pronósticos del Mundial 2026 con tus amigos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
