import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyPassword } from '@/lib/hash'
import { signJWT } from '@/lib/jwt'

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Get admin from database
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, username, password_hash, must_reset_password')
      .eq('username', username)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Generate JWT token (15 minute expiry)
    const token = await signJWT(
      {
        adminId: admin.id,
        username: admin.username,
      },
      '15m'
    )

    return NextResponse.json({
      token,
      must_reset_password: admin.must_reset_password,
      username: admin.username,
    })
  } catch (error) {
    console.error('[admin/login] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
