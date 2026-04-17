// lib/scraper/parsers.ts

/**
 * Utility parsers for IPOGyani scrapers
 * Handles messy Indian financial formats safely
 */

const MONTH_MAP: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  sept: 8,
  oct: 9,
  nov: 10,
  dec: 11,
}

function isInvalid(input: string | null | undefined): boolean {
  if (!input) return true
  return /^(na|n\/a|--|-|not available|nil|none)$/i.test(input.trim())
}

/**
 * Parses Indian formatted numbers:
 * - 1,23,456.78
 * - ₹ 5 Cr / 5Cr / 5 crore
 * - 10 L / 10 lakh / 10 lac
 */
export function parseIndianNumber(input: string | null | undefined): number | null {
  if (isInvalid(input)) return null

  try {
    let str = input!.toLowerCase().trim()

    // Remove currency symbols
    str = str.replace(/₹|rs\.?|inr/gi, "").trim()

    let multiplier = 1

    // Crore
    if (/\b(cr|crore)\b/.test(str)) {
      multiplier = 1e7
      str = str.replace(/\b(cr|crore)\b/gi, "")
    }
    // Lakh / Lac / L
    else if (/\b(lakh|lac|l)\b/.test(str)) {
      multiplier = 1e5
      str = str.replace(/\b(lakh|lac|l)\b/gi, "")
    }

    // Remove commas
    str = str.replace(/,/g, "").trim()

    const num = parseFloat(str)

    if (isNaN(num)) return null

    return num * multiplier
  } catch {
    return null
  }
}

/**
 * Parses subscription values:
 * - 12.45x
 * - 12.45 times
 */
export function parseSubscriptionTimes(input: string | null | undefined): number | null {
  if (isInvalid(input)) return null

  try {
    let str = input!.toLowerCase().trim()

    str = str.replace(/times|x/gi, "").trim()

    const num = parseFloat(str)

    return isNaN(num) ? null : num
  } catch {
    return null
  }
}

/**
 * Parses GMP values:
 * - ₹ 150
 * - 150/-
 * - Rs. 150
 * - 150
 */
export function parseGMP(input: string | null | undefined): number | null {
  if (isInvalid(input)) return null

  try {
    let str = input!.toLowerCase().trim()

    str = str
      .replace(/₹|rs\.?|inr/gi, "")
      .replace(/\/-/g, "")
      .replace(/,/g, "")
      .trim()

    const num = parseFloat(str)

    return isNaN(num) ? null : num
  } catch {
    return null
  }
}

/**
 * Parses Indian date formats:
 * - 12-Jan-2025
 * - 12/01/2025
 * - 12 Jan 2025
 */
export function parseDate(
  input: string | null | undefined,
  _formats?: string[]
): Date | null {
  if (isInvalid(input)) return null

  try {
    const str = input!.trim()

    // 1. DD/MM/YYYY or DD-MM-YYYY
    let match = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)
    if (match) {
      const [, d, m, y] = match
      return new Date(Number(y), Number(m) - 1, Number(d))
    }

    // 2. DD-MMM-YYYY or DD MMM YYYY
    match = str.match(/^(\d{1,2})[- ]([a-zA-Z]{3,})[- ](\d{4})$/)
    if (match) {
      const [, d, mon, y] = match
      const m = MONTH_MAP[mon.toLowerCase().slice(0, 3)]
      if (m !== undefined) {
        return new Date(Number(y), m, Number(d))
      }
    }

    // 3. Fallback (ISO or readable formats)
    const date = new Date(str)
    if (!isNaN(date.getTime())) return date

    return null
  } catch {
    return null
  }
}
