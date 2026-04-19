import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/admin/market-news - list all market news items (published + drafts)
export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('market_news')
      .select('*')
      .order('display_order', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching market news:', error)
      return NextResponse.json({ error: 'Failed to fetch market news' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/market-news - create a new market news item
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()
    const body = await request.json()

    // Required fields
    if (!body.title || typeof body.title !== 'string') {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 })
    }
    if (!body.url || typeof body.url !== 'string') {
      return NextResponse.json({ error: 'Missing required field: url' }, { status: 400 })
    }

    // Basic URL validation - must be http(s)
    try {
      const parsed = new URL(body.url)
      if (!/^https?:$/.test(parsed.protocol)) {
        return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    // Validate sentiment if provided
    if (body.sentiment && !['positive', 'neutral', 'negative'].includes(body.sentiment)) {
      return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
    }

    const insertData = {
      title: body.title.trim(),
      url: body.url.trim(),
      source: body.source?.trim() || null,
      tag: (body.tag?.trim() || 'IPO').toUpperCase(),
      impact: body.impact?.trim() || null,
      sentiment: body.sentiment || null,
      image_url: body.image_url?.trim() || null,
      summary: body.summary?.trim() || null,
      published_at: body.published_at || new Date().toISOString(),
      is_published: body.is_published !== undefined ? !!body.is_published : true,
      display_order: Number.isFinite(body.display_order) ? body.display_order : 0,
    }

    const { data, error } = await supabase
      .from('market_news')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Error creating market news:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A news item with this URL already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to create market news' }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
