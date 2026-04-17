// lib/scraper/sources/gmp-ipocentral.ts

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  ipocentral_gmp_url?: string | null
}

const BASE_LIST_URL = "https://ipocentral.in/ipo-grey-market-premium-today/"

/**
 * Scrape GMP from IPOCentral.
 * - If `ipo.ipocentral_gmp_url` is set, hit that page directly.
 * - Otherwise hit the "grey market premium today" listing.
 */
export async function scrapeIPOCentralGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    const url = ipo.ipocentral_gmp_url || BASE_LIST_URL

    const response = await fetchWithRetry(url)
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    // ================================
    // CASE 1: Direct IPO page
    // ================================
    if (ipo.ipocentral_gmp_url) {
      let gmp: number | null = null

      // Prefer the "Consolidated IPO GMP" table
      $("table").each((_, table) => {
        if (gmp !== null) return
        const tableText = $(table).text().toLowerCase()
        if (!tableText.includes("consolidated ipo gmp")) return

        $(table)
          .find("tr")
          .each((_, row) => {
            if (gmp !== null) return
            const rowText = $(row).text()
            if (/date/i.test(rowText)) return

            const cells = $(row).find("td")
            if (cells.length < 2) return

            const parsed = parseGMP($(cells[1]).text())
            if (parsed !== null) gmp = parsed
          })
      })

      if (gmp !== null) return { gmp }

      // Fallback: scan page text
      const text = $("body").text()
      const m = text.match(/gmp[\s\S]{0,30}?₹?\s?([\d,.-]+)/i)
      if (m) {
        const parsed = parseGMP(m[1])
        if (parsed !== null) return { gmp: parsed }
      }

      return null
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

      const m = rowText.match(/₹?\s?([\d,.-]+)/)
      if (m) {
        const parsed = parseGMP(m[1])
        if (parsed !== null) foundGMP = parsed
      }
    })

    return foundGMP !== null ? { gmp: foundGMP } : null
  } catch (error) {
    console.error("[v0] scrapeIPOCentralGMP error:", error)
    return null
  }
}
