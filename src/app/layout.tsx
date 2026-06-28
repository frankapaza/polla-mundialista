import type { Metadata, Viewport } from 'next'
import { Barlow, Barlow_Condensed } from 'next/font/google'
import './globals.css'

const barlow = Barlow({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
})

const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-barlow-condensed',
})

export const metadata: Metadata = {
  title: 'Polla Mundialista 2026',
  description: 'Hacé tus pronósticos del Mundial FIFA 2026 con tus amigos',
  appleWebApp: { capable: true, title: 'Polla 2026', statusBarStyle: 'black-translucent' },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#0c1510',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable} h-full`}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-full bg-pool-bg text-pool-text font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
