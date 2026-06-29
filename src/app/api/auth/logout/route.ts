import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth-server'

export const runtime = 'nodejs'

export async function POST() {
  const r = NextResponse.json({ ok: true })
  r.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return r
}
