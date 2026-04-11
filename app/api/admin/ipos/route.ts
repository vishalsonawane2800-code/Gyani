import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/ipos - List all IPOs
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching IPOs:', error)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/ipos - Create new IPO
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    const requiredFields = ['name', 'slug', 'exchange', 'price_min', 'price_max', 'lot_size', 'open_date', 'close_date']
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 })
      }
    }

    // Prepare data for insertion - matching database column names exactly
    const ipoData = {
      company_name: body.name,
      slug: body.slug,
      exchange: body.exchange,
      sector: body.sector || null,
      price_min: body.price_min,
      price_max: body.price_max,
      lot_size: body.lot_size,
      issue_size: body.issue_size || (body.issue_size_cr ? `${body.issue_size_cr} Cr` : null),
      // Fresh Issue and OFS fields
      fresh_issue: body.fresh_issue || null,
      ofs: body.ofs || 'Nil',
      open_date: body.open_date,
      close_date: body.close_date,
      allotment_date: body.allotment_date || null,
      listing_date: body.list_date || body.listing_date || null,
      status: body.status || 'upcoming',
      registrar: body.registrar || null,
      brlm: body.lead_manager || body.brlm || null,
      description: body.about_company || body.description || null,
      bg_color: body.bg_color || '#f0f9ff',
      fg_color: body.fg_color || '#0369a1',
      // Scraper URLs
      chittorgarh_url: body.chittorgarh_url || null,
      investorgain_gmp_url: body.investorgain_gmp_url || null,
      investorgain_sub_url: body.investorgain_sub_url || null,
      // Exchange symbols
      nse_symbol: body.nse_symbol || null,
      bse_scrip_code: body.bse_scrip_code || null,
      logo_url: body.logo_url || null,
      // AI Prediction fields
      ai_prediction: body.ai_prediction || 0,
      ai_confidence: body.ai_confidence || 50,
      sentiment_score: body.sentiment_score || 50,
      sentiment_label: body.sentiment_label || 'Neutral',
    }

    const { data, error } = await supabase
      .from('ipos')
      .insert([ipoData])
      .select()
      .single()

    if (error) {
      console.error('[v0] Error creating IPO:', error)
      console.error('[v0] Error message:', error.message)
      console.error('[v0] Error code:', error.code)
      console.error('[v0] Error details:', error.details)
      console.error('[v0] IPO data attempted:', JSON.stringify(ipoData, null, 2))
      // Check for duplicate slug
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An IPO with this slug already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: `Failed to create IPO: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
