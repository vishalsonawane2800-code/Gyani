
// lib/scraper/sources/gmp-investorgain.ts

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  investorgain_gmp_url?: string | null
}

export async function scrapeInvestorGainGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    let url = ipo.investorgain_gmp_url

    // Fallback to listing page if URL not provided
    if (!url) {
      url = "https://www.investorgain.com/report/live-ipo-gmp/331/"
    }

    const html = await fetchWithRetry(url)
    if (!html) return null

    const $ = cheerio.load(html)

    // ================================
    // CASE 1: Direct IPO GMP Page
    // ================================
    if (ipo.investorgain_gmp_url) {
      const pageText = $("body").text()

      // Try extracting from "last GMP..." sentence
      const match = pageText.match(/last gmp.*?₹\s?([\d,.]+)/i)
      if (match) {
        const gmp = parseGMP(match[1])
        if (gmp !== null) return { gmp }
      }

      // Fallback: extract from first table row
      const firstRowText = $("table tr").eq(1).text()
      const gmpMatch = firstRowText.match(/₹\s?([\d,.]+)/)

      if (gmpMatch) {
        const gmp = parseGMP(gmpMatch[1])
        if (gmp !== null) return { gmp }
      }

      return null
    }

    // ================================
    // CASE 2: Listing Page (Search IPO)
    // ================================
    let foundGMP: number | null = null

    $("table tr").each((_, el) => {
      const rowText = $(el).text().toLowerCase()
      const company = ipo.company_name.toLowerCase()

      if (rowText.includes(company)) {
        const gmpMatch = rowText.match(/₹\s?([\d,.]+)/)

        if (gmpMatch) {
          const gmp = parseGMP(gmpMatch[1])
          if (gmp !== null) {
            foundGMP = gmp
          }
        }
      }
    })

    if (foundGMP !== null) {
      return { gmp: foundGMP }
    }

    return null
  } catch (error) {
    console.error("scrapeInvestorGainGMP error:", error)
    return null
  }
}
