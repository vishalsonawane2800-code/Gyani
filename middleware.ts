import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const CRON_SECRET = process.env.CRON_SECRET
const ADMIN_SECRET = process.env.ADMIN_SECRET

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authHeader = request.headers.get('authorization')

  // Protect /api/cron/* routes with CRON_SECRET
  if (pathname.startsWith('/api/cron')) {
    if (!CRON_SECRET) {
      console.warn('[Middleware] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      console.log(`[Middleware] Unauthorized cron request to ${pathname}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next()
  }

  // Protect /api/admin/* routes with ADMIN_SECRET
  if (pathname.startsWith('/api/admin')) {
    if (!ADMIN_SECRET) {
      console.warn('[Middleware] ADMIN_SECRET not configured')
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
      console.log(`[Middleware] Unauthorized admin request to ${pathname}`)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/cron/:path*', '/api/admin/:path*'],
}
