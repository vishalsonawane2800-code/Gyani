import { createClient } from '@/lib/supabase/server'
import { GMPManagementClient } from './gmp-client'

export const dynamic = 'force-dynamic'

export default async function GMPManagementPage() {
  const supabase = await createClient()

  if (!supabase) {
    return <GMPManagementClient ipos={[]} gmpHistory={[]} />
  }

  // Fetch all active IPOs (not closed)
  const { data: ipos, error: iposError } = await supabase
    .from('ipos')
    .select('id, name, slug, status, price_max')
    .in('status', ['open', 'upcoming', 'lastday', 'allot', 'listing'])
    .order('open_date', { ascending: false })

  if (iposError) {
    console.error('Error fetching IPOs:', iposError)
  }

  // Fetch GMP history with IPO names
  const { data: gmpHistory, error: gmpError } = await supabase
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
    .limit(50)

  if (gmpError) {
    console.error('Error fetching GMP history:', gmpError)
  }

  return (
    <GMPManagementClient 
      ipos={ipos || []} 
      gmpHistory={gmpHistory || []} 
    />
  )
}
