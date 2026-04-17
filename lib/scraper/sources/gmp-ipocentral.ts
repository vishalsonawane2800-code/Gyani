// lib/scraper/sources/gmp-ipocentral.ts

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name: string
  ipocentral_gmp_url?: string | null
}

const BASE_LIST_URL =
  "https://ipocentral.in/ipo-grey-market-premium-today/"

export async function scrapeIPOCentralGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    let url = ipo.ipocentral_gmp_url

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
    if (ipo.ipocentral_gmp_url) {
      let gmp: number | null = null

      // Find table containing "Consolidated IPO GMP"
      $("table").each((_, table) => {
        const tableText = $(table).text().toLowerCase()

        if (tableText.includes("consolidated ipo gmp")) {
          $(table)
            .find("tr")
            .each((_, row) => {
              const rowText = $(row).text()

              // Skip header row
              if (/date/i.test(rowText)) return

              // Extract GMP number (second column usually)
              const cells = $(row).find("td")

              if (cells.length >= 2) {
                const gmpText = $(cells[1]).text()
                const parsed = parseGMP(gmpText)

                if (parsed !== null && gmp === null) {
                  gmp = parsed
                }
              }
            })
        }
      })

      if (gmp !== null) {
        return { gmp }
      }

      // Fallback: search entire page text
      const text = $("body").text()
      const match = text.match(/gmp.*?₹?\s?([\d,.]+)/i)

      if (match) {
        const parsed = parseGMP(match[1])
        if (parsed !== null) return { gmp: parsed }
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
        const match = rowText.match(/₹?\s?([\d,.]+)/)

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
    console.error("scrapeIPOCentralGMP error:", error)
    return null
  }
}
