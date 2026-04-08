import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Automated IPO Status Transition Logic
 * 
 * Status Flow: upcoming → open → lastday → closed → allot → listing → (migrate to listed_ipos)
 * 
 * Transitions based on dates:
 * - upcoming → open: When current date >= open_date
 * - open → lastday: When current date = close_date
 * - lastday → closed: When current date > close_date
 * - closed → allot: When current date >= allotment_date
 * - allot → listing: When current date >= list_date
 * - listing → migrate to listed_ipos: After listing day (manual or auto after 1 day)
 */

export async function POST() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const updates: { id: number; oldStatus: string; newStatus: string; name: string }[] = []

    // Fetch all non-listed IPOs
    const { data: ipos, error } = await supabase
      .from('ipos')
      .select('id, name, slug, status, open_date, close_date, allotment_date, list_date')
      .not('status', 'in', '("listed")')
      .order('open_date', { ascending: true })

    if (error) {
      console.error('Error fetching IPOs:', error)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    for (const ipo of ipos || []) {
      let newStatus: string | null = null
      
      const openDate = ipo.open_date
      const closeDate = ipo.close_date
      const allotmentDate = ipo.allotment_date
      const listDate = ipo.list_date

      // Determine the correct status based on dates
      if (today >= listDate) {
        // Past or on listing date
        newStatus = 'listing'
      } else if (today >= allotmentDate) {
        // Past or on allotment date but before listing
        newStatus = 'allot'
      } else if (today > closeDate) {
        // After close date but before allotment
        newStatus = 'closed'
      } else if (today === closeDate) {
        // On close date (last day)
        newStatus = 'lastday'
      } else if (today >= openDate) {
        // Between open and close date
        newStatus = 'open'
      } else {
        // Before open date
        newStatus = 'upcoming'
      }

      // Only update if status has changed
      if (newStatus && newStatus !== ipo.status) {
        const { error: updateError } = await supabase
          .from('ipos')
          .update({ status: newStatus })
          .eq('id', ipo.id)

        if (updateError) {
          console.error(`Error updating IPO ${ipo.name}:`, updateError)
        } else {
          updates.push({
            id: ipo.id,
            name: ipo.name,
            oldStatus: ipo.status,
            newStatus: newStatus,
          })
        }
      }
    }

    return NextResponse.json({
      message: `Status check complete. Updated ${updates.length} IPOs.`,
      updates,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Auto-status error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// GET endpoint to check status without making changes (preview)
export async function GET() {
  try {
    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]
    
    const preview: { id: number; name: string; currentStatus: string; expectedStatus: string; needsUpdate: boolean }[] = []

    const { data: ipos, error } = await supabase
      .from('ipos')
      .select('id, name, status, open_date, close_date, allotment_date, list_date')
      .not('status', 'in', '("listed")')
      .order('open_date', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    for (const ipo of ipos || []) {
      let expectedStatus: string = ipo.status
      
      const openDate = ipo.open_date
      const closeDate = ipo.close_date
      const allotmentDate = ipo.allotment_date
      const listDate = ipo.list_date

      if (today >= listDate) {
        expectedStatus = 'listing'
      } else if (today >= allotmentDate) {
        expectedStatus = 'allot'
      } else if (today > closeDate) {
        expectedStatus = 'closed'
      } else if (today === closeDate) {
        expectedStatus = 'lastday'
      } else if (today >= openDate) {
        expectedStatus = 'open'
      } else {
        expectedStatus = 'upcoming'
      }

      preview.push({
        id: ipo.id,
        name: ipo.name,
        currentStatus: ipo.status,
        expectedStatus,
        needsUpdate: expectedStatus !== ipo.status,
      })
    }

    return NextResponse.json({
      today,
      preview,
      needsUpdate: preview.filter(p => p.needsUpdate).length,
    })
  } catch (error) {
    console.error('Auto-status preview error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
