import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Cache for 60s at the edge. The underlying query is cheap but this also
// keeps the header fast when many users hit the site concurrently.
export const revalidate = 60

// GET /api/public/live-ipo-count
// Returns the number of IPOs that are actively "live" for retail investors
// right now — i.e. open for bidding. Consumed by the header badge so it
// always reflects the real count instead of a hardcoded number.
export async function GET() {
  try {
    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ count: 0, source: 'no-supabase' })
    }

    // "Live" = currently accepting bids. `open` covers day 1..N-1,
    // `lastday` covers the final day of the bidding window.
    const { count, error } = await supabase
      .from('ipos')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'lastday'])

    if (error) {
      console.error('[v0] live-ipo-count error:', error)
      return NextResponse.json({ count: 0, source: 'error' })
    }

    return NextResponse.json({ count: count ?? 0, source: 'db' })
  } catch (err) {
    console.error('[v0] live-ipo-count exception:', err)
    return NextResponse.json({ count: 0, source: 'exception' })
  }
}
