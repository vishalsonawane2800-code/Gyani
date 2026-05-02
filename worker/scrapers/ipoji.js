Now IPOji (second source) and InvestorGain (URL-based third source):
Action: file_editor create /app/worker/scrapers/ipoji.js --file-text "// worker/scrapers/ipoji.js
//
// ipoji.com GMP scraper — card-based layout.
//
// Page: https://ipoji.com/grey-market-premium-ipo-gmp-today.html
//
// Structure:
//   <div class=\"ipo-card\">
//     <... title: \"Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live\" />
//     <div class=\"ipo-card-body-stat\">
//       <span class=\"ipo-card-secondary-label\">Exp. Premium</span>
//       <span class=\"ipo-card-body-value\">3-4 (3%)</span>
//     </div>
//   </div>
//
// ipoji uses ranges (\"3-4\") and percent-in-parens (\"10 (5%)\") — both
// handled by parseGMP (range → midpoint, strips percent block).
//
// Return contract: { source: \"ipoji\", gmp: number | null }. NEVER throws.

import * as cheerio from \"cheerio\"
import {
  DESKTOP_HEADERS,
  fetchWithRetry,
  namesMatch,
  normalizeName,
  parseGMP,
} from \"./_utils.js\"

const SOURCE = \"ipoji\"
const BASE_LIST_URL =
  \"https://ipoji.com/grey-market-premium-ipo-gmp-today.html\"

function log(...args) {
  console.log(`[${SOURCE}]`, ...args)
}

/** Strip the trailing date range / exchange / status tail from card titles
 *  like \"Mehul Telecom Apr 17, 2026 – Apr 21, 2026 BSE SME Live\". */
function cleanCardTitle(title) {
  const cut = title.split(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/)[0]
  return (cut || title).replace(/\s+/g, \" \").trim()
}

export async function scrapeIpojiGMP(ipo) {
  const company_name = ipo?.company_name || \"\"
  try {
    const res = await fetchWithRetry(BASE_LIST_URL, { headers: DESKTOP_HEADERS })
    if (!res.ok) {
      console.warn(`[${SOURCE}] HTTP ${res.status}`)
      return { source: SOURCE, gmp: null }
    }
    const html = await res.text()
    log(`fetched \"${company_name}\" — html length=${html.length}`)

    const $ = cheerio.load(html)
    const cards = $(\".ipo-card\")
    log(`found ${cards.length} ipo-card elements`)
    if (!cards.length) return { source: SOURCE, gmp: null }

    const targetNorm = normalizeName(company_name)
    if (!targetNorm) return { source: SOURCE, gmp: null }

    let gmp = null
    let matchedTitle = null

    cards.each((_, card) => {
      if (gmp !== null) return
      const $card = $(card)
      const titleRaw = $card
        .find(\".ipo-card-title, .ipo-card-header, h2, h3, a\")
        .first()
        .text()
        .replace(/\s+/g, \" \")
        .trim()
      if (!titleRaw) return

      const titleNorm = normalizeName(cleanCardTitle(titleRaw))
      if (!namesMatch(targetNorm, titleNorm)) return

      $card.find(\".ipo-card-body-stat\").each((_, s) => {
        if (gmp !== null) return
        const label = $(s)
          .find(\".ipo-card-secondary-label\")
          .text()
          .trim()
          .toLowerCase()
        if (!/gmp|exp\.?\s*premium|grey\s*market/.test(label)) return
        const value = $(s).find(\".ipo-card-body-value\").text().trim()
        // Card matched by name + GMP stat present → dash means explicit 0.
        const parsed = parseGMP(value, { dashAsZero: true })
        if (parsed !== null) {
          gmp = parsed
          matchedTitle = titleRaw
          log(`matched card \"${titleRaw}\" → value=\"${value}\" → GMP=${parsed}`)
        }
      })
    })

    if (gmp === null) {
      console.warn(`[${SOURCE}] \"${company_name}\" → no GMP found`)
    }
    return { source: SOURCE, gmp }
  } catch (err) {
    console.error(`[${SOURCE}] scrapeIpojiGMP error:`, err)
    return { source: SOURCE, gmp: null }
  }
}
"
Observation: Create successful: /app/worker/scrapers/ipoji.js
