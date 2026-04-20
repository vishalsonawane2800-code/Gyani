// lib/scraper/sources/gmp-ipoji.ts
//
// ipoji.com GMP scraper.
//
// Why this source: verified 2026-04-20 from Vercel egress — ipoji responds
// 200 OK with desktop UA, no WAF, and server-renders a card-based grid of
// ~46 live/current IPOs. This is our replacement for InvestorGain (SPA) and
// IPOCentral (403 from cloud IPs) in the averaged GMP pipeline.
//
// Page layout:
//   <div class="ipo-card">
//     <... title: "Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live" />
//     <div class="ipo-card-body-stat">
//       <span class="ipo-card-secondary-label">Exp. Premium</span>
//       <span class="ipo-card-body-value">3-4 (3%)</span>
//     </div>
//     <div class="ipo-card-body-stat">Offer Price / Lot Size / Subscription / Issue Size...</div>
//   </div>
//
// Value formats we handle:
//   - "3-4 (3%)"      → midpoint of range → 3.5
//   - "10 (5%)"       → 10
//   - "₹ 5"           → 5
//   - "-" / "" / "NA" → null
//
// Contract: NEVER throws. Returns null on any failure.

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { namesMatch, normalizeName } from "../name-match"

type IPO = {
  company_name: string
}

const BASE_LIST_URL =
  "https://ipoji.com/grey-market-premium-ipo-gmp-today.html"

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
 * Parse ipoji's "Exp. Premium" cell. Examples:
 *   "3-4 (3%)"   → 3.5
 *   "10 (5%)"    → 10
 *   "₹ 5"        → 5
 *   "-"          → null   (default) | 0 if `dashAsZero` is true
 *
 * `dashAsZero` should be set ONLY when the ipoji card for this IPO has
 * already been located. A present card with "Exp. Premium: -" means the
 * source is explicitly reporting zero GMP today (per user directive),
 * not "data missing".
 */
function parseIpojiPremium(
  raw: string,
  options: { dashAsZero?: boolean } = {},
): number | null {
  if (raw === null || raw === undefined) return null
  const s = String(raw).replace(/₹|rs\.?|inr/gi, "").trim()
  if (!s) return null
  if (/^(?:--|[-–—]|n\/?a|nil|none|not\s*available)$/i.test(s)) {
    return options.dashAsZero ? 0 : null
  }

  // Range first: "3-4 (3%)" → average 3.5. Keep the parenthetical
  // percentage OUT of the range match.
  const rangeMatch = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1])
    const b = parseFloat(rangeMatch[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.round(((a + b) / 2) * 100) / 100
    }
  }

  // Flat: first number encountered.
  const flatMatch = s.match(/(-?\d+(?:\.\d+)?)/)
  if (flatMatch) {
    const n = parseFloat(flatMatch[1])
    return Number.isFinite(n) ? n : null
  }

  return null
}

/**
 * Strip trailing metadata from the ipoji card title. A card title looks like
 *   "Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live"
 * We keep only the leading company-name portion.
 */
function cleanCardTitle(title: string): string {
  const cut = title.split(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/
  )[0]
  return (cut || title).replace(/\s+/g, " ").trim()
}

export async function scrapeIpojiGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    const response = await fetchWithRetry(BASE_LIST_URL, {
      headers: DESKTOP_HEADERS,
    })
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)
    const cards = $(".ipo-card")
    if (!cards.length) {
      console.warn("[v0] ipoji: no .ipo-card elements found")
      return null
    }

    const targetNorm = normalizeName(ipo.company_name)
    if (!targetNorm) return null

    let gmp: number | null = null

    cards.each((_, card) => {
      if (gmp !== null) return
      const $card = $(card)
      const titleRaw = $card
        .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim()
      if (!titleRaw) return

      const cleaned = cleanCardTitle(titleRaw)
      const titleNorm = normalizeName(cleaned)
      if (!namesMatch(targetNorm, titleNorm)) return

      $card.find(".ipo-card-body-stat").each((_, s) => {
        if (gmp !== null) return
        const label = $(s)
          .find(".ipo-card-secondary-label")
          .text()
          .trim()
          .toLowerCase()
        if (!/gmp|exp\.?\s*premium|grey\s*market/.test(label)) return
        const value = $(s).find(".ipo-card-body-value").text().trim()
        // Card was matched by name and the GMP stat block exists — a `-`
        // here means "explicitly zero today", not missing data.
        const parsed = parseIpojiPremium(value, { dashAsZero: true })
        if (parsed !== null) gmp = parsed
      })
    })

    return gmp !== null ? { gmp } : null
  } catch (err) {
    console.error("[v0] scrapeIpojiGMP error:", err)
    return null
  }
}
