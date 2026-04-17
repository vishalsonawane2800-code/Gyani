// lib/scraper/sources/gmp-investorgain.ts

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  investorgain_gmp_url?: string | null
}

const BASE_LIST_URL = "https://www.investorgain.com/report/live-ipo-gmp/331/"

/**
 * Scrape GMP from InvestorGain.
 * - If `ipo.investorgain_gmp_url` is set, hit that page directly.
 * - Otherwise hit the live GMP listing and search by company_name.
 * Returns { gmp } or null if not found / error.
 */
export async function scrapeInvestorGainGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    const url = ipo.investorgain_gmp_url || BASE_LIST_URL

    const response = await fetchWithRetry(url)
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    // ================================
    // CASE 1: Direct IPO GMP page
    // ================================
    if (ipo.investorgain_gmp_url) {
      const pageText = $("body").text()

      // Try "last GMP ... ₹X" sentence first
      const sentenceMatch = pageText.match(/last\s+gmp[\s\S]{0,40}?₹\s?([\d,.-]+)/i)
      if (sentenceMatch) {
        const gmp = parseGMP(sentenceMatch[1])
        if (gmp !== null) return { gmp }
      }

      // Fallback: first data row of the first table
      const firstRowText = $("table tr").eq(1).text()
      const rowMatch = firstRowText.match(/₹\s?([\d,.-]+)/)
      if (rowMatch) {
        const gmp = parseGMP(rowMatch[1])
        if (gmp !== null) return { gmp }
      }

      return null
    }

    // ================================
    // CASE 2: Listing page - match by company
    // ================================
    const company = ipo.company_name.toLowerCase().trim()
    let foundGMP: number | null = null

    $("table tr").each((_, el) => {
      if (foundGMP !== null) return
      const rowText = $(el).text().toLowerCase()
      if (!rowText.includes(company)) return

      const m = rowText.match(/₹\s?([\d,.-]+)/)
      if (m) {
        const gmp = parseGMP(m[1])
        if (gmp !== null) foundGMP = gmp
      }
    })

    return foundGMP !== null ? { gmp: foundGMP } : null
  } catch (error) {
    console.error("[v0] scrapeInvestorGainGMP error:", error)
    return null
  }
}
