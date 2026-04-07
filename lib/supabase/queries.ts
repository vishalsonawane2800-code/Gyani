// Simple Supabase queries for IPOGyani
import { createClient } from './server'
import type { IPO } from '@/lib/data'

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
  // Additional fields from database
  abbr?: string
  bg_color?: string
  fg_color?: string
  sector?: string
  allotment_date?: string
  list_date?: string
  price_min?: number
  price_max?: number
  issue_size_cr?: number
  fresh_issue?: string
  ofs?: string
  gmp_last_updated?: string
  subscription_total?: number
  subscription_retail?: string
  subscription_nii?: string
  subscription_qib?: string
  subscription_day?: number
  subscription_is_final?: boolean
  ai_prediction?: number
  ai_confidence?: number
  sentiment_score?: number
  sentiment_label?: string
  registrar?: string
  lead_manager?: string
  market_cap?: string
  pe_ratio?: number
  about_company?: string
}

export interface GMPHistory {
  id: string
  ipo_id: string
  gmp: number
  recorded_at: string
}

// Helper to parse price band string like "Rs 100-120" into min/max
function parsePriceBand(priceBand: string): { min: number; max: number } {
  const match = priceBand?.match(/(\d+)-(\d+)/) || priceBand?.match(/(\d+)/)
  if (match && match[2]) {
    return { min: parseInt(match[1]), max: parseInt(match[2]) }
  } else if (match && match[1]) {
    const price = parseInt(match[1])
    return { min: price, max: price }
  }
  return { min: 0, max: 0 }
}

// Transform Supabase IPO to match the IPO interface expected by components
function transformIPO(ipo: IPOSimple, gmp: number): IPO {
  const priceBand = parsePriceBand(ipo.price_band)
  const priceMax = ipo.price_max ?? priceBand.max
  const gmpPercent = priceMax > 0 ? Math.round((gmp / priceMax) * 100 * 10) / 10 : 0
  
  return {
    id: typeof ipo.id === 'string' ? parseInt(ipo.id) || 0 : ipo.id as unknown as number,
    name: ipo.name,
    slug: ipo.slug,
    abbr: ipo.abbr || ipo.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    bgColor: ipo.bg_color || '#f0f9ff',
    fgColor: ipo.fg_color || '#0369a1',
    exchange: (ipo.exchange as IPO['exchange']) || 'BSE SME',
    sector: ipo.sector || 'General',
    openDate: ipo.open_date,
    closeDate: ipo.close_date,
    allotmentDate: ipo.allotment_date || '',
    listDate: ipo.list_date || '',
    priceMin: ipo.price_min ?? priceBand.min,
    priceMax: priceMax,
    lotSize: ipo.lot_size || 0,
    issueSize: ipo.issue_size || '0 Cr',
    issueSizeCr: ipo.issue_size_cr || parseFloat(ipo.issue_size?.replace(/[^\d.]/g, '') || '0'),
    freshIssue: ipo.fresh_issue || ipo.issue_size || '0 Cr',
    ofs: ipo.ofs || 'Nil',
    gmp: gmp,
    gmpPercent: gmpPercent,
    gmpLastUpdated: ipo.gmp_last_updated || new Date().toISOString(),
    estListPrice: priceMax + gmp,
    subscription: {
      total: ipo.subscription_total || 0,
      retail: ipo.subscription_retail || '0x',
      nii: ipo.subscription_nii || '0x',
      qib: ipo.subscription_qib || '0x',
      day: ipo.subscription_day || 0,
      isFinal: ipo.subscription_is_final || false,
    },
    aiPrediction: ipo.ai_prediction || 0,
    aiConfidence: ipo.ai_confidence || 50,
    sentimentScore: ipo.sentiment_score || 50,
    sentimentLabel: (ipo.sentiment_label as IPO['sentimentLabel']) || 'Neutral',
    status: (ipo.status as IPO['status']) || 'upcoming',
    registrar: ipo.registrar || 'Link Intime',
    leadManager: ipo.lead_manager || 'TBD',
    marketCap: ipo.market_cap || 'TBD',
    peRatio: ipo.pe_ratio || 0,
    aboutCompany: ipo.about_company || '',
  }
}

// Fetch all current IPOs with latest GMP
export async function getCurrentIPOs(): Promise<IPO[]> {
  const supabase = await createClient()
  
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
    const ipoWithGmpDate = {
      ...ipo,
      gmp_last_updated: gmpInfo?.recorded_at || new Date().toISOString(),
    }
    return transformIPO(ipoWithGmpDate as IPOSimple, gmpInfo?.gmp ?? 0)
  })
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
