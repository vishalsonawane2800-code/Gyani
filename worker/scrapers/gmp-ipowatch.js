Now the new robust `ipowatch.js` (per spec) that scans **both** IPOWatch tables and returns `{source, gmp}`:
Action: file_editor create /app/worker/scrapers/ipowatch.js --file-text "// worker/scrapers/ipowatch.js
//
// IPOWatch GMP scraper — multi-table aware.
//
// Page layout (verified live against ipowatch.in on 2026-05-02):
//   Table 0 — \"Current Live GMP\" (~6 rows). Columns:
//     [IPO Name, IPO GMP, Trend, Price Band, Est. Listing, Date, Type, Status, Last Updated]
//   Table 1 — Historical listed IPOs (~270+ rows). Columns:
//     [IPO Name, IPO Price, IPO GMP, Listing Price]
//
// Strategy:
//   1. Try Table 0 first — it's the live section.
//   2. If not found there, try Table 1 — covers recently-closed / listed IPOs.
//      (The previous version scanned only Table 0 then fell back to a body-
//       text regex, which matched the FIRST \"₹\" in a row — i.e. IPO Price,
//       NOT GMP — returning wildly wrong values like 175 for Om Power.)
//   3. Both passes pick the GMP column by header label, never by fixed index.
//   4. Name match uses normalizeName + namesMatch from _utils.js, which
//      folds typographic apostrophes (\"Sai Parenteral's\") and strips
//      corporate boilerplate (\"Limited\", \"Pvt\", \"InvIT\", \"Investment Trust\").
//
// When `ipowatch_gmp_url` is provided (admin override article page) we scan
// every table on that article for a row whose header mentions GMP.
//
// Return contract: always returns { source: \"ipowatch\", gmp: number | null }.
// NEVER throws.

import * as cheerio from \"cheerio\"
import {
  DESKTOP_HEADERS,
  fetchWithRetry,
  namesMatch,
  normalizeName,
  parseGMP,
} from \"./_utils.js\"

const SOURCE = \"ipowatch\"
const BASE_LIST_URL =
  \"https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/\"

function log(...args) {
  console.log(`[${SOURCE}]`, ...args)
}
function warn(...args) {
  console.warn(`[${SOURCE}]`, ...args)
}

/** Return the column index whose header is the GMP column.
 *  Actively rejects headers like \"Listing\", \"Issue Price\", \"Lot\", etc. */
function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (!/\bgmp\b/.test(h)) continue
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue
    return i
  }
  return -1
}

/** Column containing the IPO/company name. Falls back to 0. */
function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (/ipo\s*name|company|name/.test(h)) return i
  }
  return 0
}

/** Extract clean cell strings from a <tr>. */
function rowCells($, tr) {
  const cells = []
  $(tr)
    .find(\"td, th\")
    .each((_, el) => cells.push($(el).text().replace(/\s+/g, \" \").trim()))
  return cells
}

/**
 * Parse one <table> for a row whose name column fuzzy-matches `targetName`,
 * then return that row's GMP.
 */
function parseTable($, $tbl, targetName, label) {
  if (!$tbl || !$tbl.length) return null

  const headers = rowCells($, $tbl.find(\"tr\").first())
  const gmpIdx = findGMPColumnIndex(headers)
  if (gmpIdx < 0) {
    warn(`${label}: GMP column not found in headers:`, headers)
    return null
  }
  const nameIdx = findNameColumnIndex(headers)
  const normalizedTarget = normalizeName(targetName)

  let foundGMP = null
  let matchedRow = null

  $tbl.find(\"tr\").each((rowIdx, tr) => {
    if (rowIdx === 0) return
    if (foundGMP !== null) return
    const cells = rowCells($, tr)
    if (cells.length <= Math.max(gmpIdx, nameIdx)) return

    const rowName = normalizeName(cells[nameIdx])
    if (!namesMatch(normalizedTarget, rowName)) return

    // Row located — \"-\", \"₹-\", \"N/A\" in the GMP cell means explicitly zero.
    const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true })
    if (gmp !== null) {
      foundGMP = gmp
      matchedRow = cells
    }
  })

  if (matchedRow) {
    log(`${label}: matched row →`, matchedRow)
    log(`${label}: extracted GMP (col ${gmpIdx} \"${headers[gmpIdx]}\") =`, foundGMP)
  }
  return foundGMP
}

/** Admin-provided per-IPO article page scan. */
function parseArticlePage($) {
  let gmp = null
  $(\"table\").each((_, tbl) => {
    if (gmp !== null) return
    const $tbl = $(tbl)
    const headers = rowCells($, $tbl.find(\"tr\").first())
    const gmpIdx = findGMPColumnIndex(headers)
    if (gmpIdx < 0) return

    $tbl.find(\"tr\").each((rowIdx, tr) => {
      if (rowIdx === 0) return
      if (gmp !== null) return
      const cells = rowCells($, tr)
      if (cells.length <= gmpIdx) return
      const parsed = parseGMP(cells[gmpIdx], { dashAsZero: true })
      if (parsed !== null) gmp = parsed
    })
  })
  return gmp
}

/**
 * Scrape GMP from IPOWatch.
 *
 * @param {object} ipo
 * @param {string} ipo.company_name
 * @param {string|null} [ipo.ipowatch_gmp_url]  — admin override article URL
 * @returns {Promise<{source: \"ipowatch\", gmp: number | null}>}
 */
export async function scrapeIPOWatchGMP(ipo) {
  const company_name = ipo?.company_name || \"\"
  const url = ipo?.ipowatch_gmp_url || BASE_LIST_URL

  try {
    const res = await fetchWithRetry(url, { headers: DESKTOP_HEADERS })
    if (!res.ok) {
      warn(`HTTP ${res.status} for ${url}`)
      return { source: SOURCE, gmp: null }
    }
    const html = await res.text()
    log(`fetched \"${company_name}\" from ${url} — html length=${html.length}`)

    const $ = cheerio.load(html)

    let gmp = null
    if (ipo?.ipowatch_gmp_url) {
      gmp = parseArticlePage($)
    } else {
      const tables = $(\"table\").toArray()
      log(`parsed ${tables.length} tables`)
      // Table 0 — live GMP
      gmp = parseTable($, $(tables[0]), company_name, \"table0[live]\")
      // Table 1 — historical/listed IPOs
      if (gmp === null && tables[1]) {
        gmp = parseTable($, $(tables[1]), company_name, \"table1[listed]\")
      }
    }

    if (gmp === null) {
      warn(`\"${company_name}\" → no GMP found`)
    } else {
      log(`\"${company_name}\" → GMP=${gmp}`)
    }
    return { source: SOURCE, gmp }
  } catch (err) {
    console.error(`[${SOURCE}] scrapeIPOWatchGMP error:`, err)
    return { source: SOURCE, gmp: null }
  }
}
"
Observation: Create successful: /app/worker/scrapers/ipowatch.js
