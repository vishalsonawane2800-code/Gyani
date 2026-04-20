// lib/scraper/sources/subscription-chittorgarh.ts
// Fallback subscription scraper using Chittorgarh's public IPO pages.
// Uses the stored `chittorgarh_url` if available, otherwise builds a slug
// from `company_name`.
//
// Contract: NEVER throws. Returns `null` on any failure.
//
// Parsing strategy:
//   Chittorgarh's pages contain many tables ("Company Financials",
//   "Total Issue Size", "Objects of the Issue", etc.). A naive pass
//   that greps for "total" will happily pick up garbage numbers from
//   those unrelated tables. Instead we:
//     1. Locate only tables whose header row contains a subscription
//        signal (e.g. "Subscription (times)", "No. of times subscribed",
//        "Subscription Status").
//     2. Within those tables, match the first column against a known
//        list of category labels — including InvIT / REIT specific
//        ones ("Institutional Investors", "Other Investors").
//     3. Read the subscription multiplier from the numeric "times"
//        column when present, falling back to the last numeric cell.

import * as cheerio from "cheerio"
import { parseSubscriptionTimes } from "@/lib/scraper/parsers"

export type ChittorgarhSubscription = {
  total: number | null
  retail: number | null
  nii: number | null
  qib: number | null
}

type IpoInput = {
  chittorgarh_url: string | null
  company_name: string | null
  slug?: string | null
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const FETCH_TIMEOUT_MS = 15_000

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\b(limited|ltd|pvt|private)\b\.?/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function candidateUrls(ipo: IpoInput): string[] {
  const urls: string[] = []
  if (ipo.chittorgarh_url && /^https?:\/\//i.test(ipo.chittorgarh_url)) {
    urls.push(ipo.chittorgarh_url)
  }
  const baseName = ipo.slug || ipo.company_name
  if (baseName) {
    const s = slugify(baseName)
    if (s) {
      // Chittorgarh commonly uses `/ipo/<slug>-ipo/<id>.html` but without
      // the numeric ID we can only try the canonical search-style URL.
      urls.push(`https://www.chittorgarh.com/ipo/${s}-ipo/`)
    }
  }
  return urls
}

type Category = keyof ChittorgarhSubscription

/**
 * Map a row label to one of our four subscription buckets.
 * Returns null for labels we don't want to pick up (e.g.
 * "Total Issue Size", "Total Income", employee reservations).
 *
 * Supports:
 *   - Mainboard/SME: "Retail", "RII", "NII", "HNI", "QIB",
 *     "QIB (Ex Anchor)", "bNII", "sNII".
 *   - InvIT/REIT:    "Institutional Investors" -> qib-equivalent,
 *                    "Non-Institutional Investors" / "Other
 *                    Investors" -> nii-equivalent.
 *   - Totals:        "Total" / "Overall" / "Grand Total" / "Total
 *                    (Ex Anchor)" / "Subscription Total".
 */
function categorize(rawLabel: string): Category | null {
  const l = rawLabel.toLowerCase().trim()
  if (!l) return null

  // ---- Explicit negatives: reject labels we don't want to collect
  //      even though they contain a category-like word.
  if (/\bissue\s+size\b/.test(l)) return null
  if (/\btotal\s+(income|assets|amount|equity|liabilities|expenses|shares?|issue)\b/.test(l))
    return null
  if (/\bshares?\s+offered\b/.test(l)) return null
  if (/\bshares?\s+bid\b/.test(l)) return null
  if (/\bamount\b/.test(l) && !/\bsubscri/.test(l)) return null
  if (/\banchor\b/.test(l) && !/ex[\s-]*anchor/.test(l)) return null
  if (/\bemployee|reservation\b/.test(l)) return null
  if (/\bmarket\s+cap\b/.test(l)) return null

  // ---- Totals --------------------------------------------------------
  if (/^total$/i.test(l)) return "total"
  if (/^total[\s(]/.test(l)) return "total"
  if (/\b(grand\s+total|overall|aggregate|subscription\s+total)\b/.test(l)) return "total"
  if (/^total\s+(subscrib|subscri)/.test(l)) return "total"

  // ---- QIB / Institutional ------------------------------------------
  if (/\bqib\b/.test(l)) return "qib"
  if (/qualified[\s-]*institutional/.test(l)) return "qib"
  // InvIT / REIT specific: "Institutional Investors"
  if (/\binstitutional\s+investors?\b/.test(l) && !/non[\s-]*institutional/.test(l))
    return "qib"

  // ---- NII / HNI ----------------------------------------------------
  if (/non[\s-]*institutional/.test(l)) return "nii"
  if (/\bnii\b/.test(l)) return "nii"
  if (/\bhni\b/.test(l)) return "nii"
  // InvIT / REIT specific: "Other Investors" (kept below NII so QIB
  // takes precedence when both are present).
  if (/^other\s+investors?$/.test(l)) return "nii"

  // ---- Retail / RII -------------------------------------------------
  if (/\bretail\b/.test(l)) return "retail"
  if (/\brii\b/.test(l)) return "retail"
  if (/retail[\s-]*individual/.test(l)) return "retail"

  return null
}

/**
 * Return true if a table header row looks like it belongs to a
 * subscription table. We check *only* the header, because data rows
 * can have noisy first-column labels.
 */
function isSubscriptionTable(headers: string[]): boolean {
  const joined = headers.join(" | ").toLowerCase()
  // Must have some "subscription"-like signal in the header.
  if (!/subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(joined))
    return false
  // Must not be a GMP-only table.
  if (/gmp|grey\s*market/.test(joined) && !/subscri/.test(joined)) return false
  return true
}

/**
 * Pick the subscription-multiplier cell from a data row. Prefers the
 * column whose header contains "times" or "subscription"; otherwise
 * falls back to the last numeric cell, ignoring share counts.
 */
function pickTimes(cells: string[], headers: string[]): number | null {
  // 1. Try header-aligned lookup.
  for (let i = 0; i < cells.length; i++) {
    const h = (headers[i] || "").toLowerCase()
    if (!h) continue
    if (
      /subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(h) &&
      !/shares?|amount/.test(h)
    ) {
      const n = parseSubscriptionTimes(cells[i])
      if (n != null && n >= 0 && n < 10_000) return n
    }
  }
  // 2. Fallback: walk cells right-to-left and return the first plausible
  //    "times" value (< 10,000 — share counts are typically much bigger).
  for (let i = cells.length - 1; i >= 1; i--) {
    const raw = cells[i].trim()
    if (!raw) continue
    // Skip obvious share counts / money values.
    if (/₹|\brs\.?\b|\bcr\b|crore|lakh|lac/i.test(raw)) continue
    if (/,\d{3}/.test(raw)) continue // numbers with thousands separators likely share counts
    const n = parseSubscriptionTimes(raw)
    if (n != null && n >= 0 && n < 10_000) return n
  }
  return null
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function parseFromHtml(html: string): ChittorgarhSubscription | null {
  try {
    const $ = cheerio.load(html)
    const out: ChittorgarhSubscription = {
      total: null,
      retail: null,
      nii: null,
      qib: null,
    }

    $("table").each((_, tbl) => {
      // Read header row (first <tr> with <th> cells, or first <tr>).
      const $tbl = $(tbl)
      let headers: string[] = []
      const $headerRow = $tbl.find("tr").first()
      $headerRow.find("th, td").each((_i, el) => {
        headers.push($(el).text().replace(/\s+/g, " ").trim())
      })

      if (!isSubscriptionTable(headers)) return // skip unrelated tables

      $tbl.find("tr").each((idx, tr) => {
        if (idx === 0) return // skip header
        const cells: string[] = []
        $(tr)
          .find("td, th")
          .each((_j, el) => {
            cells.push($(el).text().replace(/\s+/g, " ").trim())
          })
        if (cells.length < 2) return

        const cat = categorize(cells[0])
        if (!cat) return
        if (out[cat] != null) return // keep the first match per category

        const times = pickTimes(cells.slice(1), headers.slice(1))
        if (times != null) out[cat] = times
      })
    })

    const anyFound =
      out.total != null ||
      out.retail != null ||
      out.nii != null ||
      out.qib != null
    return anyFound ? out : null
  } catch (err) {
    console.error("[v0] Chittorgarh parse error:", err)
    return null
  }
}

export async function scrapeChittorgarhSubscription(
  ipo: IpoInput
): Promise<ChittorgarhSubscription | null> {
  const urls = candidateUrls(ipo)
  for (const url of urls) {
    const html = await fetchHtml(url)
    if (!html) continue
    const parsed = parseFromHtml(html)
    if (parsed) return parsed
  }
  return null
}
