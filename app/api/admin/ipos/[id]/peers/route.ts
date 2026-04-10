import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parsePeerComparison } from '@/lib/bulk-data-parsers'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) return null
  return createClient(url, key)
}

// GET: Fetch peer companies for an IPO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('peer_companies')
    .select('*')
    .eq('ipo_id', id)
    .order('is_ipo_company', { ascending: false })
    .order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ peers: data })
}

// POST: Bulk insert/update peer companies from parsed text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  try {
    const { text, clearExisting } = await request.json()
    
    // Parse the bulk text
    const parseResult = parsePeerComparison(text)
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Failed to parse peer comparison data',
        details: parseResult.errors 
      }, { status: 400 })
    }

    // Verify IPO exists
    const { data: ipo, error: ipoError } = await supabase
      .from('ipos')
      .select('id')
      .eq('id', id)
      .single()

    if (ipoError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    // Clear existing peers if requested
    if (clearExisting) {
      await supabase
        .from('peer_companies')
        .delete()
        .eq('ipo_id', id)
    }

    // Insert new peers with display order
    const peersToInsert = parseResult.data.map((peer, index) => ({
      ipo_id: id,
      company_name: peer.company_name,
      market_cap: peer.market_cap,
      revenue: peer.revenue,
      pat: peer.pat,
      pe_ratio: peer.pe_ratio,
      pb_ratio: peer.pb_ratio,
      roe: peer.roe,
      roce: peer.roce,
      debt_equity: peer.debt_equity,
      eps: peer.eps,
      current_price: peer.current_price,
      is_ipo_company: peer.is_ipo_company,
      display_order: index,
    }))

    const { error: insertError } = await supabase
      .from('peer_companies')
      .insert(peersToInsert)

    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to insert peer companies',
        details: insertError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully imported ${parseResult.data.length} peer companies`,
      count: parseResult.data.length,
      data: parseResult.data
    })

  } catch (error) {
    console.error('Peers bulk import error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: Remove all peers for an IPO
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
  }

  const { error } = await supabase
    .from('peer_companies')
    .delete()
    .eq('ipo_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
