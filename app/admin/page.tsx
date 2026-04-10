import { createClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

/* =========================================================================
   ADMIN DASHBOARD PAGE
   =========================================================================
   
   This page fetches all IPOs from the database and displays them in an
   organized dashboard with sections for different IPO statuses.
   
   Data Flow:
   1. Fetch all IPOs from Supabase (ordered by open_date descending)
   2. Calculate stats for the overview cards
   3. Pass data to the client component for rendering
   
   The client component handles:
   - Categorizing IPOs by status (upcoming, open, processing, listing)
   - Status syncing and data refresh
   - Quick status changes and migrations
   
   ========================================================================= */

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  
  if (!supabase) {
    return <AdminDashboardClient ipos={[]} stats={{ total: 0, open: 0, upcoming: 0, closed: 0 }} />
  }

  // Fetch all IPOs for admin with all necessary fields
  // Order by open_date descending to show newest IPOs first
  // Select fields that match the 000_fresh_start.sql schema
  const { data: rawIpos, error } = await supabase
    .from('ipos')
    .select(`
      id,
      company_name,
      slug,
      status,
      exchange,
      sector,
      price_min,
      price_max,
      lot_size,
      open_date,
      close_date,
      allotment_date,
      listing_date,
      created_at,
      logo_url,
      bg_color,
      fg_color,
      gmp,
      subscription_total,
      ai_prediction
    `)
    .order('open_date', { ascending: false })
  
  // Map company_name to name and create abbr for dashboard compatibility
  const ipos = rawIpos?.map(ipo => ({
    ...ipo,
    name: ipo.company_name,
    abbr: ipo.company_name?.split(' ').map((w: string) => w[0]).join('').slice(0, 3).toUpperCase() || 'IPO'
  })) || []

  if (error) {
    console.error('Error fetching IPOs:', error)
  }

  // Calculate stats for dashboard overview
  const allIpos = ipos
  const stats = {
    total: allIpos.length,
    // Open includes both 'open' and 'lastday' statuses
    open: allIpos.filter(i => i.status === 'open' || i.status === 'lastday').length,
    upcoming: allIpos.filter(i => i.status === 'upcoming').length,
    // Closed includes 'closed', 'allot', 'listing', and 'listed'
    closed: allIpos.filter(i => ['closed', 'allot', 'listing', 'listed'].includes(i.status)).length,
  }

  return <AdminDashboardClient ipos={allIpos} stats={stats} />
}
