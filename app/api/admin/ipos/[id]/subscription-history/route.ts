import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseSubscriptionHistory } from '@/lib/bulk-data-parsers'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) return null
  return createClient(url, key)
}

// GET: Fetch subscription history for an IPO
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
    .from('subscription_history')
    .select('*')
    .eq('ipo_id', id)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subscriptions: data })
}

// POST: Bulk insert/update subscription history from parsed text
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
    const parseResult = parseSubscriptionHistory(text)
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Failed to parse subscription data',
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

    // Clear existing subscription history if requested
    if (clearExisting) {
      await supabase
        .from('subscription_history')
        .delete()
        .eq('ipo_id', id)
    }

    // Insert new subscription entries
    const subscriptionsToInsert = parseResult.data.map(s => ({
      ipo_id: id,
      date: s.date,
      time: s.time,
      day_number: s.day_number,
      anchor: s.anchor,
      retail: s.retail,
      nii: s.nii,
      snii: s.snii,
      bnii: s.bnii,
      qib: s.qib,
      total: s.total,
      employee: s.employee,
      is_final: s.is_final,
      source: 'manual',
    }))

    // Upsert based on ipo_id + date + time
    for (const subscription of subscriptionsToInsert) {
      const { error: upsertError } = await supabase
        .from('subscription_history')
        .upsert(subscription, {
          onConflict: 'ipo_id,date,time',
          ignoreDuplicates: false,
        })
      
      if (upsertError) {
        // If upsert fails, try delete + insert
        await supabase
          .from('subscription_history')
          .delete()
          .eq('ipo_id', id)
          .eq('date', subscription.date)
          .eq('time', subscription.time)
        
        await supabase
          .from('subscription_history')
          .insert(subscription)
      }
    }

    // Update the IPO with the latest subscription data
    const latestEntry = parseResult.data[parseResult.data.length - 1]
    if (latestEntry) {
      await supabase
        .from('ipos')
        .update({
          subscription_total: latestEntry.total,
          subscription_retail: `${latestEntry.retail}x`,
          subscription_nii: `${latestEntry.nii}x`,
          subscription_qib: `${latestEntry.qib}x`,
          subscription_shni: latestEntry.snii,
          subscription_bhni: latestEntry.bnii,
          subscription_employee: latestEntry.employee,
          subscription_day: latestEntry.day_number,
          subscription_is_final: latestEntry.is_final,
          last_subscription_update: new Date().toISOString(),
        })
        .eq('id', id)
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully imported ${parseResult.data.length} subscription entries`,
      count: parseResult.data.length,
      data: parseResult.data
    })

  } catch (error) {
    console.error('Subscription bulk import error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
