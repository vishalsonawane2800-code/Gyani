// Supabase Data Fetching Functions for IPOGyani
import { createClient } from './server'
import type {
  IPO,
  ListedIPO,
  GMPHistoryEntry,
  SubscriptionHistoryEntry,
  ExpertReview,
  PeerCompany,
  IssueDetails,
  IPOStatus,
  ExchangeType,
  SentimentLabel,
} from '../data'

// Database row types (snake_case from Supabase)
interface IPORow {
  id: number
  name: string
  slug: string
  abbr: string
  bg_color: string
  fg_color: string
  exchange: ExchangeType
  sector: string
  open_date: string
  close_date: string
  allotment_date: string
  list_date: string
  price_min: number
  price_max: number
  lot_size: number
  issue_size: string
  issue_size_cr: number
  fresh_issue: string | null
  ofs: string | null
  gmp: number
  gmp_percent: number
  gmp_last_updated: string
  est_list_price: number | null
  subscription_total: number
  subscription_retail: string
  subscription_nii: string
  subscription_qib: string
  subscription_day: number
  subscription_is_final: boolean
  ai_prediction: number
  ai_confidence: number
  sentiment_score: number
  sentiment_label: SentimentLabel
  status: IPOStatus
  registrar: string | null
  lead_manager: string | null
  market_cap: string | null
  pe_ratio: number
  about_company: string | null
  created_at: string
  updated_at: string
}

interface IPOFinancialsRow {
  id: number
  ipo_id: number
  revenue_fy23: number | null
  revenue_fy24: number | null
  revenue_fy25: number | null
  pat_fy23: number | null
  pat_fy24: number | null
  pat_fy25: number | null
  ebitda_fy23: number | null
  ebitda_fy24: number | null
  ebitda_fy25: number | null
  roe: number | null
  roce: number | null
  debt_equity: number | null
}

interface IPOIssueDetailsRow {
  id: number
  ipo_id: number
  total_issue_size_cr: number | null
  fresh_issue_cr: number | null
  fresh_issue_percent: number | null
  ofs_cr: number | null
  ofs_percent: number | null
  retail_quota_percent: number | null
  nii_quota_percent: number | null
  qib_quota_percent: number | null
  employee_quota_percent: number | null
  shareholder_quota_percent: number | null
  ipo_objectives: string[] | null
}

interface ListedIPORow {
  id: number
  name: string
  slug: string
  abbr: string
  bg_color: string
  fg_color: string
  exchange: ExchangeType
  sector: string
  list_date: string
  issue_price: number
  list_price: number
  gain_pct: number
  sub_times: number | null
  gmp_peak: string | null
  ai_pred: string | null
  ai_err: number | null
  year: string
}

// Transform database row to app type
function transformIPORow(row: IPORow): Omit<IPO, 'financials' | 'issueDetails' | 'gmpHistory' | 'subscriptionHistory' | 'expertReviews' | 'peerCompanies'> {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    abbr: row.abbr,
    bgColor: row.bg_color,
    fgColor: row.fg_color,
    exchange: row.exchange,
    sector: row.sector,
    openDate: row.open_date,
    closeDate: row.close_date,
    allotmentDate: row.allotment_date,
    listDate: row.list_date,
    priceMin: row.price_min,
    priceMax: row.price_max,
    lotSize: row.lot_size,
    issueSize: row.issue_size,
    issueSizeCr: row.issue_size_cr,
    freshIssue: row.fresh_issue || '',
    ofs: row.ofs || '',
    gmp: row.gmp,
    gmpPercent: row.gmp_percent,
    gmpLastUpdated: row.gmp_last_updated,
    estListPrice: row.est_list_price || row.price_max,
    subscription: {
      total: row.subscription_total,
      retail: row.subscription_retail,
      nii: row.subscription_nii,
      qib: row.subscription_qib,
      day: row.subscription_day,
      isFinal: row.subscription_is_final,
    },
    aiPrediction: row.ai_prediction,
    aiConfidence: row.ai_confidence,
    sentimentScore: row.sentiment_score,
    sentimentLabel: row.sentiment_label,
    status: row.status,
    registrar: row.registrar || '',
    leadManager: row.lead_manager || '',
    marketCap: row.market_cap || '',
    peRatio: row.pe_ratio,
    aboutCompany: row.about_company || '',
  }
}

function transformListedIPORow(row: ListedIPORow): ListedIPO {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    abbr: row.abbr,
    bgColor: row.bg_color,
    fgColor: row.fg_color,
    exchange: row.exchange,
    sector: row.sector,
    listDate: row.list_date,
    issuePrice: row.issue_price,
    listPrice: row.list_price,
    gainPct: row.gain_pct,
    subTimes: row.sub_times || 0,
    gmpPeak: row.gmp_peak || '-',
    aiPred: row.ai_pred || '-',
    aiErr: row.ai_err || 0,
    year: row.year,
  }
}

// Fetch all current/upcoming IPOs
export async function getCurrentIPOs(): Promise<IPO[]> {
  const supabase = await createClient()
  
  const { data: ipos, error } = await supabase
    .from('ipos')
    .select('*')
    .in('status', ['open', 'lastday', 'allot', 'listing', 'upcoming'])
    .order('open_date', { ascending: true })

  if (error) {
    console.error('Error fetching current IPOs:', error)
    return []
  }

  if (!ipos || ipos.length === 0) {
    return []
  }

  // Fetch related data for all IPOs
  const ipoIds = ipos.map((ipo: IPORow) => ipo.id)
  
  const [financialsResult, issueDetailsResult, gmpHistoryResult, subscriptionHistoryResult, expertReviewsResult, peerCompaniesResult] = await Promise.all([
    supabase.from('ipo_financials').select('*').in('ipo_id', ipoIds),
    supabase.from('ipo_issue_details').select('*').in('ipo_id', ipoIds),
    supabase.from('gmp_history').select('*').in('ipo_id', ipoIds).order('date', { ascending: false }),
    supabase.from('subscription_history').select('*').in('ipo_id', ipoIds).order('date', { ascending: false }),
    supabase.from('expert_reviews').select('*').in('ipo_id', ipoIds),
    supabase.from('peer_companies').select('*').in('ipo_id', ipoIds),
  ])

  // Create lookup maps
  const financialsMap = new Map<number, IPOFinancialsRow>()
  const issueDetailsMap = new Map<number, IPOIssueDetailsRow>()
  const gmpHistoryMap = new Map<number, GMPHistoryEntry[]>()
  const subscriptionHistoryMap = new Map<number, SubscriptionHistoryEntry[]>()
  const expertReviewsMap = new Map<number, ExpertReview[]>()
  const peerCompaniesMap = new Map<number, PeerCompany[]>()

  financialsResult.data?.forEach((f: IPOFinancialsRow) => financialsMap.set(f.ipo_id, f))
  issueDetailsResult.data?.forEach((d: IPOIssueDetailsRow) => issueDetailsMap.set(d.ipo_id, d))

  gmpHistoryResult.data?.forEach((g: { ipo_id: number; date: string; gmp: number; gmp_percent: number; source: string | null }) => {
    const existing = gmpHistoryMap.get(g.ipo_id) || []
    existing.push({
      date: g.date,
      gmp: g.gmp,
      gmpPercent: g.gmp_percent,
      source: g.source || '',
    })
    gmpHistoryMap.set(g.ipo_id, existing)
  })

  subscriptionHistoryResult.data?.forEach((s: { ipo_id: number; date: string; time: string; retail: number; nii: number; qib: number; total: number }) => {
    const existing = subscriptionHistoryMap.get(s.ipo_id) || []
    existing.push({
      date: s.date,
      time: s.time,
      retail: s.retail,
      nii: s.nii,
      qib: s.qib,
      total: s.total,
    })
    subscriptionHistoryMap.set(s.ipo_id, existing)
  })

  expertReviewsResult.data?.forEach((r: { id: string; ipo_id: number; source: string; source_type: ExpertReview['sourceType']; author: string; summary: string; sentiment: ExpertReview['sentiment']; url: string | null; logo_url: string | null; created_at: string }) => {
    const existing = expertReviewsMap.get(r.ipo_id) || []
    existing.push({
      id: r.id,
      source: r.source,
      sourceType: r.source_type,
      author: r.author,
      summary: r.summary,
      sentiment: r.sentiment,
      url: r.url || undefined,
      logoUrl: r.logo_url || undefined,
      createdAt: r.created_at,
    })
    expertReviewsMap.set(r.ipo_id, existing)
  })

  peerCompaniesResult.data?.forEach((p: { ipo_id: number; name: string; market_cap: number | null; revenue: number | null; pat: number | null; pe_ratio: number | null; pb_ratio: number | null; roe: number | null }) => {
    const existing = peerCompaniesMap.get(p.ipo_id) || []
    existing.push({
      name: p.name,
      marketCap: p.market_cap || 0,
      revenue: p.revenue || 0,
      pat: p.pat || 0,
      peRatio: p.pe_ratio || 0,
      pbRatio: p.pb_ratio || 0,
      roe: p.roe || 0,
    })
    peerCompaniesMap.set(p.ipo_id, existing)
  })

  // Transform and combine data
  return ipos.map((row: IPORow) => {
    const base = transformIPORow(row)
    const financials = financialsMap.get(row.id)
    const issueDetails = issueDetailsMap.get(row.id)

    return {
      ...base,
      financials: financials ? {
        revenue: {
          fy23: financials.revenue_fy23 || 0,
          fy24: financials.revenue_fy24 || 0,
          fy25: financials.revenue_fy25 || 0,
        },
        pat: {
          fy23: financials.pat_fy23 || 0,
          fy24: financials.pat_fy24 || 0,
          fy25: financials.pat_fy25 || 0,
        },
        ebitda: {
          fy23: financials.ebitda_fy23 || 0,
          fy24: financials.ebitda_fy24 || 0,
          fy25: financials.ebitda_fy25 || 0,
        },
        roe: financials.roe || 0,
        roce: financials.roce || 0,
        debtEquity: financials.debt_equity || 0,
      } : undefined,
      issueDetails: issueDetails ? {
        totalIssueSizeCr: issueDetails.total_issue_size_cr || 0,
        freshIssueCr: issueDetails.fresh_issue_cr || 0,
        freshIssuePercent: issueDetails.fresh_issue_percent || 0,
        ofsCr: issueDetails.ofs_cr || 0,
        ofsPercent: issueDetails.ofs_percent || 0,
        retailQuotaPercent: issueDetails.retail_quota_percent || 0,
        niiQuotaPercent: issueDetails.nii_quota_percent || 0,
        qibQuotaPercent: issueDetails.qib_quota_percent || 0,
        employeeQuotaPercent: issueDetails.employee_quota_percent || undefined,
        shareholderQuotaPercent: issueDetails.shareholder_quota_percent || undefined,
        ipoObjectives: issueDetails.ipo_objectives || [],
      } : undefined,
      gmpHistory: gmpHistoryMap.get(row.id) || [],
      subscriptionHistory: subscriptionHistoryMap.get(row.id) || [],
      expertReviews: expertReviewsMap.get(row.id) || [],
      peerCompanies: peerCompaniesMap.get(row.id) || [],
    } as IPO
  })
}

// Fetch single IPO by slug
export async function getIPOBySlug(slug: string): Promise<IPO | null> {
  const supabase = await createClient()
  
  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error || !ipo) {
    console.error('Error fetching IPO by slug:', error)
    return null
  }

  // Fetch related data
  const [financialsResult, issueDetailsResult, gmpHistoryResult, subscriptionHistoryResult, expertReviewsResult, peerCompaniesResult] = await Promise.all([
    supabase.from('ipo_financials').select('*').eq('ipo_id', ipo.id).single(),
    supabase.from('ipo_issue_details').select('*').eq('ipo_id', ipo.id).single(),
    supabase.from('gmp_history').select('*').eq('ipo_id', ipo.id).order('date', { ascending: false }),
    supabase.from('subscription_history').select('*').eq('ipo_id', ipo.id).order('date', { ascending: false }),
    supabase.from('expert_reviews').select('*').eq('ipo_id', ipo.id),
    supabase.from('peer_companies').select('*').eq('ipo_id', ipo.id),
  ])

  const base = transformIPORow(ipo)
  const financials = financialsResult.data
  const issueDetails = issueDetailsResult.data

  return {
    ...base,
    financials: financials ? {
      revenue: {
        fy23: financials.revenue_fy23 || 0,
        fy24: financials.revenue_fy24 || 0,
        fy25: financials.revenue_fy25 || 0,
      },
      pat: {
        fy23: financials.pat_fy23 || 0,
        fy24: financials.pat_fy24 || 0,
        fy25: financials.pat_fy25 || 0,
      },
      ebitda: {
        fy23: financials.ebitda_fy23 || 0,
        fy24: financials.ebitda_fy24 || 0,
        fy25: financials.ebitda_fy25 || 0,
      },
      roe: financials.roe || 0,
      roce: financials.roce || 0,
      debtEquity: financials.debt_equity || 0,
    } : undefined,
    issueDetails: issueDetails ? {
      totalIssueSizeCr: issueDetails.total_issue_size_cr || 0,
      freshIssueCr: issueDetails.fresh_issue_cr || 0,
      freshIssuePercent: issueDetails.fresh_issue_percent || 0,
      ofsCr: issueDetails.ofs_cr || 0,
      ofsPercent: issueDetails.ofs_percent || 0,
      retailQuotaPercent: issueDetails.retail_quota_percent || 0,
      niiQuotaPercent: issueDetails.nii_quota_percent || 0,
      qibQuotaPercent: issueDetails.qib_quota_percent || 0,
      employeeQuotaPercent: issueDetails.employee_quota_percent || undefined,
      shareholderQuotaPercent: issueDetails.shareholder_quota_percent || undefined,
      ipoObjectives: issueDetails.ipo_objectives || [],
    } : undefined,
    gmpHistory: (gmpHistoryResult.data || []).map((g: { date: string; gmp: number; gmp_percent: number; source: string | null }) => ({
      date: g.date,
      gmp: g.gmp,
      gmpPercent: g.gmp_percent,
      source: g.source || '',
    })),
    subscriptionHistory: (subscriptionHistoryResult.data || []).map((s: { date: string; time: string; retail: number; nii: number; qib: number; total: number }) => ({
      date: s.date,
      time: s.time,
      retail: s.retail,
      nii: s.nii,
      qib: s.qib,
      total: s.total,
    })),
    expertReviews: (expertReviewsResult.data || []).map((r: { id: string; source: string; source_type: ExpertReview['sourceType']; author: string; summary: string; sentiment: ExpertReview['sentiment']; url: string | null; logo_url: string | null; created_at: string }) => ({
      id: r.id,
      source: r.source,
      sourceType: r.source_type,
      author: r.author,
      summary: r.summary,
      sentiment: r.sentiment,
      url: r.url || undefined,
      logoUrl: r.logo_url || undefined,
      createdAt: r.created_at,
    })),
    peerCompanies: (peerCompaniesResult.data || []).map((p: { name: string; market_cap: number | null; revenue: number | null; pat: number | null; pe_ratio: number | null; pb_ratio: number | null; roe: number | null }) => ({
      name: p.name,
      marketCap: p.market_cap || 0,
      revenue: p.revenue || 0,
      pat: p.pat || 0,
      peRatio: p.pe_ratio || 0,
      pbRatio: p.pb_ratio || 0,
      roe: p.roe || 0,
    })),
  } as IPO
}

// Fetch all listed IPOs with optional filters
export async function getListedIPOs(options?: {
  year?: string
  exchange?: ExchangeType
  limit?: number
}): Promise<ListedIPO[]> {
  const supabase = await createClient()
  
  let query = supabase
    .from('listed_ipos')
    .select('*')
    .order('list_date', { ascending: false })

  if (options?.year) {
    query = query.eq('year', options.year)
  }
  if (options?.exchange) {
    query = query.eq('exchange', options.exchange)
  }
  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching listed IPOs:', error)
    return []
  }

  return (data || []).map((row: ListedIPORow) => transformListedIPORow(row))
}

// Fetch GMP data for all active IPOs (for GMP tracker)
export async function getGMPData(): Promise<Array<{
  id: number
  name: string
  slug: string
  abbr: string
  bgColor: string
  fgColor: string
  exchange: ExchangeType
  priceMax: number
  gmp: number
  gmpPercent: number
  gmpLastUpdated: string
  estListPrice: number
  status: IPOStatus
  listDate: string
}>> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ipos')
    .select('id, name, slug, abbr, bg_color, fg_color, exchange, price_max, gmp, gmp_percent, gmp_last_updated, est_list_price, status, list_date')
    .in('status', ['open', 'lastday', 'allot', 'listing', 'upcoming'])
    .order('list_date', { ascending: true })

  if (error) {
    console.error('Error fetching GMP data:', error)
    return []
  }

  return (data || []).map((row: {
    id: number
    name: string
    slug: string
    abbr: string
    bg_color: string
    fg_color: string
    exchange: ExchangeType
    price_max: number
    gmp: number
    gmp_percent: number
    gmp_last_updated: string
    est_list_price: number | null
    status: IPOStatus
    list_date: string
  }) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    abbr: row.abbr,
    bgColor: row.bg_color,
    fgColor: row.fg_color,
    exchange: row.exchange,
    priceMax: row.price_max,
    gmp: row.gmp,
    gmpPercent: row.gmp_percent,
    gmpLastUpdated: row.gmp_last_updated,
    estListPrice: row.est_list_price || row.price_max,
    status: row.status,
    listDate: row.list_date,
  }))
}

// Fetch all IPO slugs (for static params generation)
export async function getAllIPOSlugs(): Promise<string[]> {
  const supabase = await createClient()
  
  const { data: currentIPOs } = await supabase
    .from('ipos')
    .select('slug')
  
  const { data: listedIPOs } = await supabase
    .from('listed_ipos')
    .select('slug')

  const slugs: string[] = []
  currentIPOs?.forEach((ipo: { slug: string }) => slugs.push(ipo.slug))
  listedIPOs?.forEach((ipo: { slug: string }) => slugs.push(ipo.slug))
  
  return [...new Set(slugs)]
}

// Get IPO count by status (for dashboard stats)
export async function getIPOStats(): Promise<{
  open: number
  upcoming: number
  listed: number
}> {
  const supabase = await createClient()
  
  const [openResult, upcomingResult, listedResult] = await Promise.all([
    supabase.from('ipos').select('id', { count: 'exact' }).in('status', ['open', 'lastday']),
    supabase.from('ipos').select('id', { count: 'exact' }).eq('status', 'upcoming'),
    supabase.from('listed_ipos').select('id', { count: 'exact' }),
  ])

  return {
    open: openResult.count || 0,
    upcoming: upcomingResult.count || 0,
    listed: listedResult.count || 0,
  }
}
