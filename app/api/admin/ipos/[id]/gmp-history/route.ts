import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseGMPHistory } from '@/lib/bulk-data-parsers'

// GET: Fetch GMP history for an IPO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('gmp_history')
    .select('*')
    .eq('ipo_id', id)
    .order('date', { ascending: false })
    .order('time_slot', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ gmpHistory: data })
}

// POST: Bulk insert/update GMP history from parsed text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text, clearExisting } = await request.json()
    
    // Parse the bulk text
    const parseResult = parseGMPHistory(text)
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Failed to parse GMP history data',
        details: parseResult.errors 
      }, { status: 400 })
    }

    // Verify IPO exists and get price_max for percentage calculation
    const { data: ipo, error: ipoError } = await supabase
      .from('ipos')
      .select('id, price_max')
      .eq('id', id)
      .single()

    if (ipoError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    // Clear existing GMP history if requested
    if (clearExisting) {
      await supabase
        .from('gmp_history')
        .delete()
        .eq('ipo_id', id)
    }

    // Insert new GMP entries
    const now = new Date().toISOString()
    let insertedCount = 0
    let updatedCount = 0

    for (const entry of parseResult.data) {
      // Calculate GMP percent
      const gmpPercent = ipo.price_max && ipo.price_max > 0
        ? Math.round((entry.gmp / ipo.price_max) * 100 * 10) / 10
        : 0

      const gmpRecord = {
        ipo_id: id,
        date: entry.date,
        time_slot: entry.time_slot,
        gmp: entry.gmp,
        gmp_percent: gmpPercent,
        source: 'manual',
        recorded_at: now,
      }

      // Try to upsert (update if exists, insert if not)
      const { data: existing } = await supabase
        .from('gmp_history')
        .select('id')
        .eq('ipo_id', id)
        .eq('date', entry.date)
        .eq('time_slot', entry.time_slot)
        .single()

      if (existing) {
        // Update existing record
        await supabase
          .from('gmp_history')
          .update({
            gmp: entry.gmp,
            gmp_percent: gmpPercent,
            source: 'manual',
            recorded_at: now,
          })
          .eq('id', existing.id)
        updatedCount++
      } else {
        // Insert new record
        await supabase
          .from('gmp_history')
          .insert(gmpRecord)
        insertedCount++
      }
    }

    // Update the IPO's current GMP with the most recent entry
    const sortedEntries = parseResult.data.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date)
      if (dateCompare !== 0) return dateCompare
      return b.time_slot === 'evening' ? 1 : -1
    })
    
    if (sortedEntries.length > 0) {
      const latestEntry = sortedEntries[0]
      const latestGmpPercent = ipo.price_max && ipo.price_max > 0
        ? Math.round((latestEntry.gmp / ipo.price_max) * 100 * 10) / 10
        : 0

      await supabase
        .from('ipos')
        .update({
          gmp: latestEntry.gmp,
          gmp_percent: latestGmpPercent,
          gmp_last_updated: now,
        })
        .eq('id', id)
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully processed ${parseResult.data.length} GMP entries (${insertedCount} inserted, ${updatedCount} updated)`,
      count: parseResult.data.length,
      inserted: insertedCount,
      updated: updatedCount,
    })

  } catch (error) {
    console.error('GMP history bulk import error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: Remove all GMP history for an IPO
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('gmp_history')
    .delete()
    .eq('ipo_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
