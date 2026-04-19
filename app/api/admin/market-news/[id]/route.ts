import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT /api/admin/market-news/[id] - update a market news item
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()
    const body = await request.json()

    // If URL is provided, validate it.
    if (body.url) {
      try {
        const parsed = new URL(body.url)
        if (!/^https?:$/.test(parsed.protocol)) {
          return NextResponse.json({ error: 'URL must start with http:// or https://' }, { status: 400 })
        }
      } catch {
        return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
      }
    }

    if (body.sentiment && !['positive', 'neutral', 'negative'].includes(body.sentiment)) {
      return NextResponse.json({ error: 'Invalid sentiment' }, { status: 400 })
    }

    // Only include fields that are explicitly provided so partial updates work.
    const updateData: Record<string, unknown> = {}
    if (body.title !== undefined) updateData.title = String(body.title).trim()
    if (body.url !== undefined) updateData.url = String(body.url).trim()
    if (body.source !== undefined) updateData.source = body.source ? String(body.source).trim() : null
    if (body.tag !== undefined) updateData.tag = (String(body.tag).trim() || 'IPO').toUpperCase()
    if (body.impact !== undefined) updateData.impact = body.impact ? String(body.impact).trim() : null
    if (body.sentiment !== undefined) updateData.sentiment = body.sentiment || null
    if (body.image_url !== undefined) updateData.image_url = body.image_url ? String(body.image_url).trim() : null
    if (body.summary !== undefined) updateData.summary = body.summary ? String(body.summary).trim() : null
    if (body.published_at !== undefined) updateData.published_at = body.published_at
    if (body.is_published !== undefined) updateData.is_published = !!body.is_published
    if (body.display_order !== undefined && Number.isFinite(body.display_order)) {
      updateData.display_order = body.display_order
    }

    const { data, error } = await supabase
      .from('market_news')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating market news:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'News item not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A news item with this URL already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Failed to update market news' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/admin/market-news/[id] - delete a market news item
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { error } = await supabase
      .from('market_news')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting market news:', error)
      return NextResponse.json({ error: 'Failed to delete market news' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
