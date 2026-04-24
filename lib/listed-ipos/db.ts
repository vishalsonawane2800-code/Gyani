/**
 * Supabase `listed_ipos` -> ListedIpoRecord adapter.
 *
 * The archive is CSV-first (historical data in git), but freshly-listed IPOs
 * land in the `listed_ipos` DB table via the day-after-listing auto-migration.
 * This module reads those rows and maps them to the same shape the CSV
 * loader produces so the archive pages can show them without a CSV commit.
 *
 * DB-sourced rows are enriched on read from:
 *   - `ipos`               (parent row, via original_ipo_id)
 *       -> AI prediction, sentiment, issue size, subscription totals
 *   - `gmp_history`        (per-day GMP values, one row per ipo_id+date)
 *       -> GMP Day-1..Day-5 and GMP percentage D1..D5
 *   - `subscription_history` (per-day subscription totals & categories)
 *       -> Day 1/2/3 subscription, plus QIB/HNI/Retail on final day.
 *
 * Fields still legitimately unknown at migration time (Nifty returns,
 * peer PE, debt/equity, etc.) remain null — the UI renders those as "-".
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { slugify, type ListedIpoRecord } from './loader'

type ListedIpoDbRow = {
  id: number
  original_ipo_id: number | null
  company_name: string | null
  name: string | null
  slug: string | null
  sector: string | null
  exchange: string | null
  list_date: string | null
  issue_price: number | null
  list_price: number | null
  listing_price: number | null
  current_price: number | null
  gain_pct: number | null
  listing_gain_percent: number | null
  sub_times: number | null
  year: string | null
}

type IposRow = {
  id: number
  issue_size_cr: number | null
  fresh_issue: string | null
  ofs: string | null
  ai_prediction: number | null
  sentiment_score: number | null
  subscription_total: number | null
  subscription_retail: string | null
  subscription_nii: string | null
  subscription_qib: string | null
  gmp: number | null
  gmp_percent: number | null
  price_max: number | null
  pe_ratio: number | null
}

type GmpHistoryRow = {
  ipo_id: number
  date: string
  gmp: number | null
  gmp_percent: number | null
}

type SubHistoryRow = {
  ipo_id: number
  date: string
  retail: number | null
  nii: number | null
  qib: number | null
  total: number | null
}

const LISTED_COLUMNS =
  'id, original_ipo_id, company_name, name, slug, sector, exchange, list_date, issue_price, list_price, listing_price, current_price, gain_pct, listing_gain_percent, sub_times, year'

/**
 * Best-effort number extraction from free-form text ("Rs 1,200 Cr", "1200.50").
 * Returns null if no numeric content can be recovered.
 */
function extractCr(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const m = String(raw).match(/[-+]?\d[\d,]*(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0].replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

/**
 * Supabase `text` subscription values are like "2.5x" or "-". Parse leniently.
 */
function parseSubX(raw: string | null | undefined): number | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s || s === '-') return null
  const m = s.match(/[-+]?\d+(?:\.\d+)?/)
  if (!m) return null
  const n = Number(m[0])
  return Number.isFinite(n) ? n : null
}

/**
 * Build a minimal record from just the listed_ipos row. Used by callers
 * that don't need the enrichment joins (e.g. the per-year listing index,
 * which only cares about gain %, issue price, exchange, list date).
 */
function baseRecord(row: ListedIpoDbRow): ListedIpoRecord | null {
  const name = (row.company_name || row.name || '').trim()
  if (!name) return null
  const slug = (row.slug || slugify(name)).trim()
  const listingDateRaw = row.list_date || ''
  const listingDate = listingDateRaw
  const year =
    row.year && /^\d{4}$/.test(row.year)
      ? parseInt(row.year, 10)
      : listingDateRaw
        ? new Date(listingDateRaw).getFullYear()
        : new Date().getFullYear()

  const listingPrice = row.list_price ?? row.listing_price ?? null
  const closingPriceNse = row.current_price ?? null
  const listingGainPct =
    row.gain_pct ??
    row.listing_gain_percent ??
    (row.issue_price && listingPrice
      ? Math.round(((listingPrice - row.issue_price) / row.issue_price) * 10000) /
        100
      : null)

  return {
    slug,
    year,
    name,
    listingDate,
    listingDateRaw,
    sector: row.sector || '',

    retailQuotaPct: null,
    issuePriceUpper: row.issue_price,
    listingPrice,
    closingPriceNse,
    listingGainPct,
    listingGainClosingPct:
      closingPriceNse != null && row.issue_price
        ? Math.round(
            ((closingPriceNse - row.issue_price) / row.issue_price) * 10000
          ) / 100
        : null,
    dayChangeAfterListingPct: null,

    qibDay3: null,
    hniDay3: null,
    retailDay3: null,
    day1Sub: null,
    day2Sub: null,
    day3Sub: row.sub_times,

    gmpPctD1: null,
    gmpPctD2: null,
    gmpPctD3: null,
    gmpPctD4: null,
    gmpPctD5: null,

    peerPe: null,
    debtEquity: null,
    ipoPe: null,
    latestEbitda: null,
    peVsSectorRatio: null,

    nifty3dPct: null,
    nifty1wPct: null,
    nifty1mPct: null,
    niftyDuringWindowPct: null,

    sentimentScore: null,
    issueSizeCr: null,
    freshIssueCr: null,
    ofsCr: null,

    gmpD1: null,
    gmpD2: null,
    gmpD3: null,
    gmpD4: null,
    gmpD5: null,

    gmpPrediction: null,
    aiPrediction: null,
    predictionAccuracy: null,
  }
}

/**
 * Enrich a base record with data joined from ipos / gmp_history /
 * subscription_history so the detail page renders populated stats.
 */
function enrichRecord(
  rec: ListedIpoRecord,
  ipo: IposRow | null,
  gmpRows: GmpHistoryRow[],
  subRows: SubHistoryRow[]
): ListedIpoRecord {
  // --- AI / GMP / financial fields from the ipos row ---
  if (ipo) {
    rec.aiPrediction = ipo.ai_prediction ?? rec.aiPrediction
    rec.sentimentScore = ipo.sentiment_score ?? rec.sentimentScore
    rec.issueSizeCr = ipo.issue_size_cr ?? rec.issueSizeCr
    rec.freshIssueCr = extractCr(ipo.fresh_issue) ?? rec.freshIssueCr
    rec.ofsCr = extractCr(ipo.ofs) ?? rec.ofsCr
    rec.ipoPe = ipo.pe_ratio ?? rec.ipoPe
    if (rec.issuePriceUpper == null) rec.issuePriceUpper = ipo.price_max ?? null
  }

  // --- Per-day GMP table (D1..D5) ---
  // gmp_history often has multiple rows per day (morning + evening).
  // Collapse to one reading per day (prefer the latest record for that date).
  if (gmpRows.length > 0) {
    const byDate = new Map<string, GmpHistoryRow>()
    for (const r of gmpRows) {
      byDate.set(r.date, r) // later rows win (input is sorted asc)
    }
    const distinct = Array.from(byDate.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1
    )
    // Use the last 5 subscription-window days (earliest -> Day 1, latest -> Day N).
    const tail = distinct.slice(-5)
    const slots: Array<keyof ListedIpoRecord> = [
      'gmpD1',
      'gmpD2',
      'gmpD3',
      'gmpD4',
      'gmpD5',
    ]
    const pctSlots: Array<keyof ListedIpoRecord> = [
      'gmpPctD1',
      'gmpPctD2',
      'gmpPctD3',
      'gmpPctD4',
      'gmpPctD5',
    ]
    tail.forEach((row, idx) => {
      ;(rec as unknown as Record<string, number | null>)[slots[idx]] =
        row.gmp ?? null
      ;(rec as unknown as Record<string, number | null>)[pctSlots[idx]] =
        row.gmp_percent ?? null
    })

    // Derive a GMP prediction range (low% - high%) from the daily percentages.
    const pcts = tail
      .map((r) => r.gmp_percent)
      .filter((v): v is number => v != null)
    if (pcts.length > 0) {
      const min = Math.min(...pcts)
      const max = Math.max(...pcts)
      rec.gmpPrediction =
        Math.abs(max - min) < 0.05
          ? `${min.toFixed(1)}%`
          : `${min.toFixed(1)}%-${max.toFixed(1)}%`
    }
  }

  // --- Day 1/2/3 subscription and final QIB/HNI/Retail ---
  if (subRows.length > 0) {
    // Take the final reading per date, then use first 3 distinct dates for D1-D3.
    const byDate = new Map<string, SubHistoryRow>()
    for (const r of subRows) {
      byDate.set(r.date, r) // later rows win (input is sorted asc)
    }
    const distinct = Array.from(byDate.values()).sort((a, b) =>
      a.date < b.date ? -1 : 1
    )
    const [d1, d2, d3] = distinct
    rec.day1Sub = d1?.total ?? rec.day1Sub
    rec.day2Sub = d2?.total ?? rec.day2Sub
    rec.day3Sub = d3?.total ?? rec.day3Sub
    const last = distinct[distinct.length - 1]
    if (last) {
      rec.qibDay3 = last.qib ?? rec.qibDay3
      rec.hniDay3 = last.nii ?? rec.hniDay3
      rec.retailDay3 = last.retail ?? rec.retailDay3
    }
  }

  // --- Fallback to the text subscription fields on the ipos row ---
  if (ipo && rec.qibDay3 == null) rec.qibDay3 = parseSubX(ipo.subscription_qib)
  if (ipo && rec.hniDay3 == null) rec.hniDay3 = parseSubX(ipo.subscription_nii)
  if (ipo && rec.retailDay3 == null)
    rec.retailDay3 = parseSubX(ipo.subscription_retail)
  if (ipo && rec.day3Sub == null) rec.day3Sub = ipo.subscription_total ?? null

  // --- Prediction accuracy (absolute pp error between AI pred & actual) ---
  if (
    rec.aiPrediction != null &&
    rec.listingGainPct != null &&
    rec.predictionAccuracy == null
  ) {
    rec.predictionAccuracy =
      Math.round(Math.abs(rec.listingGainPct - rec.aiPrediction) * 100) / 100
  }

  return rec
}

async function fetchEnrichment(
  supabase: ReturnType<typeof createAdminClient>,
  ipoIds: number[]
): Promise<{
  iposById: Map<number, IposRow>
  gmpByIpo: Map<number, GmpHistoryRow[]>
  subByIpo: Map<number, SubHistoryRow[]>
}> {
  const iposById = new Map<number, IposRow>()
  const gmpByIpo = new Map<number, GmpHistoryRow[]>()
  const subByIpo = new Map<number, SubHistoryRow[]>()

  if (ipoIds.length === 0) {
    return { iposById, gmpByIpo, subByIpo }
  }

  const [iposRes, gmpRes, subRes] = await Promise.all([
    supabase
      .from('ipos')
      .select(
        'id, issue_size_cr, fresh_issue, ofs, ai_prediction, sentiment_score, subscription_total, subscription_retail, subscription_nii, subscription_qib, gmp, gmp_percent, price_max, pe_ratio'
      )
      .in('id', ipoIds),
    supabase
      .from('gmp_history')
      .select('ipo_id, date, gmp, gmp_percent')
      .in('ipo_id', ipoIds)
      .order('date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('subscription_history')
      .select('ipo_id, date, retail, nii, qib, total')
      .in('ipo_id', ipoIds)
      .order('date', { ascending: true })
      .order('time', { ascending: true }),
  ])

  for (const row of (iposRes.data as IposRow[] | null) ?? []) {
    iposById.set(row.id, row)
  }
  for (const row of (gmpRes.data as GmpHistoryRow[] | null) ?? []) {
    if (!gmpByIpo.has(row.ipo_id)) gmpByIpo.set(row.ipo_id, [])
    gmpByIpo.get(row.ipo_id)!.push(row)
  }
  for (const row of (subRes.data as SubHistoryRow[] | null) ?? []) {
    if (!subByIpo.has(row.ipo_id)) subByIpo.set(row.ipo_id, [])
    subByIpo.get(row.ipo_id)!.push(row)
  }

  return { iposById, gmpByIpo, subByIpo }
}

export async function getListedIposFromDbByYear(
  year: number
): Promise<ListedIpoRecord[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('listed_ipos')
      .select(LISTED_COLUMNS)
      .or(
        `year.eq.${year},and(list_date.gte.${year}-01-01,list_date.lte.${year}-12-31)`
      )
    if (error || !data) return []

    const rows = data as ListedIpoDbRow[]
    const ipoIds = rows
      .map((r) => r.original_ipo_id)
      .filter((v): v is number => v != null)

    const { iposById, gmpByIpo, subByIpo } = await fetchEnrichment(
      supabase,
      ipoIds
    )

    const records: ListedIpoRecord[] = []
    for (const row of rows) {
      const base = baseRecord(row)
      if (!base) continue
      const ipoId = row.original_ipo_id
      const enriched =
        ipoId != null
          ? enrichRecord(
              base,
              iposById.get(ipoId) ?? null,
              gmpByIpo.get(ipoId) ?? [],
              subByIpo.get(ipoId) ?? []
            )
          : base
      records.push(enriched)
    }
    return records
  } catch (err) {
    console.error('[listed-ipos/db] fetch year failed:', err)
    return []
  }
}

export async function getListedIpoFromDb(
  year: number,
  slug: string
): Promise<ListedIpoRecord | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('listed_ipos')
      .select(LISTED_COLUMNS)
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) return null
    const row = data as ListedIpoDbRow
    const base = baseRecord(row)
    if (!base) return null
    if (base.year !== year) return null

    if (row.original_ipo_id == null) return base
    const { iposById, gmpByIpo, subByIpo } = await fetchEnrichment(supabase, [
      row.original_ipo_id,
    ])
    return enrichRecord(
      base,
      iposById.get(row.original_ipo_id) ?? null,
      gmpByIpo.get(row.original_ipo_id) ?? [],
      subByIpo.get(row.original_ipo_id) ?? []
    )
  } catch (err) {
    console.error('[listed-ipos/db] fetch slug failed:', err)
    return null
  }
}

export async function getAvailableYearsFromDb(): Promise<number[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('listed_ipos')
      .select('year, list_date')
    if (error || !data) return []
    const years = new Set<number>()
    for (const row of data as Array<{ year: string | null; list_date: string | null }>) {
      if (row.year && /^\d{4}$/.test(row.year)) {
        years.add(parseInt(row.year, 10))
      } else if (row.list_date) {
        const y = new Date(row.list_date).getFullYear()
        if (Number.isFinite(y)) years.add(y)
      }
    }
    return Array.from(years).sort((a, b) => b - a)
  } catch (err) {
    console.error('[listed-ipos/db] years fetch failed:', err)
    return []
  }
}
