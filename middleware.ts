import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-this')

async function verifyToken(token: string): Promise<{ adminId: string; username: string } | null> {
  try {
    const verified = await jwtVerify(token, JWT_SECRET)
    return verified.payload as { adminId: string; username: string }
  } catch (error) {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const authHeader = request.headers.get('authorization')

  // Allow login and reset-password without token
  if (pathname === '/api/admin/login' || pathname === '/api/admin/reset-password') {
    // Login doesn't need token, reset-password will check inside the route
    return NextResponse.next()
  }

  // Protect /api/cron/* and /api/admin/* routes.
  // /api/cron/* accepts EITHER a valid JWT (admin manual trigger) OR the
  // shared CRON_SECRET (Vercel cron). /api/admin/* is JWT-only.
  if (pathname.startsWith('/api/cron') || pathname.startsWith('/api/admin')) {
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return NextResponse.json({ error: 'Invalid authorization format' }, { status: 401 })
    }

    const token = parts[1]

    // Vercel cron path: allow the shared secret for /api/cron/*
    // (also works with Cloudflare Worker making Bearer token calls)
    if (pathname.startsWith('/api/cron')) {
      const cronSecret = process.env.CRON_SECRET?.trim()
      const incomingToken = token.trim()
      
      if (cronSecret && incomingToken === cronSecret) {
        return NextResponse.next()
      }
      
      // If secret doesn't match and no valid JWT, reject
      if (!cronSecret) {
        console.error('[v0] CRON_SECRET not configured in environment')
        return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
      }
    }

    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/cron/:path*', '/api/admin/:path*'],
}

