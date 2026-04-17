// lib/scraper/sources/subscription-bse.ts
// Scrapes subscription numbers from BSE's public IPO issue page.
//
// BSE's JSON API (api.bseindia.com) has a CORS-restricted endpoint that
// usually requires a valid Origin/Referer. We hit the public HTML page
// instead and parse the subscription table with cheerio. This is more
// resilient to API access rules and captchas.
//
// Contract: NEVER throws. Returns `null` on any failure.

import * as cheerio from "cheerio"
import { parseSubscriptionTimes } from "@/lib/scraper/parsers"

export type BseSubscription = {
  total: number | null
  retail: number | null
  nii: number | null
  qib: number | null
}

type IpoInput = {
  bse_scrip_code: string | number | null
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const FETCH_TIMEOUT_MS = 15_000

function buildBseUrl(scripCode: string): string {
  // BSE public issue information page. Works for SME and Mainboard.
  return `https://www.bseindia.com/markets/PublicIssues/IPOIssues_New.aspx?expandable=&id=${encodeURIComponent(
    scripCode
  )}`
}

/**
 * Categorizes a table row label into retail/nii/qib/total.
 */
function categorize(label: string): keyof BseSubscription | null {
  const l = label.toLowerCase().trim()
  if (/(^|[^a-z])retail|rii|individual/i.test(l)) return "retail"
  if (/non[- ]?institutional|\bnii\b|hni/i.test(l)) return "nii"
  if (/qualified[- ]?institutional|\bqib\b/i.test(l)) return "qib"
  if (/total|overall|aggregate/i.test(l)) return "total"
  return null
}

/**
 * Extracts the first numeric subscription-times value (e.g. "1.23x",
 * "1.23 times", "0.45") from a row's cells.
 */
function extractTimesFromCells(cells: string[]): number | null {
  // Try rightmost cells first — subscription tables usually put the
  // "Times Subscribed" column last.
  for (let i = cells.length - 1; i >= 0; i--) {
    const n = parseSubscriptionTimes(cells[i])
    if (n != null && n >= 0) return n
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
        Referer: "https://www.bseindia.com/",
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.text()
  } catch (err) {
    console.error("[v0] BSE fetchHtml error:", err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function scrapeBSESubscription(
  ipo: IpoInput
): Promise<BseSubscription | null> {
  const raw = ipo.bse_scrip_code
  if (raw == null) return null
  const scripCode = String(raw).trim()
  if (!scripCode) return null

  try {
    const html = await fetchHtml(buildBseUrl(scripCode))
    if (!html) return null

    const $ = cheerio.load(html)
    const result: BseSubscription = {
      total: null,
      retail: null,
      nii: null,
      qib: null,
    }

    // Walk every <tr> on the page. The subscription table may live inside
    // nested containers, and different IPO types use different layouts.
    $("tr").each((_, tr) => {
      const cells: string[] = []
      $(tr)
        .find("td, th")
        .each((_i, el) => {
          cells.push($(el).text().replace(/\s+/g, " ").trim())
        })
      if (cells.length < 2) return

      const cat = categorize(cells[0])
      if (!cat) return
      if (result[cat] != null) return // Don't overwrite first hit.

      const times = extractTimesFromCells(cells.slice(1))
      if (times != null) {
        result[cat] = times
      }
    })

    const anyFound =
      result.total != null ||
      result.retail != null ||
      result.nii != null ||
      result.qib != null
    return anyFound ? result : null
  } catch (err) {
    console.error("[v0] scrapeBSESubscription error:", err)
    return null
  }
}
