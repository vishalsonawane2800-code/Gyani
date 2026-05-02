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
import { namesMatch, normalizeName } from "../name-match"
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
 * IPOWatch occasionally ships the "Live IPO GMP" section as card/list blocks
 * instead of a structured table. In that layout each row still contains:
 *   [IPO name][₹GMP][₹price band][₹est listing ...]
 * and GMP is the FIRST ₹ token after the matched IPO name.
 */
function parseListingFallback(
  $: cheerio.CheerioAPI,
  targetName: string
): number | null {
  const targetNorm = normalizeName(targetName)
  if (!targetNorm) return null

  // 1) Prefer anchor text matches (usually row title links in the listing).
  let found: number | null = null
  $("a").each((_, a) => {
    if (found !== null) return

    const anchorText = $(a).text().replace(/\s+/g, " ").trim()
    if (!anchorText) return
    if (!namesMatch(targetNorm, normalizeName(anchorText))) return

    const container = $(a).closest("tr, li, article, p, div")
    const raw = container.length
      ? container.text().replace(/\s+/g, " ").trim()
      : anchorText
    if (!raw) return

    // In current IPOWatch live rows GMP is the first ₹ token.
    const firstCurrency = raw.match(/₹\s*(?:[-–—]|\d+(?:\.\d+)?)/i)?.[0]
    if (!firstCurrency) return
    const parsed = parseGMP(firstCurrency, { dashAsZero: true })
    if (parsed !== null) found = parsed
  })

  if (found !== null) return found

  // 2) Last-resort text-window parse from the whole page.
  const body = $("body").text().replace(/\s+/g, " ").trim()
  if (!body) return null
  const targetTokens = targetNorm.split(" ").slice(0, 2).join("\\s+")
  if (!targetTokens) return null

  const windowRe = new RegExp(`(${targetTokens}.{0,220})`, "i")
  const window = body.match(windowRe)?.[1]
  if (!window) return null

  const firstCurrency = window.match(/₹\s*(?:[-–—]|\d+(?:\.\d+)?)/i)?.[0]
  if (!firstCurrency) return null
  return parseGMP(firstCurrency, { dashAsZero: true })
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
      : parseListingTable($, ipo.company_name) ??
        parseListingFallback($, ipo.company_name)

    return gmp !== null ? { gmp } : null
  } catch (error) {
    console.error("[v0] scrapeIPOWatchGMP error:", error)
    return null
  }
}
