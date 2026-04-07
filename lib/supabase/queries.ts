// Simple Supabase queries for IPOGyani
import { createClient } from './server'

// Types matching your simple schema
export interface IPOSimple {
  id: string
  name: string
  slug: string
  status: string
  price_band: string
  lot_size: number
  issue_size: string
  exchange: string
  open_date: string
  close_date: string
  created_at: string
  latest_gmp?: number
}

export interface GMPHistory {
  id: string
  ipo_id: string
  gmp: number
  recorded_at: string
}

// Fetch all current IPOs with latest GMP
export async function getCurrentIPOs(): Promise<IPOSimple[]> {
  const supabase = await createClient()
  
  // Get IPOs
  const { data: ipos, error } = await supabase
    .from('ipos')
    .select('*')
    .in('status', ['open', 'upcoming', 'closed'])
    .order('open_date', { ascending: true })

  if (error || !ipos) {
    console.error('Error fetching IPOs:', error)
    return []
  }

  // Get latest GMP for each IPO
  const ipoIds = ipos.map((ipo) => ipo.id)
  
  if (ipoIds.length === 0) return ipos

  const { data: gmpData } = await supabase
    .from('gmp_history')
    .select('ipo_id, gmp')
    .in('ipo_id', ipoIds)
    .order('recorded_at', { ascending: false })

  // Map latest GMP to each IPO
  const latestGmpMap = new Map<string, number>()
  gmpData?.forEach((g) => {
    if (!latestGmpMap.has(g.ipo_id)) {
      latestGmpMap.set(g.ipo_id, g.gmp)
    }
  })

  return ipos.map((ipo) => ({
    ...ipo,
    latest_gmp: latestGmpMap.get(ipo.id) ?? 0,
  }))
}

// Fetch single IPO by slug with GMP history
export async function getIPOBySlug(slug: string): Promise<(IPOSimple & { gmp_history: GMPHistory[] }) | null> {
  const supabase = await createClient()
  
  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !ipo) {
    console.error('Error fetching IPO:', error)
    return null
  }

  // Get GMP history
  const { data: gmpHistory } = await supabase
    .from('gmp_history')
    .select('*')
    .eq('ipo_id', ipo.id)
    .order('recorded_at', { ascending: false })

  return {
    ...ipo,
    latest_gmp: gmpHistory?.[0]?.gmp ?? 0,
    gmp_history: gmpHistory ?? [],
  }
}

// Fetch all listed IPOs (for backward compatibility)
export async function getListedIPOs(options?: { limit?: number }): Promise<IPOSimple[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('ipos')
    .select('*')
    .eq('status', 'listed')
    .order('close_date', { ascending: false })

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching listed IPOs:', error)
    return []
  }

  return data ?? []
}
