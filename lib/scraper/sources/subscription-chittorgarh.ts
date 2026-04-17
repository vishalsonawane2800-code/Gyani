// lib/scraper/sources/subscription-chittorgarh.ts
// Fallback subscription scraper using Chittorgarh's public IPO pages.
// Uses the stored `chittorgarh_url` if available, otherwise builds a slug
// from `company_name`.
//
// Contract: NEVER throws. Returns `null` on any failure.

import * as cheerio from "cheerio"
import { parseSubscriptionTimes } from "@/lib/scraper/parsers"

export type ChittorgarhSubscription = {
  total: number | null
  retail: number | null
  nii: number | null
  qib: number | null
}

type IpoInput = {
  chittorgarh_url: string | null
  company_name: string | null
  slug?: string | null
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const FETCH_TIMEOUT_MS = 15_000

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\b(limited|ltd|pvt|private)\b\.?/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function candidateUrls(ipo: IpoInput): string[] {
  const urls: string[] = []
  if (ipo.chittorgarh_url && /^https?:\/\//i.test(ipo.chittorgarh_url)) {
    urls.push(ipo.chittorgarh_url)
  }
  const baseName = ipo.slug || ipo.company_name
  if (baseName) {
    const s = slugify(baseName)
    if (s) {
      // Chittorgarh commonly uses `/ipo/<slug>-ipo/<id>.html` but without
      // the numeric ID we can only try the canonical search-style URL.
      urls.push(`https://www.chittorgarh.com/ipo/${s}-ipo/`)
    }
  }
  return urls
}

function categorize(label: string): keyof ChittorgarhSubscription | null {
  const l = label.toLowerCase().trim()
  if (/qualified[- ]?institutional|\bqib\b/i.test(l)) return "qib"
  if (/non[- ]?institutional|\bnii\b|\bhni\b/i.test(l)) return "nii"
  if (/retail|\brii\b|individual/i.test(l)) return "retail"
  if (/total|overall|aggregate/i.test(l)) return "total"
  return null
}

function extractTimes(cells: string[]): number | null {
  for (let i = cells.length - 1; i >= 0; i--) {
    const n = parseSubscriptionTimes(cells[i])
    if (n != null && n >= 0) return n
  }
  return null
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      cache: "no-store",
      signal: controller.signal,
    })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

function parseFromHtml(html: string): ChittorgarhSubscription | null {
  try {
    const $ = cheerio.load(html)
    const out: ChittorgarhSubscription = {
      total: null,
      retail: null,
      nii: null,
      qib: null,
    }

    $("table").each((_, tbl) => {
      $(tbl)
        .find("tr")
        .each((_i, tr) => {
          const cells: string[] = []
          $(tr)
            .find("td, th")
            .each((_j, el) => {
              cells.push($(el).text().replace(/\s+/g, " ").trim())
            })
          if (cells.length < 2) return
          const cat = categorize(cells[0])
          if (!cat) return
          if (out[cat] != null) return
          const times = extractTimes(cells.slice(1))
          if (times != null) out[cat] = times
        })
    })

    const anyFound =
      out.total != null ||
      out.retail != null ||
      out.nii != null ||
      out.qib != null
    return anyFound ? out : null
  } catch (err) {
    console.error("[v0] Chittorgarh parse error:", err)
    return null
  }
}

export async function scrapeChittorgarhSubscription(
  ipo: IpoInput
): Promise<ChittorgarhSubscription | null> {
  const urls = candidateUrls(ipo)
  for (const url of urls) {
    const html = await fetchHtml(url)
    if (!html) continue
    const parsed = parseFromHtml(html)
    if (parsed) return parsed
  }
  return null
}
