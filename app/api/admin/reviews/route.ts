import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/reviews - List all reviews or reviews for a specific IPO
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const ipoId = searchParams.get('ipo_id')
    
    const supabase = await createClient()
    
    let query = supabase
      .from('expert_reviews')
      .select(`
        *,
        ipos (id, name, slug)
      `)
      .order('created_at', { ascending: false })
    
    if (ipoId) {
      query = query.eq('ipo_id', parseInt(ipoId))
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching reviews:', error)
      return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/reviews - Create new review
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['ipo_id', 'source', 'source_type', 'author', 'summary', 'sentiment']
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Validate source_type
    const validSourceTypes = ['youtube', 'analyst', 'news', 'firm']
    if (!validSourceTypes.includes(body.source_type)) {
      return NextResponse.json({ error: 'Invalid source_type' }, { status: 400 })
    }

    // Validate sentiment
    const validSentiments = ['positive', 'neutral', 'negative']
    if (!validSentiments.includes(body.sentiment)) {
      return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
    }

    const reviewData = {
      ipo_id: body.ipo_id,
      source: body.source,
      source_type: body.source_type,
      author: body.author,
      summary: body.summary,
      sentiment: body.sentiment,
      url: body.url || null,
      logo_url: body.logo_url || null,
      review_date: body.review_date || new Date().toISOString().split('T')[0],
    }

    const { data, error } = await supabase
      .from('expert_reviews')
      .insert([reviewData])
      .select()
      .single()

    if (error) {
      console.error('Error creating review:', error)
      return NextResponse.json({ error: 'Failed to create review' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
