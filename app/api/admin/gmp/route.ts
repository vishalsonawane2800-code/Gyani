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
        source,
        created_at,
        ipos (
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false })
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
    if (!body.ipo_id || body.gmp === undefined || !body.date) {
      return NextResponse.json({ error: 'Missing required fields: ipo_id, gmp, date' }, { status: 400 })
    }

    const gmpData = {
      ipo_id: body.ipo_id,
      gmp: body.gmp,
      gmp_percent: body.gmp_percent || 0,
      date: body.date,
      source: body.source || null,
    }

    // Use upsert to handle duplicate date entries
    const { data, error } = await supabase
      .from('gmp_history')
      .upsert([gmpData], { 
        onConflict: 'ipo_id,date',
        ignoreDuplicates: false 
      })
      .select()

    if (error) {
      console.error('Error adding GMP entry:', error)
      // If upsert doesn't work, try insert
      if (error.code === '42501' || error.code === '23505') {
        // Try updating existing entry
        const { data: updateData, error: updateError } = await supabase
          .from('gmp_history')
          .update({
            gmp: body.gmp,
            gmp_percent: body.gmp_percent || 0,
            source: body.source || null,
          })
          .eq('ipo_id', body.ipo_id)
          .eq('date', body.date)
          .select()

        if (updateError) {
          return NextResponse.json({ error: 'Failed to add/update GMP entry' }, { status: 500 })
        }
        return NextResponse.json({ data: updateData, updated: true }, { status: 200 })
      }
      return NextResponse.json({ error: 'Failed to add GMP entry' }, { status: 500 })
    }

    // Also update the main IPO table with latest GMP
    await supabase
      .from('ipos')
      .update({
        gmp: body.gmp,
        gmp_percent: body.gmp_percent || 0,
        gmp_last_updated: new Date().toISOString(),
      })
      .eq('id', body.ipo_id)

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Server error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
