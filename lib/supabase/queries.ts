// Simple Supabase queries for IPOGyani
import { createClient } from './server'
import type { IPO, ListedIPO } from '@/lib/data'

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

// Fetch single IPO by slug with GMP history, financials, and reviews - returns transformed IPO object
export async function getIPOBySlug(slug: string): Promise<IPO | null> {
  const supabase = await createClient()
  
  // Return null if Supabase is not configured
  if (!supabase) return null
  
  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    console.error('Error fetching IPO:', error)
    return null
  }
  
  if (!ipo) {
    return null
  }

  // Fetch related data in parallel
  const [gmpHistoryResult, financialsResult, reviewsResult, peersResult, kpiResult] = await Promise.all([
    // Get GMP history
    supabase
      .from('gmp_history')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('recorded_at', { ascending: false }),
    
    // Get financials
    supabase
      .from('ipo_financials')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('fiscal_year', { ascending: true }),
    
    // Get expert reviews
    supabase
      .from('reviews')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('created_at', { ascending: false }),
    
    // Get peer companies
    supabase
      .from('peer_companies')
      .select('*')
      .eq('ipo_id', ipo.id),
    
    // Get KPI data
    supabase
      .from('ipo_kpi')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('date_label', { ascending: true })
  ])

  const gmpHistory = gmpHistoryResult.data ?? []
  const financialsData = financialsResult.data ?? []
  const reviewsData = reviewsResult.data ?? []
  const peersData = peersResult.data ?? []
  const kpiData = kpiResult.data ?? []

  // Get latest GMP from history if available
  const latestGmp = gmpHistory.length > 0 ? gmpHistory[0] : null
  
  // Transform to IPO interface expected by components
  const transformedIPO = transformIPO(
    ipo as IPOSimple, 
    latestGmp?.gmp, 
    latestGmp?.recorded_at
  )
  
  // Parse financials from database rows into the expected format
  const financials = parseFinancials(financialsData)
  
  // Parse expert reviews
  const expertReviews = reviewsData.map(r => ({
    source: r.source || 'Unknown',
    rating: r.rating || 'Neutral',
    summary: r.summary || '',
    url: r.url || undefined,
  }))
  
  // Parse peer companies
  const peerCompanies = peersData.map(p => ({
    name: p.name,
    marketCap: p.market_cap || 0,
    revenue: p.revenue || 0,
    pat: p.pat || 0,
    peRatio: p.pe_ratio || 0,
    pbRatio: p.pb_ratio || 0,
    roe: p.roe || 0,
  }))

  // Parse KPI data
  const kpi = parseKPIData(kpiData)

  // Add GMP history data for charts - match GMPHistoryEntry interface
  const priceMax = ipo.price_max || 0
  return {
    ...transformedIPO,
    financials: financials || undefined,
    expertReviews: expertReviews.length > 0 ? expertReviews : undefined,
    peerCompanies: peerCompanies.length > 0 ? peerCompanies : undefined,
    kpi: kpi || undefined,
    gmpHistory: gmpHistory.map(g => ({
      date: g.recorded_at,
      gmp: g.gmp,
      gmpPercent: priceMax > 0 ? Math.round((g.gmp / priceMax) * 100 * 10) / 10 : 0,
      source: g.source || 'investorgain',
    })),
  }
}

// Parse KPI data from database rows
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseKPIData(kpiData: any[]): IPO['kpi'] | null {
  if (!kpiData || kpiData.length === 0) {
    return null
  }

  // Group by type (dated vs pre_post)
  const datedKPIs = kpiData.filter(k => k.kpi_type === 'dated')
  const prePostKPIs = kpiData.filter(k => k.kpi_type === 'pre_post')

  // Get unique date labels for dated KPIs
  const dateLabels = [...new Set(datedKPIs.map(k => k.date_label))].slice(0, 2)

  return {
    dated: {
      dateLabels,
      roe: datedKPIs.filter(k => k.metric === 'roe').map(k => k.value),
      roce: datedKPIs.filter(k => k.metric === 'roce').map(k => k.value),
      debtEquity: datedKPIs.filter(k => k.metric === 'debt_equity').map(k => k.value),
      ronw: datedKPIs.filter(k => k.metric === 'ronw').map(k => k.value),
      patMargin: datedKPIs.filter(k => k.metric === 'pat_margin').map(k => k.value),
      ebitdaMargin: datedKPIs.filter(k => k.metric === 'ebitda_margin').map(k => k.value),
      priceToBook: datedKPIs.find(k => k.metric === 'price_to_book')?.value,
    },
    prePost: {
      eps: {
        pre: prePostKPIs.find(k => k.metric === 'eps' && k.date_label === 'pre')?.value,
        post: prePostKPIs.find(k => k.metric === 'eps' && k.date_label === 'post')?.value,
      },
      pe: {
        pre: prePostKPIs.find(k => k.metric === 'pe' && k.date_label === 'pre')?.value,
        post: prePostKPIs.find(k => k.metric === 'pe' && k.date_label === 'post')?.value,
      },
      promoterHolding: {
        pre: prePostKPIs.find(k => k.metric === 'promoter_holding' && k.date_label === 'pre')?.value,
        post: prePostKPIs.find(k => k.metric === 'promoter_holding' && k.date_label === 'post')?.value,
      },
      marketCap: prePostKPIs.find(k => k.metric === 'market_cap')?.value,
    },
    promoters: kpiData.find(k => k.metric === 'promoters')?.text_value || '',
    disclaimer: kpiData.find(k => k.metric === 'disclaimer')?.text_value || '',
  }
}

// Parse financials from database rows into the expected structure
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseFinancials(financialsData: any[]): IPO['financials'] | null {
  if (!financialsData || financialsData.length === 0) {
    return null
  }
  
  // Extract data by fiscal year
  const fy23 = financialsData.find(f => f.fiscal_year === 'FY23' || f.fiscal_year === '2023')
  const fy24 = financialsData.find(f => f.fiscal_year === 'FY24' || f.fiscal_year === '2024')
  const fy25 = financialsData.find(f => f.fiscal_year === 'FY25' || f.fiscal_year === '2025')
  
  // Get the latest entry for ratios
  const latest = financialsData[financialsData.length - 1]
  
  // Helper to get PAT (profit after tax) - database may have 'pat' or 'profit' column
  const getPat = (row: { pat?: number; profit?: number } | undefined) => row?.pat || row?.profit || 0
  
  return {
    revenue: {
      fy23: fy23?.revenue || 0,
      fy24: fy24?.revenue || 0,
      fy25: fy25?.revenue || latest?.revenue || 0,
    },
    pat: {
      fy23: getPat(fy23),
      fy24: getPat(fy24),
      fy25: getPat(fy25) || getPat(latest),
    },
    ebitda: {
      fy23: fy23?.ebitda || 0,
      fy24: fy24?.ebitda || 0,
      fy25: fy25?.ebitda || latest?.ebitda || 0,
    },
    roe: latest?.roe || 0,
    roce: latest?.roce || 0,
    debtEquity: latest?.debt_equity || 0,
  }
}

// Transform Supabase IPO to ListedIPO interface expected by components
function transformToListedIPO(ipo: IPOSimple): ListedIPO {
  const priceMax = ipo.price_max || 0
  const listingPrice = ipo.listing_price || priceMax
  const issuePrice = priceMax
  const listingGainPercent = ipo.listing_gain_percent ?? (issuePrice > 0 ? ((listingPrice - issuePrice) / issuePrice) * 100 : 0)
  
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
    exchange: (ipo.exchange as ListedIPO['exchange']) || 'BSE SME',
    sector: ipo.sector || 'General',
    listDate: ipo.listing_date || ipo.close_date || '',
    issuePrice: issuePrice,
    listPrice: listingPrice,
    gainPct: Math.round(listingGainPercent * 10) / 10,
    subTimes: ipo.subscription_total || 0,
    gmpPeak: `${ipo.gmp >= 0 ? '+' : ''}${ipo.gmp}`,
    aiPred: `${ipo.ai_prediction >= 0 ? '+' : ''}${ipo.ai_prediction}%`,
    aiErr: Math.abs((ipo.ai_prediction || 0) - listingGainPercent),
    year: ipo.listing_date ? new Date(ipo.listing_date).getFullYear().toString() : new Date().getFullYear().toString(),
  }
}

// Fetch all listed IPOs (for backward compatibility)
export async function getListedIPOs(options?: { limit?: number }): Promise<ListedIPO[]> {
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

  return (data ?? []).map(ipo => transformToListedIPO(ipo as IPOSimple))
}

// Stats for Mainboard and SME IPO summary (used in MarketSentiment)
export interface IPOCategoryStats {
  total: number
  upcoming: number
  inGainOnListing: number
  inLossOnListing: number
  currentlyInGain: number
  currentlyInLoss: number
  totalRaisedCr: number
  avgListingGain: number
  avgSubscription: number
}

export async function getIPOStats(): Promise<{ mainboard: IPOCategoryStats; sme: IPOCategoryStats }> {
  const supabase = await createClient()

  const empty: IPOCategoryStats = {
    total: 0, upcoming: 0, inGainOnListing: 0, inLossOnListing: 0,
    currentlyInGain: 0, currentlyInLoss: 0, totalRaisedCr: 0, avgListingGain: 0, avgSubscription: 0
  }

  if (!supabase) return { mainboard: empty, sme: empty }

  const { data, error } = await supabase
    .from('ipos')
    .select('exchange, status, listing_gain_percent, current_price, price_max, issue_size, subscription_total')
    .not('exchange', 'is', null)

  if (error || !data) return { mainboard: empty, sme: empty }

  function calcStats(ipos: typeof data): IPOCategoryStats {
    const listed = ipos.filter(i => ['listed', 'allot', 'listing'].includes(i.status))
    const upcoming = ipos.filter(i => ['upcoming', 'open', 'lastday'].includes(i.status))

    const inGainOnListing = listed.filter(i => (i.listing_gain_percent ?? 0) > 0).length
    const inLossOnListing = listed.filter(i => (i.listing_gain_percent ?? 0) < 0).length

    // Currently in gain = current price > issue price
    const currentlyInGain = listed.filter(i => i.current_price && i.price_max && i.current_price > i.price_max).length
    const currentlyInLoss = listed.filter(i => i.current_price && i.price_max && i.current_price < i.price_max).length

    // Total raised
    const totalRaisedCr = ipos.reduce((sum, i) => {
      const val = parseFloat(String(i.issue_size ?? '').replace(/[^\d.]/g, '') || '0')
      return sum + (isNaN(val) ? 0 : val)
    }, 0)

    // Avg listing gain across listed IPOs
    const validGains = listed.filter(i => i.listing_gain_percent !== null)
    const avgListingGain = validGains.length > 0
      ? validGains.reduce((s, i) => s + (i.listing_gain_percent ?? 0), 0) / validGains.length
      : 0

    // Avg subscription
    const validSubs = ipos.filter(i => (i.subscription_total ?? 0) > 0)
    const avgSubscription = validSubs.length > 0
      ? validSubs.reduce((s, i) => s + (i.subscription_total ?? 0), 0) / validSubs.length
      : 0

    return {
      total: listed.length,
      upcoming: upcoming.length,
      inGainOnListing,
      inLossOnListing,
      currentlyInGain,
      currentlyInLoss,
      totalRaisedCr: Math.round(totalRaisedCr),
      avgListingGain: Math.round(avgListingGain * 10) / 10,
      avgSubscription: Math.round(avgSubscription * 10) / 10,
    }
  }

  const mainboardIpos = data.filter(i => i.exchange === 'Mainboard' || i.exchange === 'NSE' || i.exchange === 'BSE')
  const smeIpos = data.filter(i => i.exchange === 'BSE SME' || i.exchange === 'NSE SME')

  return {
    mainboard: calcStats(mainboardIpos),
    sme: calcStats(smeIpos),
  }
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
