import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signUserJWT } from '@/lib/jwt'

// Lightweight user identification flow — no password, no bcrypt. We accept
// an email + display name, upsert the user by email, and mint a 30-day JWT.
// This gates reviewing on "having an email" which matches the UX on
// ipoji.com / chittorgarh and keeps the barrier to writing a review low.
// Can be upgraded to password + verification later without schema changes.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { email?: string; name?: string }
    const email = (body.email || '').trim().toLowerCase()
    const name = (body.name || '').trim()

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!name || name.length < 2 || name.length > 60) {
      return NextResponse.json({ error: 'Display name must be 2-60 characters' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Upsert the user by email. If they already exist, refresh the name.
    const { data: existing, error: selectErr } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .maybeSingle()

    if (selectErr) {
      console.error('[users/login] select error:', selectErr)
      return NextResponse.json({ error: 'Login failed' }, { status: 500 })
    }

    let userId: string
    let userName: string

    if (existing) {
      userId = existing.id
      userName = name
      if (existing.name !== name) {
        await supabase.from('users').update({ name }).eq('id', existing.id)
      }
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('users')
        .insert({ email, name })
        .select('id, name')
        .single()

      if (insertErr || !inserted) {
        console.error('[users/login] insert error:', insertErr)
        return NextResponse.json({ error: 'Could not create account' }, { status: 500 })
      }
      userId = inserted.id
      userName = inserted.name
    }

    const token = await signUserJWT({ userId, email, name: userName }, '30d')

    return NextResponse.json({
      token,
      user: { id: userId, email, name: userName },
    })
  } catch (error) {
    console.error('[users/login] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
