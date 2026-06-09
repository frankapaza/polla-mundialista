import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: 'Polla Mundialista 2026',
  description: 'Hacé tus pronósticos del Mundial FIFA 2026 con tus amigos',
  appleWebApp: { capable: true, title: 'Polla 2026', statusBarStyle: 'black-translucent' },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#059669',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-full bg-slate-950 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
