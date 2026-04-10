import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Twice-Daily GMP History Scraper
 * 
 * This cron job runs at:
 * - 12:00 PM IST (6:30 AM UTC) - Morning slot
 * - 10:00 PM IST (4:30 PM UTC) - Evening slot
 * 
 * Schedule: "30 6,16 * * *" (6:30 AM and 4:30 PM UTC)
 * 
 * Purpose: Store GMP snapshots for historical tracking and graph visualization
 */

const CRON_SECRET = process.env.CRON_SECRET

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('[GMP History] Supabase credentials not configured')
    return null
  }
  
  return createSupabaseClient(url, key)
}

/**
 * Determine time slot based on current IST time
 * Morning: Before 3 PM IST (9:30 AM UTC)
 * Evening: 3 PM IST onwards
 */
function getTimeSlot(): 'morning' | 'evening' {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinutes = now.getUTCMinutes()
  
  // IST is UTC + 5:30
  // 3 PM IST = 9:30 AM UTC = 9.5 hours
  const utcTime = utcHour + utcMinutes / 60
  
  // If before 9:30 UTC (3 PM IST), it's morning slot
  // Note: Our cron runs at 6:30 UTC (12 PM IST) and 16:30 UTC (10 PM IST)
  return utcTime < 9.5 ? 'morning' : 'evening'
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const timeSlot = getTimeSlot()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toISOString()

  const results: { name: string; gmp: number | null; slot: string; stored: boolean; error?: string }[] = []

  try {
    // Get all active IPOs with their current GMP
    const { data: ipos, error: fetchError } = await supabase
      .from('ipos')
      .select('id, company_name, gmp, gmp_percent, price_max')
      .in('status', ['open', 'lastday', 'upcoming', 'allot', 'listing'])

    if (fetchError) {
      console.error('[GMP History] Error fetching IPOs:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    if (!ipos || ipos.length === 0) {
      return NextResponse.json({ 
        message: 'No active IPOs to store GMP history for', 
        timeSlot,
        date: today,
        updatedAt: now
      })
    }

    // Store GMP history for each IPO
    for (const ipo of ipos) {
      // Skip if no GMP data
      if (ipo.gmp === null || ipo.gmp === undefined) {
        results.push({ 
          name: ipo.company_name, 
          gmp: null, 
          slot: timeSlot, 
          stored: false, 
          error: 'No GMP data available' 
        })
        continue
      }

      // Calculate GMP percent if not available
      const gmpPercent = ipo.gmp_percent ?? 
        (ipo.price_max && ipo.price_max > 0 
          ? Math.round((ipo.gmp / ipo.price_max) * 100 * 10) / 10 
          : 0)

      // Try to upsert GMP history record
      // Unique key: ipo_id + date + time_slot
      const { error: upsertError } = await supabase
        .from('gmp_history')
        .upsert({
          ipo_id: ipo.id,
          date: today,
          time_slot: timeSlot,
          gmp: ipo.gmp,
          gmp_percent: gmpPercent,
          source: 'scheduled',
          recorded_at: now,
        }, {
          onConflict: 'ipo_id,date,time_slot',
          ignoreDuplicates: false,
        })

      if (upsertError) {
        // If upsert fails (constraint might not exist), try manual check
        const { data: existing } = await supabase
          .from('gmp_history')
          .select('id')
          .eq('ipo_id', ipo.id)
          .eq('date', today)
          .eq('time_slot', timeSlot)
          .single()

        if (existing) {
          // Update existing
          await supabase
            .from('gmp_history')
            .update({
              gmp: ipo.gmp,
              gmp_percent: gmpPercent,
              source: 'scheduled',
              recorded_at: now,
            })
            .eq('id', existing.id)
        } else {
          // Insert new
          await supabase
            .from('gmp_history')
            .insert({
              ipo_id: ipo.id,
              date: today,
              time_slot: timeSlot,
              gmp: ipo.gmp,
              gmp_percent: gmpPercent,
              source: 'scheduled',
              recorded_at: now,
            })
        }

        results.push({ 
          name: ipo.company_name, 
          gmp: ipo.gmp, 
          slot: timeSlot, 
          stored: true 
        })
      } else {
        results.push({ 
          name: ipo.company_name, 
          gmp: ipo.gmp, 
          slot: timeSlot, 
          stored: true 
        })
      }
    }

    return NextResponse.json({
      message: `GMP history stored for ${timeSlot} slot`,
      timeSlot,
      date: today,
      updatedAt: now,
      results,
      successCount: results.filter(r => r.stored).length,
      totalCount: results.length,
    })

  } catch (error) {
    console.error('[GMP History] Cron error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
