import { createClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  
  if (!supabase) {
    return <AdminDashboardClient ipos={[]} stats={{ total: 0, open: 0, upcoming: 0, closed: 0 }} />
  }

  // Fetch all IPOs for admin
  const { data: ipos, error } = await supabase
    .from('ipos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching IPOs:', error)
  }

  // Get stats
  const allIpos = ipos || []
  const stats = {
    total: allIpos.length,
    open: allIpos.filter(i => i.status === 'open' || i.status === 'lastday').length,
    upcoming: allIpos.filter(i => i.status === 'upcoming').length,
    closed: allIpos.filter(i => i.status === 'closed' || i.status === 'listing' || i.status === 'allot').length,
  }

  return <AdminDashboardClient ipos={allIpos} stats={stats} />
}
