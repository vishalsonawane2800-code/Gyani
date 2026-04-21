import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseGMP } from "../parsers"

type IPO = {
  company_name?: string
  ipocentral_gmp_url?: string | null
}

const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DESKTOP_HEADERS: Record<string, string> = {
  "User-Agent": DESKTOP_UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

function extractGmpFromTables($: cheerio.CheerioAPI): number | null {
  for (const tr of $("table tr").toArray()) {
    const cells = $(tr)
      .find("th, td")
      .toArray()
      .map((c) => $(c).text().replace(/\s+/g, " ").trim())
    if (!cells.length) continue

    const headerLike = cells[0].toLowerCase()
    const rowText = cells.join(" ").toLowerCase()
    if (!/gmp|grey\s*market\s*premium/.test(headerLike) && !/gmp|grey\s*market\s*premium/.test(rowText)) {
      continue
    }

    for (let i = 1; i < cells.length; i++) {
      const n = parseGMP(cells[i], { dashAsZero: true })
      if (n !== null) return n
    }

    const fallback = parseGMP(cells.join(" "), { dashAsZero: true })
    if (fallback !== null) return fallback
  }
  return null
}

function extractGmpFromText($: cheerio.CheerioAPI): number | null {
  const bodyText = $("body").text().replace(/\s+/g, " ")
  const m = bodyText.match(
    /\b(?:gmp|grey\s*market\s*premium)\b[^0-9\-–—]{0,20}(₹|rs\.?|inr)?\s*([\-–—]|\d+(?:\.\d+)?)/i
  )
  if (!m) return null
  return parseGMP(m[2], { dashAsZero: true })
}

export async function scrapeIPOCentralGMP(
  ipo: IPO
): Promise<{ gmp: number } | null> {
  try {
    if (!ipo.ipocentral_gmp_url) return null
    const response = await fetchWithRetry(ipo.ipocentral_gmp_url, {
      headers: DESKTOP_HEADERS,
    })
    if (!response.ok) return null

    const html = await response.text()
    const $ = cheerio.load(html)

    const tableValue = extractGmpFromTables($)
    if (tableValue !== null) return { gmp: tableValue }

    const textValue = extractGmpFromText($)
    if (textValue !== null) return { gmp: textValue }

    return null
  } catch (err) {
    console.error("[v0] scrapeIPOCentralGMP error:", err)
    return null
  }
}
