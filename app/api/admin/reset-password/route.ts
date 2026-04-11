import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword, verifyPassword } from '@/lib/hash'
import { verifyJWT, extractToken } from '@/lib/jwt'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: Request) {
  try {
    // Verify JWT token
    const authHeader = request.headers.get('authorization')
    const token = extractToken(authHeader)

    if (!token) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization token' },
        { status: 401 }
      )
    }

    const payload = await verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const { current_password, new_password, confirm_password } = await request.json()

    if (!current_password || !new_password || !confirm_password) {
      return NextResponse.json(
        { error: 'Current password, new password, and confirm password are required' },
        { status: 400 }
      )
    }

    if (new_password !== confirm_password) {
      return NextResponse.json(
        { error: 'New password and confirm password do not match' },
        { status: 400 }
      )
    }

    if (new_password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Get admin from database
    const { data: admin, error } = await supabase
      .from('admins')
      .select('id, password_hash')
      .eq('id', payload.adminId)
      .single()

    if (error || !admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      )
    }

    // Verify current password
    const isValid = await verifyPassword(current_password, admin.password_hash)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 401 }
      )
    }

    // Hash new password
    const new_hash = await hashPassword(new_password)

    // Update password in database
    const { error: updateError } = await supabase
      .from('admins')
      .update({
        password_hash: new_hash,
        must_reset_password: false,
      })
      .eq('id', payload.adminId)

    if (updateError) {
      console.error('[reset-password] Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Password updated successfully',
      must_reset_password: false,
    })
  } catch (error) {
    console.error('[admin/reset-password] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
