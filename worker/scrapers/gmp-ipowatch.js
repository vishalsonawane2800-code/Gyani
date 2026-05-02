// scrapers/gmp-ipowatch.js
//
// IPOWatch GMP scraper — converted from TypeScript for Railway (Node 22 ESM).
// All helper logic (fetchWithRetry, namesMatch, normalizeName, parseGMP)
// is inlined here so there are zero local import dependencies.
//
// Contract: NEVER throws. Returns null on any failure.

import * as cheerio from "cheerio"

// ─────────────────────────────────────────────────────────────
// INLINED: lib/scraper/base  →  fetchWithRetry
// ─────────────────────────────────────────────────────────────

/**
 * Fetch with up to `retries` attempts and exponential back-off.
 * Uses the native Node 22 fetch — no node-fetch needed.
 */
async function fetchWithRetry(url, options = {}, retries = 3, baseDelayMs = 600) {
  let lastError
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, options)
      if (res.ok) return res
      // Treat 429 / 5xx as retriable
      if (res.status < 500 && res.status !== 429) return res
      lastError = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastError = err
    }
    if (attempt < retries) {
      const delay = baseDelayMs * 2 ** (attempt - 1)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastError
}

// ─────────────────────────────────────────────────────────────
// INLINED: lib/scraper/name-match  →  normalizeName, namesMatch
// ─────────────────────────────────────────────────────────────

const STRIP_WORDS = /\b(limited|ltd|pvt|private|the|ipo|sme|and|&)\b/gi
const STRIP_PUNCT = /[^a-z0-9\s]/g

/**
 * Lower-case, strip common suffix words and punctuation, collapse spaces.
 */
function normalizeName(raw) {
  if (!raw || typeof raw !== "string") return ""
  return raw
    .toLowerCase()
    .replace(STRIP_WORDS, " ")
    .replace(STRIP_PUNCT, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Returns true if either normalized name starts-with the other.
 * Handles "Sai Parenterals" matching "Sai Parenterals Limited IPO".
 */
function namesMatch(a, b) {
  if (!a || !b) return false
  return a.startsWith(b) || b.startsWith(a)
}

// ─────────────────────────────────────────────────────────────
// INLINED: lib/scraper/parsers  →  parseGMP
// ─────────────────────────────────────────────────────────────

/**
 * Parse a GMP string like "₹12", "+₹5", "₹-3", "₹-", "-", "N/A", "0".
 *
 * Options:
 *   dashAsZero  — treat "₹-" / "–" / "—" / "-" / "N/A" as 0
 *                 (IPOWatch shows dash when GMP is explicitly zero today)
 *
 * Returns a number or null.
 */
function parseGMP(raw, { dashAsZero = false } = {}) {
  if (raw === null || raw === undefined) return null
  const s = String(raw).replace(/\s+/g, "").trim()
  if (!s) return null

  // Explicit zero markers
  const isDash = /^[₹]?[-–—]+$/.test(s) || /^n\/a$/i.test(s)
  if (isDash) return dashAsZero ? 0 : null

  // Strip currency symbol and parse
  const cleaned = s.replace(/₹/g, "").replace(/,/g, "")
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

// ─────────────────────────────────────────────────────────────
// SCRAPER CORE  (converted from TypeScript, logic unchanged)
// ─────────────────────────────────────────────────────────────

const BASE_LIST_URL =
  "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"

const DESKTOP_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

/**
 * From a list of header labels, return the index of the GMP column.
 * Actively rejects headers that contain "listing", "issue price", etc.
 */
function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (!/\bgmp\b/.test(h)) continue
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue
    return i
  }
  return -1
}

/** Column containing the IPO/company name. Falls back to 0. */
function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (/ipo\s*name|company|name/.test(h)) return i
  }
  return 0
}

/**
 * Parse the "current live GMP" first table on the IPOWatch listing page.
 */
function parseListingTable($, targetName) {
  const firstTable = $("table").first()
  if (!firstTable.length) return null

  const headerCells = firstTable.find("tr").first().find("th, td")
  const headers = []
  headerCells.each((_, el) => {
    headers.push($(el).text().replace(/\s+/g, " ").trim())
  })

  const gmpIdx = findGMPColumnIndex(headers)
  if (gmpIdx < 0) {
    console.warn("[gmp-ipowatch] GMP column not found in headers:", headers)
    return null
  }

  const nameIdx = findNameColumnIndex(headers)
  const normalizedTarget = normalizeName(targetName)
  let foundGMP = null

  firstTable.find("tr").each((rowIdx, tr) => {
    if (rowIdx === 0) return   // skip header row
    if (foundGMP !== null) return

    const cells = []
    $(tr).find("td, th").each((_, el) => {
      cells.push($(el).text().replace(/\s+/g, " ").trim())
    })
    if (cells.length <= Math.max(gmpIdx, nameIdx)) return

    const rowName = normalizeName(cells[nameIdx])
    if (!namesMatch(normalizedTarget, rowName)) return

    // Row matched — a "₹-" here means explicitly zero today
    const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true })
    if (gmp !== null) foundGMP = gmp
  })

  return foundGMP
}

/**
 * Fallback for when IPOWatch renders cards/lists instead of a table.
 */
function parseListingFallback($, targetName) {
  const targetNorm = normalizeName(targetName)
  if (!targetNorm) return null

  let found = null

  // 1) Anchor text match
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

    const firstCurrency = raw.match(/₹\s*(?:[-–—]|\d+(?:\.\d+)?)/i)?.[0]
    if (!firstCurrency) return
    const parsed = parseGMP(firstCurrency, { dashAsZero: true })
    if (parsed !== null) found = parsed
  })

  if (found !== null) return found

  // 2) Last-resort text-window scan
  const body = $("body").text().replace(/\s+/g, " ").trim()
  if (!body) return null

  const targetTokens = targetNorm.split(" ").slice(0, 2).join("\\s+")
  if (!targetTokens) return null

  const windowRe = new RegExp(`(${targetTokens}.{0,220})`, "i")
  const windowMatch = body.match(windowRe)?.[1]
  if (!windowMatch) return null

  const firstCurrency = windowMatch.match(/₹\s*(?:[-–—]|\d+(?:\.\d+)?)/i)?.[0]
  if (!firstCurrency) return null
  return parseGMP(firstCurrency, { dashAsZero: true })
}

/**
 * Admin-provided per-IPO article page scraper.
 */
function parseArticlePage($) {
  let gmp = null

  $("table").each((_, tbl) => {
    if (gmp !== null) return
    const $tbl = $(tbl)
    const headers = []
    $tbl.find("tr").first().find("th, td").each((_, el) => {
      headers.push($(el).text().replace(/\s+/g, " ").trim())
    })

    const gmpIdx = findGMPColumnIndex(headers)
    if (gmpIdx < 0) return

    $tbl.find("tr").each((rowIdx, tr) => {
      if (rowIdx === 0) return
      if (gmp !== null) return
      const cells = []
      $(tr).find("td, th").each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, " ").trim())
      })
      if (cells.length <= gmpIdx) return
      const parsed = parseGMP(cells[gmpIdx], { dashAsZero: true })
      if (parsed !== null) gmp = parsed
    })
  })

  return gmp
}

// ─────────────────────────────────────────────────────────────
// PUBLIC EXPORT
// ─────────────────────────────────────────────────────────────

/**
 * Scrape GMP from IPOWatch.
 *
 * @param {object} ipo
 * @param {string} ipo.company_name
 * @param {string|null} [ipo.ipowatch_gmp_url]  — admin override article URL
 * @returns {Promise<{gmp: number}|null>}
 */
export async function scrapeIPOWatchGMP(ipo) {
  try {
    const url = ipo.ipowatch_gmp_url || BASE_LIST_URL

    const response = await fetchWithRetry(url, { headers: DESKTOP_HEADERS })
    if (!response.ok) {
      console.warn(`[gmp-ipowatch] HTTP ${response.status} for ${url}`)
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const gmp = ipo.ipowatch_gmp_url
      ? parseArticlePage($)
      : parseListingTable($, ipo.company_name) ??
        parseListingFallback($, ipo.company_name)

    if (gmp !== null) {
      console.log(`[gmp-ipowatch] "${ipo.company_name}" → GMP: ${gmp}`)
    } else {
      console.warn(`[gmp-ipowatch] "${ipo.company_name}" → no GMP found`)
    }

    return gmp !== null ? { gmp } : null
  } catch (error) {
    console.error("[gmp-ipowatch] scrapeIPOWatchGMP error:", error)
    return null
  }
}
