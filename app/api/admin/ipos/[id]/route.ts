import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET /api/admin/ipos/[id] - Get single IPO
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('ipos')
      .select('*')
      .eq('id', parseInt(id))
      .single()

    if (error) {
      console.error('Error fetching IPO:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
      }
      return NextResponse.json({ error: 'Failed to fetch IPO' }, { status: 500 })
    }

    return NextResponse.json({ data })
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

    // Prepare update data
    const updateData = {
      name: body.name,
      slug: body.slug,
      abbr: body.abbr,
      exchange: body.exchange,
      sector: body.sector,
      price_min: body.price_min,
      price_max: body.price_max,
      lot_size: body.lot_size,
      issue_size: body.issue_size || `${body.issue_size_cr} Cr`,
      issue_size_cr: body.issue_size_cr,
      fresh_issue: body.fresh_issue || null,
      ofs: body.ofs || 'Nil',
      open_date: body.open_date,
      close_date: body.close_date,
      allotment_date: body.allotment_date,
      list_date: body.list_date,
      status: body.status,
      registrar: body.registrar || null,
      lead_manager: body.lead_manager || null,
      about_company: body.about_company || null,
      bg_color: body.bg_color || '#f0f9ff',
      fg_color: body.fg_color || '#0369a1',
      chittorgarh_url: body.chittorgarh_url || null,
      nse_symbol: body.nse_symbol || null,
      bse_scrip_code: body.bse_scrip_code || null,
    }

    const { data, error } = await supabase
      .from('ipos')
      .update(updateData)
      .eq('id', parseInt(id))
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
      return NextResponse.json({ error: 'Failed to update IPO' }, { status: 500 })
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
      .eq('id', parseInt(id))

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
