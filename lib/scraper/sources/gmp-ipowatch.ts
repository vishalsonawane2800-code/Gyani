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

export async function scrapeIPOWatchGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    let url = ipo.ipowatch_gmp_url

    // Fallback to listing page
    if (!url) {
      url = BASE_LIST_URL
    }

    const html = await fetchWithRetry(url)
    if (!html) return null

    const $ = cheerio.load(html)

    // ================================
    // CASE 1: Direct IPO Page
    // ================================
    if (ipo.ipowatch_gmp_url) {
      let gmp: number | null = null

      $("table tr").each((_, el) => {
        const rowText = $(el).text()

        // Skip header
        if (/date/i.test(rowText)) return

        // Extract GMP from first valid row
        const match = rowText.match(/₹\s?([\d,.-]+)/)

        if (match && gmp === null) {
          const parsed = parseGMP(match[1])

          if (parsed !== null) {
            gmp = parsed
          }
        }
      })

      if (gmp !== null) {
        return { gmp }
      }

      return null
    }

    // ================================
    // CASE 2: Listing Page
    // ================================
    let foundGMP: number | null = null
    const company = ipo.company_name.toLowerCase()

    $("table tr").each((_, el) => {
      const rowText = $(el).text().toLowerCase()

      if (rowText.includes(company)) {
        const match = rowText.match(/₹\s?([\d,.-]+)/)

        if (match) {
          const parsed = parseGMP(match[1])

          if (parsed !== null) {
            foundGMP = parsed
          }
        }
      }
    })

    if (foundGMP !== null) {
      return { gmp: foundGMP }
    }

    return null
  } catch (error) {
    console.error("scrapeIPOWatchGMP error:", error)
    return null
  }
}
