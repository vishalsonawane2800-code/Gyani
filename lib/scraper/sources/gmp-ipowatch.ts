// lib/scraper/sources/gmp-ipowatch.ts
//
// IPOWatch GMP scraper.
//
// Page layout (verified 2026-04-20):
//   The listing page https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/
//   contains TWO tables:
//     Table 0 — "Current Live GMP" (~6 rows). Columns typically:
//                [IPO Name, Open Date, Close Date, Price, Lot, GMP, Listing]
//     Table 1 — Historical listed IPOs (~270+ rows). Columns include
//                IPO issue price, listing-day GMP, listing price.
//
// Previous bug: the scraper walked `table tr` across BOTH tables and picked
// the FIRST `₹` value in a matching row. For a row like
//   ["Om Power Transmission", "₹175", "₹2", "₹186"]
// that returned 175 (IPO issue price) instead of 2 (actual GMP).
//
// Fix:
//   1. Only parse the first table on the listing page.
//   2. Use the header row to pick the GMP column by label, not by index.
//   3. Normalize both sides (strip "limited/ltd/pvt/private/the/ipo/sme"
//      plus punctuation) and match if either normalized name starts with
//      the other. Handles "Sai Parenterals" vs "Sai Parenterals Limited".
//   4. Override the default IPOGyaniBot UA with a desktop Chrome UA —
//      IPOWatch responds differently to bot-style UAs.
//
// When `ipo.ipowatch_gmp_url` is a per-IPO article URL (admin override),
// we scan every table on that article for a row that looks like GMP data
// and pick the latest / largest numeric value as the current GMP.
//
// Contract: NEVER throws. Returns null on any failure.

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  ipowatch_gmp_url?: string | null
}

const BASE_LIST_URL =
  "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DESKTOP_HEADERS: Record<string, string> = {
  "User-Agent": DESKTOP_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

/**
 * Normalize an IPO name for fuzzy matching.
 * Strips common corporate suffixes, "IPO"/"SME" tokens, and punctuation.
 */
function normalizeName(name: string): string {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd\.?|pvt\.?|private|the|ipo|sme)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/** Match if either normalized name starts with the other (handles
 *  "Sai Parenterals" vs "Sai Parenterals Limited"). Requires at least
 *  6 characters of overlap to avoid false positives like "ABC" matching
 *  "ABC Corp Holdings". */
function namesMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const short = a.length <= b.length ? a : b
  const long = a.length <= b.length ? b : a
  if (short.length < 6) return false
  return long.startsWith(short)
}

/**
 * From a list of header labels, return the index of the column most
 * likely to contain today's GMP. We prefer a header that is exactly
 * "GMP" or "GMP (₹)" and actively REJECT any header containing
 * "listing", "issue price", "ipo price", "lot", "subscription" etc.
 */
function findGMPColumnIndex(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (!/\bgmp\b/.test(h)) continue
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h))
      continue
    return i
  }
  return -1
}

/** Column containing the IPO/company name. Falls back to 0. */
function findNameColumnIndex(headers: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (/ipo\s*name|company|name/.test(h)) return i
  }
  return 0
}

/**
 * Parse the "current live GMP" listing table on IPOWatch.
 * Returns the matched row's GMP or null.
 */
function parseListingTable(
  $: cheerio.CheerioAPI,
  targetName: string
): number | null {
  const firstTable = $("table").first()
  if (!firstTable.length) return null

  const headerCells = firstTable.find("tr").first().find("th, td")
  const headers: string[] = []
  headerCells.each((_, el) => {
    headers.push($(el).text().replace(/\s+/g, " ").trim())
  })

  const gmpIdx = findGMPColumnIndex(headers)
  if (gmpIdx < 0) {
    console.warn(
      "[v0] IPOWatch: GMP column not found in first-table headers:",
      headers
    )
    return null
  }
  const nameIdx = findNameColumnIndex(headers)
  const normalizedTarget = normalizeName(targetName)

  let foundGMP: number | null = null

  firstTable.find("tr").each((rowIdx, tr) => {
    if (rowIdx === 0) return // skip header
    if (foundGMP !== null) return

    const cells: string[] = []
    $(tr)
      .find("td, th")
      .each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, " ").trim())
      })
    if (cells.length <= Math.max(gmpIdx, nameIdx)) return

    const rowName = normalizeName(cells[nameIdx])
    if (!namesMatch(normalizedTarget, rowName)) return

    // Row was matched by name — IPOWatch IS reporting on this IPO. A `-`
    // (or `₹-`) in the GMP column on a present row means "explicitly zero
    // today", per user directive. Coerce via dashAsZero.
    const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true })
    if (gmp !== null) foundGMP = gmp
  })

  return foundGMP
}

/**
 * Admin-provided per-IPO article page. These articles usually contain a
 * small table with "GMP Today", "Subscription", etc. We grab the first
 * table whose header mentions GMP and take the latest non-null GMP cell.
 */
function parseArticlePage($: cheerio.CheerioAPI): number | null {
  let gmp: number | null = null

  $("table").each((_, tbl) => {
    if (gmp !== null) return
    const $tbl = $(tbl)
    const headers: string[] = []
    $tbl
      .find("tr")
      .first()
      .find("th, td")
      .each((_, el) => {
        headers.push($(el).text().replace(/\s+/g, " ").trim())
      })
    const gmpIdx = findGMPColumnIndex(headers)
    if (gmpIdx < 0) return

    $tbl.find("tr").each((rowIdx, tr) => {
      if (rowIdx === 0) return
      if (gmp !== null) return
      const cells: string[] = []
      $(tr)
        .find("td, th")
        .each((_, el) => {
          cells.push($(el).text().replace(/\s+/g, " ").trim())
        })
      if (cells.length <= gmpIdx) return
      // Per-IPO article page → every row IS this IPO. Treat dash/N/A as
      // explicit zero per user directive.
      const parsed = parseGMP(cells[gmpIdx], { dashAsZero: true })
      // On article pages the first data row is usually the latest entry.
      if (parsed !== null) gmp = parsed
    })
  })

  return gmp
}

/**
 * Scrape GMP from IPOWatch.
 * - If `ipo.ipowatch_gmp_url` is set, hit that article directly.
 * - Otherwise hit the live GMP listing and search by company_name.
 */
export async function scrapeIPOWatchGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    const url = ipo.ipowatch_gmp_url || BASE_LIST_URL

    const response = await fetchWithRetry(url, { headers: DESKTOP_HEADERS })
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    const gmp = ipo.ipowatch_gmp_url
      ? parseArticlePage($)
      : parseListingTable($, ipo.company_name)

    return gmp !== null ? { gmp } : null
  } catch (error) {
    console.error("[v0] scrapeIPOWatchGMP error:", error)
    return null
  }
}
