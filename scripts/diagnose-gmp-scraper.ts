#!/usr/bin/env tsx
/**
 * Diagnoses why GMP scraper is not finding data.
 * Checks:
 * 1. IPOs in database with upcoming/open/active status
 * 2. What the scraper sees when trying to fetch each source
 * 3. Name matching issues
 * 4. Source availability and circuit breaker status
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { normalizeName, namesMatch } from "@/lib/scraper/name-match"
import { fetchWithRetry } from "@/lib/scraper/base"
import * as cheerio from "cheerio"
import { redis } from "@/lib/redis"

async function diagnoseGMPScraper() {
  console.log("[v0] GMP Scraper Diagnostic")
  console.log("=" .repeat(80))

  const supabase = createAdminClient()

  // Step 1: Check database IPOs
  console.log("\n[STEP 1] Checking database IPOs...")
  const todayIso = new Date().toISOString().split("T")[0]
  const { data: ipos, error } = await supabase
    .from("ipos")
    .select(
      "id, slug, company_name, name, status, listing_date, ipowatch_gmp_url, gmp, gmp_last_updated"
    )
    .in("status", ["upcoming", "open", "lastday", "closed", "allot", "listing"])
    .or(`listing_date.is.null,listing_date.gte.${todayIso}`)
    .limit(20)

  if (error) {
    console.error("[ERROR] Failed to fetch IPOs:", error.message)
    return
  }

  const ipoList = ipos || []
  console.log(`Found ${ipoList.length} active IPOs in database`)

  if (ipoList.length === 0) {
    console.log("[WARNING] No active IPOs found! Database may not have been seeded.")
    return
  }

  ipoList.forEach((ipo) => {
    const companyName = ipo.company_name || ipo.name || "UNKNOWN"
    console.log(
      `  - ${ipo.slug}: "${companyName}" (status: ${ipo.status}, gmp: ${ipo.gmp || "null"})`
    )
  })

  // Step 2: Check ipowatch.in source
  console.log("\n[STEP 2] Checking ipowatch.in source...")
  try {
    const ipowatchUrl =
      "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"
    const response = await fetchWithRetry(ipowatchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.log(`[ERROR] ipowatch returned ${response.status}`)
    } else {
      const html = await response.text()
      const $ = cheerio.load(html)
      const tables = $("table")
      console.log(`[OK] ipowatch returned ${tables.length} tables`)

      if (tables.length > 0) {
        const firstTable = tables.eq(0)
        const rows = firstTable.find("tr")
        console.log(`    First table has ${rows.length} rows (including header)`)

        // Get headers
        const headers: string[] = []
        firstTable
          .find("tr")
          .first()
          .find("th, td")
          .each((_, el) => {
            headers.push($(el).text().replace(/\s+/g, " ").trim())
          })
        console.log(`    Headers: ${headers.join(" | ")}`)

        // Extract company names from first table
        console.log(`    Companies on ipowatch:`)
        const companies: string[] = []
        firstTable.find("tr").each((idx, tr) => {
          if (idx === 0) return
          if (companies.length >= 10) return
          const cells: string[] = []
          $(tr)
            .find("td, th")
            .each((_, el) => {
              cells.push($(el).text().replace(/\s+/g, " ").trim())
            })
          if (cells.length > 0) {
            companies.push(cells[0])
            console.log(`      ${idx}. ${cells[0]}`)
          }
        })

        // Check name matching
        console.log(`\n    Name matching analysis:`)
        ipoList.slice(0, 3).forEach((ipo) => {
          const companyName = ipo.company_name || ipo.name || "UNKNOWN"
          const normalized = normalizeName(companyName)
          let matchFound = false

          companies.forEach((sourceCompany) => {
            const sourceNorm = normalizeName(sourceCompany)
            if (namesMatch(normalized, sourceNorm)) {
              console.log(
                `      ✓ "${companyName}" matched "${sourceCompany}"`
              )
              matchFound = true
            }
          })

          if (!matchFound) {
            console.log(
              `      ✗ "${companyName}" (normalized: "${normalized}") NOT found on ipowatch`
            )
          }
        })
      }
    }
  } catch (err) {
    console.error("[ERROR] Failed to fetch ipowatch:", err)
  }

  // Step 3: Check ipoji source
  console.log("\n[STEP 3] Checking ipoji.com source...")
  try {
    const ipojiUrl =
      "https://ipoji.com/grey-market-premium-ipo-gmp-today.html"
    const response = await fetchWithRetry(ipojiUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    })

    if (!response.ok) {
      console.log(`[ERROR] ipoji returned ${response.status}`)
    } else {
      const html = await response.text()
      const $ = cheerio.load(html)
      const cards = $(".ipo-card")
      console.log(`[OK] ipoji returned ${cards.length} IPO cards`)

      if (cards.length > 0) {
        console.log(`    Companies on ipoji:`)
        const companies: string[] = []
        cards.each((idx, card) => {
          if (companies.length >= 10) return
          const titleRaw = $(card)
            .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim()
          if (titleRaw) {
            const cut = titleRaw.split(
              /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/
            )[0]
            const cleaned = (cut || titleRaw)
              .replace(/\s+/g, " ")
              .trim()
            companies.push(cleaned)
            console.log(`      ${idx + 1}. ${cleaned}`)
          }
        })

        // Check name matching
        console.log(`\n    Name matching analysis:`)
        ipoList.slice(0, 3).forEach((ipo) => {
          const companyName = ipo.company_name || ipo.name || "UNKNOWN"
          const normalized = normalizeName(companyName)
          let matchFound = false

          companies.forEach((sourceCompany) => {
            const sourceNorm = normalizeName(sourceCompany)
            if (namesMatch(normalized, sourceNorm)) {
              console.log(
                `      ✓ "${companyName}" matched "${sourceCompany}"`
              )
              matchFound = true
            }
          })

          if (!matchFound) {
            console.log(
              `      ✗ "${companyName}" (normalized: "${normalized}") NOT found on ipoji`
            )
          }
        })
      }
    }
  } catch (err) {
    console.error("[ERROR] Failed to fetch ipoji:", err)
  }

  // Step 4: Check circuit breaker status
  console.log("\n[STEP 4] Checking circuit breaker status...")
  try {
    const ipowatchBreaker = (await redis.get<number>(
      "circuit-breaker:gmp-ipowatch"
    )) ?? 0
    const ipojiBreaker = (await redis.get<number>(
      "circuit-breaker:gmp-ipoji"
    )) ?? 0
    console.log(`  ipowatch circuit breaker: ${ipowatchBreaker} failures`)
    console.log(`  ipoji circuit breaker: ${ipojiBreaker} failures`)
    if (ipowatchBreaker > 0 || ipojiBreaker > 0) {
      console.log(`  [WARNING] Circuit breakers active! Sources may be throttled.`)
    }
  } catch (err) {
    console.log(`[WARNING] Could not check circuit breaker (Redis error):`, err)
  }

  // Step 5: Summary and recommendations
  console.log("\n[SUMMARY]")
  console.log(
    "If the scraper shows 0 items, here are the likely causes:"
  )
  console.log("1. No IPOs in database (check database is seeded)")
  console.log(
    "2. IPOs are not currently listed on ipowatch.in or ipoji.com"
  )
  console.log(
    "3. Company names in database don't match source names (check normalization)"
  )
  console.log(
    "4. Circuit breakers are active (sources had too many failures)"
  )
  console.log("5. Network/firewall issues blocking source access")
}

diagnoseGMPScraper().catch(console.error)
