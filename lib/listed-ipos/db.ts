/**
 * Supabase `listed_ipos` -> ListedIpoRecord adapter.
 *
 * The archive is CSV-first (historical data in git), but freshly-listed IPOs
 * land in the `listed_ipos` DB table via the day-after-listing auto-migration.
 * This module reads those rows and maps them to the same shape the CSV
 * loader produces so the archive pages can show them without a CSV commit.
 *
 * Most of the 40 enrichment columns (GMP D1-D5, subscription D1-D3,
 * Nifty returns, etc.) are null for DB-sourced rows - the detail/index
 * pages render "-" where data is missing, which is fine.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { slugify, type ListedIpoRecord } from './loader'

type ListedIpoDbRow = {
  id: number
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

function dbRowToRecord(row: ListedIpoDbRow): ListedIpoRecord | null {
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
  }
}

export async function getListedIposFromDbByYear(
  year: number
): Promise<ListedIpoRecord[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('listed_ipos')
      .select(
        'id, company_name, name, slug, sector, exchange, list_date, issue_price, list_price, listing_price, current_price, gain_pct, listing_gain_percent, sub_times, year'
      )
      .or(
        `year.eq.${year},and(list_date.gte.${year}-01-01,list_date.lte.${year}-12-31)`
      )
    if (error || !data) return []
    return data
      .map((r) => dbRowToRecord(r as ListedIpoDbRow))
      .filter((r): r is ListedIpoRecord => r !== null)
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
      .select(
        'id, company_name, name, slug, sector, exchange, list_date, issue_price, list_price, listing_price, current_price, gain_pct, listing_gain_percent, sub_times, year'
      )
      .eq('slug', slug)
      .maybeSingle()
    if (error || !data) return null
    const rec = dbRowToRecord(data as ListedIpoDbRow)
    if (!rec) return null
    if (rec.year !== year) return null
    return rec
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
