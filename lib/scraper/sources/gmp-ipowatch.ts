// lib/scraper/sources/gmp-ipowatch.ts

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  ipowatch_gmp_url?: string | null
}

const BASE_LIST_URL =
  "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"

/**
 * Scrape GMP from IPOWatch.
 * - If `ipo.ipowatch_gmp_url` is set, hit that page directly.
 * - Otherwise hit the live GMP listing and search by company_name.
 */
export async function scrapeIPOWatchGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    const url = ipo.ipowatch_gmp_url || BASE_LIST_URL

    const response = await fetchWithRetry(url)
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    // ================================
    // CASE 1: Direct IPO page
    // ================================
    if (ipo.ipowatch_gmp_url) {
      let gmp: number | null = null

      $("table tr").each((_, el) => {
        if (gmp !== null) return
        const rowText = $(el).text()
        if (/date/i.test(rowText)) return

        const m = rowText.match(/₹\s?([\d,.-]+)/)
        if (m) {
          const parsed = parseGMP(m[1])
          if (parsed !== null) gmp = parsed
        }
      })

      return gmp !== null ? { gmp } : null
    }

    // ================================
    // CASE 2: Listing page
    // ================================
    const company = ipo.company_name.toLowerCase().trim()
    let foundGMP: number | null = null

    $("table tr").each((_, el) => {
      if (foundGMP !== null) return
      const rowText = $(el).text().toLowerCase()
      if (!rowText.includes(company)) return

      const m = rowText.match(/₹\s?([\d,.-]+)/)
      if (m) {
        const parsed = parseGMP(m[1])
        if (parsed !== null) foundGMP = parsed
      }
    })

    return foundGMP !== null ? { gmp: foundGMP } : null
  } catch (error) {
    console.error("[v0] scrapeIPOWatchGMP error:", error)
    return null
  }
}
