// Simple Supabase queries for IPOGyani
import { createClient } from './server'
import type { IPO } from '@/lib/data'

// Types matching the database schema
export interface IPOSimple {
  id: string
  company_name: string
  slug: string
  status: string
  exchange: string
  sector: string | null
  price_min: number
  price_max: number
  lot_size: number
  issue_size: string | null
  open_date: string
  close_date: string
  allotment_date: string | null
  listing_date: string | null
  gmp: number
  subscription_retail: number
  subscription_shni: number
  subscription_bhni: number
  subscription_qib: number
  subscription_total: number
  subscription_nii: number
  subscription_employee: number
  ai_prediction: number
  ai_confidence: number
  sentiment_score: number
  sentiment_label: string
  description: string | null
  registrar: string | null
  brlm: string | null
  logo_url: string | null
  bg_color: string
  fg_color: string
  chittorgarh_url: string | null
  investorgain_gmp_url: string | null
  investorgain_sub_url: string | null
  nse_symbol: string | null
  bse_scrip_code: string | null
  listing_price: number | null
  current_price: number | null
  listing_gain_percent: number | null
  created_at: string
  updated_at: string
  last_gmp_update: string | null
  last_subscription_update: string | null
}

export interface GMPHistory {
  id: string
  ipo_id: string
  gmp: number
  recorded_at: string
  source: string
}

// Transform Supabase IPO to match the IPO interface expected by components
function transformIPO(ipo: IPOSimple, latestGmp?: number, gmpLastUpdated?: string): IPO {
  const priceMax = ipo.price_max || 0
  const gmp = latestGmp ?? ipo.gmp ?? 0
  const gmpPercent = priceMax > 0 ? Math.round((gmp / priceMax) * 100 * 10) / 10 : 0
  
  // Generate abbreviation from company name (with null safety)
  const abbr = (ipo.company_name || 'IP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IP'
  
  return {
    id: typeof ipo.id === 'string' ? parseInt(ipo.id) || 0 : ipo.id as unknown as number,
    name: ipo.company_name,
    slug: ipo.slug,
    abbr: abbr,
    bgColor: ipo.bg_color || '#f0f9ff',
    fgColor: ipo.fg_color || '#0369a1',
    logoUrl: ipo.logo_url || undefined,
    exchange: (ipo.exchange as IPO['exchange']) || 'BSE SME',
    sector: ipo.sector || 'General',
    openDate: ipo.open_date,
    closeDate: ipo.close_date,
    allotmentDate: ipo.allotment_date || '',
    listDate: ipo.listing_date || '',
    priceMin: ipo.price_min || 0,
    priceMax: priceMax,
    lotSize: ipo.lot_size || 0,
    issueSize: ipo.issue_size || '0 Cr',
    issueSizeCr: parseFloat(ipo.issue_size?.replace(/[^\d.]/g, '') || '0'),
    freshIssue: ipo.issue_size || '0 Cr',
    ofs: 'Nil',
    gmp: gmp,
    gmpPercent: gmpPercent,
    gmpLastUpdated: gmpLastUpdated || ipo.last_gmp_update || new Date().toISOString(),
    estListPrice: priceMax + gmp,
    subscription: {
      total: ipo.subscription_total || 0,
      retail: `${ipo.subscription_retail || 0}x`,
      nii: `${ipo.subscription_nii || 0}x`,
      qib: `${ipo.subscription_qib || 0}x`,
      day: 0,
      isFinal: false,
    },
    aiPrediction: ipo.ai_prediction || 0,
    aiConfidence: ipo.ai_confidence || 50,
    sentimentScore: ipo.sentiment_score || 50,
    sentimentLabel: (ipo.sentiment_label as IPO['sentimentLabel']) || 'Neutral',
    status: (ipo.status as IPO['status']) || 'upcoming',
    registrar: ipo.registrar || 'Link Intime',
    leadManager: ipo.brlm || 'TBD',
    marketCap: 'TBD',
    peRatio: 0,
    aboutCompany: ipo.description || '',
  }
}

// Fetch all current IPOs with latest GMP
export async function getCurrentIPOs(): Promise<IPO[]> {
  const supabase = await createClient()
  
  // Return empty if Supabase is not configured
  if (!supabase) return []
  
  // Get IPOs
  const { data: ipos, error } = await supabase
    .from('ipos')
    .select('*')
    .in('status', ['open', 'upcoming', 'closed', 'lastday', 'allot', 'listing'])
    .order('open_date', { ascending: true })

  if (error || !ipos) {
    console.error('Error fetching IPOs:', error)
    return []
  }

  // Get latest GMP for each IPO
  const ipoIds = ipos.map((ipo) => ipo.id)
  
  if (ipoIds.length === 0) return []

  const { data: gmpData } = await supabase
    .from('gmp_history')
    .select('ipo_id, gmp, recorded_at')
    .in('ipo_id', ipoIds)
    .order('recorded_at', { ascending: false })

  // Map latest GMP to each IPO
  const latestGmpMap = new Map<string, { gmp: number; recorded_at: string }>()
  gmpData?.forEach((g) => {
    if (!latestGmpMap.has(g.ipo_id)) {
      latestGmpMap.set(g.ipo_id, { gmp: g.gmp, recorded_at: g.recorded_at })
    }
  })

  return ipos.map((ipo) => {
    const gmpInfo = latestGmpMap.get(ipo.id)
    return transformIPO(ipo as IPOSimple, gmpInfo?.gmp, gmpInfo?.recorded_at)
  })
}

// Fetch single IPO by slug with GMP history
export async function getIPOBySlug(slug: string): Promise<(IPOSimple & { gmp_history: GMPHistory[] }) | null> {
  const supabase = await createClient()
  
  // Return null if Supabase is not configured
  if (!supabase) return null
  
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
    gmp_history: gmpHistory ?? [],
  }
}

// Fetch all listed IPOs (for backward compatibility)
export async function getListedIPOs(options?: { limit?: number }): Promise<IPOSimple[]> {
  const supabase = await createClient()
  
  // Return empty if Supabase is not configured
  if (!supabase) return []
  
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

// Get all IPO slugs for static generation
export async function getAllIPOSlugs(): Promise<string[]> {
  const supabase = await createClient()
  
  // Return empty if Supabase is not configured (e.g., during build)
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('ipos')
    .select('slug')
    .not('slug', 'is', null)
  
  if (error) {
    console.error('Error fetching IPO slugs:', error)
    return []
  }
  
  return data?.map(ipo => ipo.slug).filter(Boolean) ?? []
}
