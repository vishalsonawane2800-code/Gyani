import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/reviews/[id] - Get single review
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('expert_reviews')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching review:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch review' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/admin/reviews/[id] - Update review
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    const updateData = {
      source: body.source,
      source_type: body.source_type,
      author: body.author,
      summary: body.summary,
      sentiment: body.sentiment,
      url: body.url || null,
      logo_url: body.logo_url || null,
      review_date: body.review_date || null,
    }

    const { data, error } = await supabase
      .from('expert_reviews')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating review:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/admin/reviews/[id] - Delete review
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('expert_reviews')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting review:', error)
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
