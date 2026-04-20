import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractToken, verifyUserJWT } from '@/lib/jwt'

// Public GET + authenticated POST for site-wide community reviews that
// appear on the bottom of the home page. `ipo_id` is optional — NULL means
// a general site review. Inserts require a valid user JWT (see /api/users/login).

export const dynamic = 'force-dynamic'

// GET /api/community-reviews?limit=6&ipoId=123
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit')) || 6))
    const ipoIdParam = searchParams.get('ipoId')

    const supabase = createAdminClient()
    let query = supabase
      .from('community_reviews')
      .select('id, user_name, rating, comment, ipo_id, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (ipoIdParam) {
      const ipoId = Number(ipoIdParam)
      if (!Number.isNaN(ipoId)) query = query.eq('ipo_id', ipoId)
    }

    const { data, error } = await query
    if (error) {
      console.error('[community-reviews GET] error:', error)
      return NextResponse.json({ error: 'Could not load reviews' }, { status: 500 })
    }

    return NextResponse.json({ reviews: data ?? [] })
  } catch (error) {
    console.error('[community-reviews GET] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/community-reviews  { comment, rating?, ipoId? }
// Requires Authorization: Bearer <user-jwt>
export async function POST(request: Request) {
  try {
    const token = extractToken(request.headers.get('authorization'))
    const payload = token ? await verifyUserJWT(token) : null
    if (!payload) {
      return NextResponse.json({ error: 'Please log in to post a review' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({})) as {
      comment?: string
      rating?: number
      ipoId?: number | null
    }

    const comment = (body.comment || '').trim()
    if (comment.length < 10) {
      return NextResponse.json({ error: 'Review must be at least 10 characters' }, { status: 400 })
    }
    if (comment.length > 2000) {
      return NextResponse.json({ error: 'Review must be under 2000 characters' }, { status: 400 })
    }

    const rating =
      typeof body.rating === 'number' && body.rating >= 1 && body.rating <= 5
        ? Math.round(body.rating)
        : null

    const ipoId =
      typeof body.ipoId === 'number' && Number.isFinite(body.ipoId) ? body.ipoId : null

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('community_reviews')
      .insert({
        user_id: payload.userId,
        user_name: payload.name,
        comment,
        rating,
        ipo_id: ipoId,
        is_approved: true,
      })
      .select('id, user_name, rating, comment, ipo_id, created_at')
      .single()

    if (error || !data) {
      console.error('[community-reviews POST] insert error:', error)
      return NextResponse.json({ error: 'Could not save review' }, { status: 500 })
    }

    return NextResponse.json({ review: data }, { status: 201 })
  } catch (error) {
    console.error('[community-reviews POST] exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
