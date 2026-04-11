import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/ipos/[id] - Get single IPO with financials
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching IPO:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch IPO' }, { status: 500 })
    }

    // Also fetch financials for this IPO
    const { data: financials } = await supabase
      .from('ipo_financials')
      .select('*')
      .eq('ipo_id', id)
      .order('fiscal_year', { ascending: true })

    return NextResponse.json({ ...data, financials: financials || [] })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/admin/ipos/[id] - Update IPO
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const body = await request.json()

    // Prepare update data - matching database column names exactly
    const updateData = {
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
      status: body.status,
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
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating IPO:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
      }
      if (error.code === '23505') {
        return NextResponse.json({ error: 'An IPO with this slug already exists' }, { status: 400 })
      }
      return NextResponse.json({ error: `Failed to update IPO: ${error.message}` }, { status: 500 })
    }

    // Handle financials update if provided
    if (body.financials && Array.isArray(body.financials)) {
      // Delete existing financials for this IPO
      await supabase
        .from('ipo_financials')
        .delete()
        .eq('ipo_id', id)

      // Insert new financials
      if (body.financials.length > 0) {
        const financialsData = body.financials.map((f: { fiscal_year: string; revenue: number; pat: number; ebitda: number }) => ({
          ipo_id: id,
          fiscal_year: f.fiscal_year,
          revenue: f.revenue || 0,
          pat: f.pat || 0,
          ebitda: f.ebitda || 0,
        }))
        
        await supabase
          .from('ipo_financials')
          .insert(financialsData)
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/admin/ipos/[id] - Delete IPO
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('ipos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting IPO:', error)
      return NextResponse.json({ error: 'Failed to delete IPO' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
