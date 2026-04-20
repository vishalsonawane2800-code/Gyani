// Simple Supabase queries for IPOGyani
import { createClient } from './server'
import type {
  IPO,
  ListedIPO,
  NewsArticle,
  YouTubeSummary,
  IPOPrediction,
  AnchorInvestor,
} from '@/lib/data'

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
  allotment_url: string | null
  list_day_close: number | null
  list_day_change_pct: number | null
  // Document URLs (migration 020)
  drhp_url?: string | null
  rhp_url?: string | null
  anchor_investors_url?: string | null
  created_at: string
  updated_at: string
  last_gmp_update: string | null
  last_subscription_update: string | null

  // Automation columns (migration 004_automation_extensions)
  gmp_sources_used?: string[] | null
  subscription_last_scraped?: string | null
  news_last_fetched?: string | null
  youtube_last_fetched?: string | null
  prediction_last_generated?: string | null
  anchor_investors?: AnchorInvestor[] | null
  promoter_holding_pre?: number | null
  promoter_holding_post?: number | null
  sector_pe?: number | null
  fresh_issue_cr?: number | null
  ofs_cr?: number | null
  listing_price_v2?: number | null // alias guard; real column is listing_price
}

// Rows from the ipo_news table (migration 004)
export interface IPONewsRow {
  id: string
  ipo_id: number
  title: string
  url: string
  source: string | null
  image_url: string | null
  published_at: string | null
  summary: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  created_at: string
}

// Rows from ipo_youtube_summaries table (migration 004)
export interface IPOYouTubeRow {
  id: string
  ipo_id: number
  video_id: string
  video_url: string | null
  channel_name: string | null
  thumbnail_url: string | null
  view_count: number | null
  published_at: string | null
  ai_summary: string | null
  key_points: string[] | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  created_at: string
}

// Rows from ipo_predictions table (migration 004)
export interface IPOPredictionRow {
  id: string
  ipo_id: number
  model_version: string
  predicted_listing_price: number | null
  predicted_gain_percent: number | null
  confidence_lower: number | null
  confidence_upper: number | null
  confidence_label: 'low' | 'medium' | 'high' | null
  reasoning: string | null
  features_used: Record<string, unknown> | null
  generated_at: string
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

    // Automation fields (migration 004_automation_extensions). All optional.
    gmpSourcesUsed: ipo.gmp_sources_used ?? undefined,
    subscriptionLastScraped: ipo.subscription_last_scraped ?? undefined,
    newsLastFetched: ipo.news_last_fetched ?? undefined,
    youtubeLastFetched: ipo.youtube_last_fetched ?? undefined,
    predictionLastGenerated: ipo.prediction_last_generated ?? undefined,
    anchorInvestors: ipo.anchor_investors ?? undefined,
    promoterHoldingPre: ipo.promoter_holding_pre ?? undefined,
    promoterHoldingPost: ipo.promoter_holding_post ?? undefined,
    sectorPe: ipo.sector_pe ?? undefined,
    freshIssueCr: ipo.fresh_issue_cr ?? undefined,
    ofsCr: ipo.ofs_cr ?? undefined,
    listingPrice: ipo.listing_price ?? undefined,
    listingGainPercent: ipo.listing_gain_percent ?? undefined,
    allotmentUrl: ipo.allotment_url ?? undefined,
    listDayClose: ipo.list_day_close ?? undefined,
    listDayChangePct: ipo.list_day_change_pct ?? undefined,

    // Document URLs (migration 020)
    drhpUrl: ipo.drhp_url ?? undefined,
    rhpUrl: ipo.rhp_url ?? undefined,
    anchorInvestorsUrl: ipo.anchor_investors_url ?? undefined,
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
  const [gmpHistoryResult, financialsResult, reviewsResult, peersResult, kpiResult, issueDetailsResult, subscriptionLiveResult, subscriptionHistoryResult] = await Promise.all([
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
    
    // Get expert reviews - table is named 'expert_reviews'
    supabase
      .from('expert_reviews')
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
      .order('date_label', { ascending: true }),
    
    // Get Issue Details
    supabase
      .from('ipo_issue_details')
      .select('*')
      .eq('ipo_id', ipo.id)
      .maybeSingle(),

    // Get subscription live data (category-wise breakdown)
    supabase
      .from('subscription_live')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('display_order', { ascending: true }),

    // Get subscription history (day-wise)
    supabase
      .from('subscription_history')
      .select('*')
      .eq('ipo_id', ipo.id)
      .order('date', { ascending: true })
      .order('day_number', { ascending: true })
  ])

  const gmpHistory = gmpHistoryResult.data ?? []
  const financialsData = financialsResult.data ?? []
  const reviewsData = reviewsResult.data ?? []
  const peersData = peersResult.data ?? []
  const kpiData = kpiResult.data ?? []
  const issueDetailsData = issueDetailsResult.data
  const subscriptionLiveData = subscriptionLiveResult.data ?? []
  const subscriptionHistoryData = subscriptionHistoryResult.data ?? []

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
  
  // Parse expert reviews - map database columns to ExpertReview interface
  const expertReviews = reviewsData.map(r => ({
    id: r.id || '',
    source: r.source || 'Unknown',
    sourceType: r.source_type || 'analyst',  // Database column is source_type
    author: r.author || '',
    summary: r.summary || '',
    sentiment: r.sentiment || 'neutral',
    url: r.url || undefined,
    logoUrl: r.logo_url || undefined,
    createdAt: r.review_date || r.created_at || new Date().toISOString(),
  }))
  
  // Parse peer companies - map database columns to frontend interface
  const peerCompanies = peersData.map(p => ({
    name: p.company_name || '',  // Database column is company_name
    marketCap: p.market_cap || 0,
    revenue: p.revenue || 0,
    pat: p.pat || 0,
    peRatio: p.pe_ratio || 0,
    pbRatio: p.pb_ratio || 0,
    roe: p.roe || 0,
  }))

  // Parse KPI data
  const kpi = parseKPIData(kpiData)

  // Parse issue details from database
  const issueDetails = issueDetailsData ? {
    totalIssueSizeCr: issueDetailsData.total_issue_size_cr || 0,
    freshIssueCr: issueDetailsData.fresh_issue_cr || 0,
    freshIssuePercent: issueDetailsData.fresh_issue_percent || 0,
    ofsCr: issueDetailsData.ofs_cr || 0,
    ofsPercent: issueDetailsData.ofs_percent || 0,
    retailQuotaPercent: issueDetailsData.retail_quota_percent || 0,
    niiQuotaPercent: issueDetailsData.nii_quota_percent || 0,
    qibQuotaPercent: issueDetailsData.qib_quota_percent || 0,
    employeeQuotaPercent: issueDetailsData.employee_quota_percent || 0,
    shareholderQuotaPercent: issueDetailsData.shareholder_quota_percent || 0,
    ipoObjectives: issueDetailsData.ipo_objectives || [],
  } : undefined

  // Parse subscription live data (category-wise breakdown)
  const subscriptionLive = subscriptionLiveData.map(s => ({
    category: s.category as 'anchor' | 'qib' | 'nii' | 'bnii' | 'snii' | 'retail' | 'employee' | 'total',
    subscriptionTimes: s.subscription_times || 0,
    sharesOffered: s.shares_offered || 0,
    sharesBidFor: s.shares_bid_for || 0,
    totalAmountCr: s.total_amount_cr || 0,
    displayOrder: s.display_order || 0,
  }))

  // Parse subscription history (day-wise) - includes bNII and sNII
  const subscriptionHistory = subscriptionHistoryData.map(s => ({
    date: s.date,
    time: s.time || '17:00',
    dayNumber: s.day_number || 1,
    retail: s.retail || 0,
    nii: s.nii || 0,
    bnii: s.bnii || 0,
    snii: s.snii || 0,
    qib: s.qib || 0,
    anchor: s.anchor || 0,
    employee: s.employee || 0,
    total: s.total || 0,
  }))

  // Get last updated time from subscription live data
  const subscriptionLastUpdated = subscriptionLiveData.length > 0 
    ? subscriptionLiveData[0].updated_at 
    : undefined

  // Extract P/E ratio and market cap from KPI data for IPO header/overview
  const peRatioFromKPI = kpi?.prePost?.pe?.post || kpi?.prePost?.pe?.pre || 0
  const marketCapFromKPI = kpi?.prePost?.marketCap || 0
  const marketCapStr = marketCapFromKPI > 0 
    ? `Rs ${marketCapFromKPI >= 100 ? marketCapFromKPI.toFixed(0) : marketCapFromKPI.toFixed(2)} Cr`
    : transformedIPO.marketCap

  // Add GMP history data for charts - match GMPHistoryEntry interface
  const priceMax = ipo.price_max || 0
  return {
    ...transformedIPO,
    peRatio: peRatioFromKPI || transformedIPO.peRatio,
    marketCap: marketCapStr,
    financials: financials || undefined,
    expertReviews: expertReviews.length > 0 ? expertReviews : undefined,
    peerCompanies: peerCompanies.length > 0 ? peerCompanies : undefined,
    kpi: kpi || undefined,
    issueDetails: issueDetails,
    subscriptionLive: subscriptionLive.length > 0 ? subscriptionLive : undefined,
    subscriptionHistory: subscriptionHistory.length > 0 ? subscriptionHistory : undefined,
    subscriptionLastUpdated: subscriptionLastUpdated,
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

// Subscription Live Data Types
export interface SubscriptionLive {
  id: string
  ipo_id: string
  category: 'anchor' | 'qib' | 'nii' | 'bnii' | 'snii' | 'retail' | 'employee' | 'total'
  subscription_times: number
  shares_offered: number
  shares_bid_for: number
  total_amount_cr: number
  display_order: number
  created_at: string
  updated_at: string
}

export interface SubscriptionHistory {
  id: string
  ipo_id: string
  date: string
  time: string
  day_number: number
  anchor: number
  qib: number
  nii: number
  bnii: number
  snii: number
  retail: number
  employee: number
  total: number
  created_at: string
  updated_at: string
}

// Fetch live subscription data for an IPO
export async function getIPOSubscriptionLive(ipoId: string): Promise<SubscriptionLive[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('subscription_live')
    .select('*')
    .eq('ipo_id', ipoId)
    .order('display_order', { ascending: true })
  
  if (error) {
    console.error('Error fetching subscription live data:', error)
    return []
  }
  
  return data ?? []
}

// Fetch subscription history for an IPO
export async function getIPOSubscriptionHistory(ipoId: string): Promise<SubscriptionHistory[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  const { data, error } = await supabase
    .from('subscription_history')
    .select('*')
    .eq('ipo_id', ipoId)
    .order('date', { ascending: false })
    .order('time', { ascending: false })
  
  if (error) {
    console.error('Error fetching subscription history:', error)
    return []
  }
  
  return data ?? []
}

// Update or insert subscription live data
export async function upsertSubscriptionLive(data: Omit<SubscriptionLive, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionLive | null> {
  const supabase = await createClient()
  
  if (!supabase) return null
  
  const { data: result, error } = await supabase
    .from('subscription_live')
    .upsert(data, { onConflict: 'ipo_id,category' })
    .select()
    .single()
  
  if (error) {
    console.error('Error upserting subscription live data:', error)
    return null
  }
  
  return result ?? null
}

// Batch update subscription live data
export async function batchUpsertSubscriptionLive(items: Omit<SubscriptionLive, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
  const supabase = await createClient()
  
  if (!supabase) return false
  
  const { error } = await supabase
    .from('subscription_live')
    .upsert(items, { onConflict: 'ipo_id,category' })
  
  if (error) {
    console.error('Error batch upserting subscription live data:', error)
    return false
  }
  
  return true
}

// Insert subscription history
export async function insertSubscriptionHistory(data: Omit<SubscriptionHistory, 'id' | 'created_at' | 'updated_at'>): Promise<SubscriptionHistory | null> {
  const supabase = await createClient()
  
  if (!supabase) return null
  
  const { data: result, error } = await supabase
    .from('subscription_history')
    .insert(data)
    .select()
    .single()
  
  if (error) {
    console.error('Error inserting subscription history:', error)
    return null
  }
  
  return result ?? null
}

// Batch insert subscription history
export async function batchInsertSubscriptionHistory(items: Omit<SubscriptionHistory, 'id' | 'created_at' | 'updated_at'>[]): Promise<boolean> {
  const supabase = await createClient()
  
  if (!supabase) return false
  
  const { error } = await supabase
    .from('subscription_history')
    .insert(items)
  
  if (error) {
    console.error('Error batch inserting subscription history:', error)
    return false
  }
  
  return true
}

// =============================================================================
// News, YouTube, and Predictions Query Helpers (migration 004_automation_extensions)
// =============================================================================

// Transform ipo_news row to NewsArticle
function transformNewsRow(row: IPONewsRow): NewsArticle {
  return {
    id: row.id,
    ipoId: row.ipo_id,
    title: row.title,
    url: row.url,
    source: row.source ?? undefined,
    imageUrl: row.image_url ?? undefined,
    publishedAt: row.published_at ?? undefined,
    summary: row.summary ?? undefined,
    sentiment: row.sentiment ?? undefined,
    createdAt: row.created_at,
  }
}

// Transform ipo_youtube_summaries row to YouTubeSummary
function transformYouTubeRow(row: IPOYouTubeRow): YouTubeSummary {
  return {
    id: row.id,
    ipoId: row.ipo_id,
    videoId: row.video_id,
    videoUrl: row.video_url ?? undefined,
    channelName: row.channel_name ?? undefined,
    thumbnailUrl: row.thumbnail_url ?? undefined,
    viewCount: row.view_count ?? undefined,
    publishedAt: row.published_at ?? undefined,
    aiSummary: row.ai_summary ?? undefined,
    keyPoints: row.key_points ?? undefined,
    sentiment: row.sentiment ?? undefined,
    createdAt: row.created_at,
  }
}

// Transform ipo_predictions row to IPOPrediction
function transformPredictionRow(row: IPOPredictionRow): IPOPrediction {
  return {
    id: row.id,
    ipoId: row.ipo_id,
    modelVersion: row.model_version,
    predictedListingPrice: row.predicted_listing_price ?? undefined,
    predictedGainPercent: row.predicted_gain_percent ?? undefined,
    confidenceLower: row.confidence_lower ?? undefined,
    confidenceUpper: row.confidence_upper ?? undefined,
    confidenceLabel: row.confidence_label ?? undefined,
    reasoning: row.reasoning ?? undefined,
    featuresUsed: row.features_used ?? undefined,
    generatedAt: row.generated_at,
  }
}

// Fetch news articles for an IPO
export async function getIPONews(ipoId: number, options?: { limit?: number }): Promise<NewsArticle[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  let query = supabase
    .from('ipo_news')
    .select('*')
    .eq('ipo_id', ipoId)
    .order('published_at', { ascending: false })
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching IPO news:', error)
    return []
  }
  
  return (data ?? []).map(row => transformNewsRow(row as IPONewsRow))
}

// Fetch YouTube summaries for an IPO
export async function getIPOYouTubeSummaries(ipoId: number, options?: { limit?: number }): Promise<YouTubeSummary[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  let query = supabase
    .from('ipo_youtube_summaries')
    .select('*')
    .eq('ipo_id', ipoId)
    .order('published_at', { ascending: false })
  
  if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching IPO YouTube summaries:', error)
    return []
  }
  
  return (data ?? []).map(row => transformYouTubeRow(row as IPOYouTubeRow))
}

// Fetch predictions for an IPO
export async function getIPOPredictions(ipoId: number, options?: { limit?: number; latestOnly?: boolean }): Promise<IPOPrediction[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  let query = supabase
    .from('ipo_predictions')
    .select('*')
    .eq('ipo_id', ipoId)
    .order('generated_at', { ascending: false })
  
  if (options?.latestOnly) {
    query = query.limit(1)
  } else if (options?.limit) {
    query = query.limit(options.limit)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching IPO predictions:', error)
    return []
  }
  
  return (data ?? []).map(row => transformPredictionRow(row as IPOPredictionRow))
}

// Insert a news article (with dedup via unique url constraint)
export async function insertIPONews(news: Omit<IPONewsRow, 'id' | 'created_at'>): Promise<NewsArticle | null> {
  const supabase = await createClient()
  
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('ipo_news')
    .upsert({
      ipo_id: news.ipo_id,
      title: news.title,
      url: news.url,
      source: news.source,
      image_url: news.image_url,
      published_at: news.published_at,
      summary: news.summary,
      sentiment: news.sentiment,
    }, { onConflict: 'url' })
    .select()
    .single()
  
  if (error) {
    console.error('Error inserting IPO news:', error)
    return null
  }
  
  return data ? transformNewsRow(data as IPONewsRow) : null
}

// Insert a YouTube summary (with dedup via unique video_id constraint)
export async function insertIPOYouTubeSummary(summary: Omit<IPOYouTubeRow, 'id' | 'created_at'>): Promise<YouTubeSummary | null> {
  const supabase = await createClient()
  
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('ipo_youtube_summaries')
    .upsert({
      ipo_id: summary.ipo_id,
      video_id: summary.video_id,
      video_url: summary.video_url,
      channel_name: summary.channel_name,
      thumbnail_url: summary.thumbnail_url,
      view_count: summary.view_count,
      published_at: summary.published_at,
      ai_summary: summary.ai_summary,
      key_points: summary.key_points,
      sentiment: summary.sentiment,
    }, { onConflict: 'video_id' })
    .select()
    .single()
  
  if (error) {
    console.error('Error inserting IPO YouTube summary:', error)
    return null
  }
  
  return data ? transformYouTubeRow(data as IPOYouTubeRow) : null
}

// Insert a prediction
export async function insertIPOPrediction(prediction: Omit<IPOPredictionRow, 'id' | 'generated_at'>): Promise<IPOPrediction | null> {
  const supabase = await createClient()
  
  if (!supabase) return null
  
  const { data, error } = await supabase
    .from('ipo_predictions')
    .insert({
      ipo_id: prediction.ipo_id,
      model_version: prediction.model_version,
      predicted_listing_price: prediction.predicted_listing_price,
      predicted_gain_percent: prediction.predicted_gain_percent,
      confidence_lower: prediction.confidence_lower,
      confidence_upper: prediction.confidence_upper,
      confidence_label: prediction.confidence_label,
      reasoning: prediction.reasoning,
      features_used: prediction.features_used,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error inserting IPO prediction:', error)
    return null
  }
  
  return data ? transformPredictionRow(data as IPOPredictionRow) : null
}

// =============================================================================
// Scraper Health Query Helpers (admin-only, service_role bypasses RLS)
// =============================================================================

export interface ScraperHealthRow {
  id: number
  scraper_name: string
  status: 'success' | 'failed' | 'skipped'
  items_processed: number
  error_message: string | null
  duration_ms: number | null
  ran_at: string
}

// Log a scraper run
export async function logScraperRun(entry: Omit<ScraperHealthRow, 'id' | 'ran_at'>): Promise<boolean> {
  const supabase = await createClient()
  
  if (!supabase) return false
  
  const { error } = await supabase
    .from('scraper_health')
    .insert({
      scraper_name: entry.scraper_name,
      status: entry.status,
      items_processed: entry.items_processed,
      error_message: entry.error_message,
      duration_ms: entry.duration_ms,
    })
  
  if (error) {
    console.error('Error logging scraper run:', error)
    return false
  }
  
  return true
}

// Get recent scraper runs (admin dashboard)
export async function getRecentScraperRuns(options?: { scraperName?: string; limit?: number }): Promise<ScraperHealthRow[]> {
  const supabase = await createClient()
  
  if (!supabase) return []
  
  let query = supabase
    .from('scraper_health')
    .select('*')
    .order('ran_at', { ascending: false })
  
  if (options?.scraperName) {
    query = query.eq('scraper_name', options.scraperName)
  }
  
  if (options?.limit) {
    query = query.limit(options.limit)
  } else {
    query = query.limit(50)
  }
  
  const { data, error } = await query
  
  if (error) {
    console.error('Error fetching scraper runs:', error)
    return []
  }
  
  return (data ?? []) as ScraperHealthRow[]
}

// =============================================================================
// Market News (migration 016_create_market_news.sql)
// -----------------------------------------------------------------------------
// Curated "IPO Market News" items shown on the public homepage. Each row
// links to an external article (`url`). Distinct from `ipo_news`, which is
// scraped per-IPO.
// =============================================================================

export interface MarketNewsRow {
  id: string
  title: string
  url: string
  source: string | null
  tag: string
  impact: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  image_url: string | null
  summary: string | null
  published_at: string | null
  is_published: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface MarketNewsItem {
  id: string
  title: string
  url: string
  source: string | null
  tag: string
  impact: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  imageUrl: string | null
  summary: string | null
  publishedAt: string | null
  isPublished: boolean
  displayOrder: number
  createdAt: string
  updatedAt: string
}

function transformMarketNewsRow(row: MarketNewsRow): MarketNewsItem {
  return {
    id: row.id,
    title: row.title,
    url: row.url,
    source: row.source,
    tag: row.tag,
    impact: row.impact,
    sentiment: row.sentiment,
    imageUrl: row.image_url,
    summary: row.summary,
    publishedAt: row.published_at,
    isPublished: row.is_published,
    displayOrder: row.display_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// Fetch published market news for the public homepage, newest/pinned first.
export async function getMarketNews(options?: { limit?: number }): Promise<MarketNewsItem[]> {
  const supabase = await createClient()
  if (!supabase) return []

  const limit = options?.limit ?? 5

  const { data, error } = await supabase
    .from('market_news')
    .select('*')
    .eq('is_published', true)
    .order('display_order', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    // Table may not exist yet (before migration 016 is run). Fail soft.
    console.error('Error fetching market news:', error)
    return []
  }

  return (data ?? []).map(row => transformMarketNewsRow(row as MarketNewsRow))
}
