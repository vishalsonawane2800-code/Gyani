import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/gmp - List GMP history
export async function GET() {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('gmp_history')
      .select(`
        id,
        ipo_id,
        gmp,
        gmp_percent,
        date,
        time_slot,
        recorded_at,
        source,
        ipos (
          company_name,
          slug
        )
      `)
      .order('date', { ascending: false })
      .order('time_slot', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching GMP history:', error)
      return NextResponse.json({ error: 'Failed to fetch GMP history' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST /api/admin/gmp - Add new GMP entry
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // Validate required fields
    if (!body.ipo_id || body.gmp === undefined) {
      return NextResponse.json({ error: 'Missing required fields: ipo_id, gmp' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const today = body.date || now.split('T')[0]
    
    const gmpData = {
      ipo_id: body.ipo_id,
      gmp: body.gmp,
      gmp_percent: body.gmp_percent || 0,
      date: today,
      time_slot: body.time_slot || 'morning',
      recorded_at: now,
      source: body.source || 'manual',
    }

    // Insert new GMP entry
    const { data, error } = await supabase
      .from('gmp_history')
      .insert([gmpData])
      .select()

    if (error) {
      console.error('Error adding GMP entry:', error)
      return NextResponse.json({ error: `Failed to add GMP entry: ${error.message}` }, { status: 500 })
    }

    // Also update the main IPO table with latest GMP
    const gmpPercent = body.gmp_percent ?? 0
    await supabase
      .from('ipos')
      .update({
        gmp: body.gmp,
        gmp_percent: gmpPercent,
        gmp_last_updated: new Date().toISOString(),
      })
      .eq('id', body.ipo_id)

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
