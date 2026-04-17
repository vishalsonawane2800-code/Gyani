// lib/scraper/sources/subscription-nse.ts
// Scrapes subscription numbers from NSE's public IPO APIs.
//
// NSE exposes a few possibly-relevant JSON endpoints:
//   /api/ipo-current-issue           -> list of live issues
//   /api/ipo-detail?symbol=<SYM>     -> detail for one issue
//
// We try `ipo-current-issue` first (cheap, one call serves many IPOs)
// and fall back to `ipo-detail`. Matching logic: exact symbol first,
// then case-insensitive substring.
//
// Contract: NEVER throws. Returns `null` on any failure.

import { fetchNseApi } from "./nse-session"

export type NseSubscription = {
  total: number | null
  retail: number | null
  nii: number | null
  qib: number | null
}

type IpoInput = {
  nse_symbol: string | null
}

// Shape is loose on purpose: NSE response keys shift between endpoints
// and over time.
type LooseRecord = Record<string, unknown>

function toNum(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string") {
    const cleaned = v.replace(/[,x]/gi, "").trim()
    if (!cleaned || /^(na|n\/a|-|--)$/i.test(cleaned)) return null
    const n = parseFloat(cleaned)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Reads one of several possible keys for the same concept. Returns the
 * first numeric hit.
 */
function pick(row: LooseRecord, keys: string[]): number | null {
  for (const k of keys) {
    if (k in row) {
      const n = toNum(row[k])
      if (n != null) return n
    }
  }
  return null
}

/**
 * NSE response rows historically use variants like:
 *   - `noOfshareBid`, `issueSize`, `sTotal`
 *   - `subscriptionCategory`: { retail: "1.23", nii: "0.45", qib: "0.12", total: "0.85" }
 *   - top-level `sRetail`, `sNII`, `sQIB`, `sTotal`
 */
function parseRow(row: LooseRecord): NseSubscription | null {
  // Case A: nested `subscriptionCategory` (or similar) object.
  for (const container of [
    "subscriptionCategory",
    "subscription",
    "subscriptionDetails",
  ]) {
    const nested = row[container]
    if (nested && typeof nested === "object") {
      const n = nested as LooseRecord
      const total = pick(n, ["total", "Total", "totalSubscription", "sTotal"])
      const retail = pick(n, [
        "retail",
        "Retail",
        "retailSubscription",
        "rii",
        "RII",
        "sRetail",
      ])
      const nii = pick(n, ["nii", "NII", "niiSubscription", "sNII"])
      const qib = pick(n, ["qib", "QIB", "qibSubscription", "sQIB"])
      if (total != null || retail != null || nii != null || qib != null) {
        return { total, retail, nii, qib }
      }
    }
  }

  // Case B: flat top-level keys.
  const total = pick(row, [
    "sTotal",
    "totalSubscription",
    "total",
    "Total",
    "overallSubscription",
  ])
  const retail = pick(row, [
    "sRetail",
    "retailSubscription",
    "retail",
    "Retail",
    "rii",
    "RII",
  ])
  const nii = pick(row, ["sNII", "niiSubscription", "nii", "NII"])
  const qib = pick(row, ["sQIB", "qibSubscription", "qib", "QIB"])

  if (total == null && retail == null && nii == null && qib == null) {
    return null
  }
  return { total, retail, nii, qib }
}

function findMatchingRow(
  rows: LooseRecord[],
  symbol: string
): LooseRecord | null {
  if (!Array.isArray(rows) || rows.length === 0) return null
  const sym = symbol.trim()
  const symLower = sym.toLowerCase()

  // Exact match on `symbol` / `companySymbol`.
  const exact = rows.find((r) => {
    const s = (r.symbol ?? r.companySymbol ?? r.tradingSymbol) as string | undefined
    return typeof s === "string" && s === sym
  })
  if (exact) return exact

  // Case-insensitive substring match.
  const sub = rows.find((r) => {
    const s = (r.symbol ?? r.companySymbol ?? r.tradingSymbol) as string | undefined
    return typeof s === "string" && s.toLowerCase().includes(symLower)
  })
  return sub ?? null
}

/**
 * Extracts a row list from various response shapes:
 *   - raw array
 *   - `{ data: [...] }`
 *   - `{ activeIpo: [...], upcomingIpo: [...] }`
 */
function extractRows(resp: unknown): LooseRecord[] {
  if (!resp) return []
  if (Array.isArray(resp)) return resp as LooseRecord[]
  const r = resp as LooseRecord
  if (Array.isArray(r.data)) return r.data as LooseRecord[]
  const combined: LooseRecord[] = []
  for (const key of ["activeIpo", "upcomingIpo", "issues", "result"]) {
    const v = r[key]
    if (Array.isArray(v)) combined.push(...(v as LooseRecord[]))
  }
  return combined
}

export async function scrapeNSESubscription(
  ipo: IpoInput
): Promise<NseSubscription | null> {
  const symbol = ipo.nse_symbol?.trim()
  if (!symbol) return null

  try {
    // Endpoint 1: current issues list (covers most open IPOs).
    const list = await fetchNseApi<unknown>("/api/ipo-current-issue")
    const rows = extractRows(list)
    const match = findMatchingRow(rows, symbol)
    if (match) {
      const parsed = parseRow(match)
      if (parsed) return parsed
    }

    // Endpoint 2: detail endpoint, one symbol at a time.
    const detail = await fetchNseApi<unknown>("/api/ipo-detail", {
      query: { symbol },
    })
    if (detail) {
      const detailRows = extractRows(detail)
      const detailMatch =
        findMatchingRow(detailRows, symbol) ?? (detail as LooseRecord)
      const parsed = parseRow(detailMatch)
      if (parsed) return parsed
    }

    return null
  } catch (err) {
    console.error("[v0] scrapeNSESubscription error:", err)
    return null
  }
}
