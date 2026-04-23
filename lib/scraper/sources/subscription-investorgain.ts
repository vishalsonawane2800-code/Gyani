// lib/scraper/sources/subscription-investorgain.ts
// Primary subscription scraper for InvestorGain's dedicated subscription pages.
// InvestorGain maintains real-time subscription data with cleaner, simpler markup.
//
// Contract: NEVER throws. Returns `null` on any failure.
//
// URL format: https://www.investorgain.com/subscription/{slug}/{id}/
// Data extraction:
//   1. Title contains "Total: X times" in the page metadata
//   2. Status badge shows "Open", "Closed", etc.
//   3. Subscription multiplier is cleanly formatted without table ambiguity

import * as cheerio from "cheerio"
import { fetchWithRetry } from "../base"
import { parseSubscriptionTimes } from "@/lib/scraper/parsers"

export type InvestorGainSubscription = {
  total: number | null
  status: "open" | "closed" | null
}

type IpoInput = {
  investorgain_sub_url?: string | null
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const DESKTOP_HEADERS: Record<string, string> = {
  "User-Agent": UA,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
}

const FETCH_TIMEOUT_MS = 15_000

/**
 * Extract subscription times from page title or metadata.
 * Expected format: "Adisoft Technologies SME Live Subscription. Total: 1.45 times."
 */
function extractSubscriptionFromMeta(
  $: cheerio.CheerioAPI
): number | null {
  const title = $("title").text()
  const ogName = $('meta[property="og:title"]').attr("content")
  const description = $('meta[name="description"]').attr("content")
  const ogDesc = $('meta[property="og:description"]').attr("content")

  const allText = [title, ogName, description, ogDesc].join(" ")

  // Match patterns like "Total: 1.45 times" or "Total: 1.45x"
  const m = allText.match(/Total:\s*([\d.]+)\s*(?:times|x)/i)
  if (!m) return null

  return parseSubscriptionTimes(m[1])
}

/**
 * Extract status from the status badge on the page.
 * Expected: badge with text "Open" or "Closed"
 */
function extractStatus($: cheerio.CheerioAPI): "open" | "closed" | null {
  // Look for badge elements with Open/Closed text
  const badges = $(".badge, [class*='badge'], span[class*='bg-']").toArray()

  for (const badge of badges) {
    const text = $(badge).text().trim().toLowerCase()
    if (text === "open") return "open"
    if (text === "closed") return "closed"
  }

  // Fallback: check all text nodes
  const pageText = $("body").text().toLowerCase()
  if (/status[:\s]+open\b/.test(pageText)) return "open"
  if (/status[:\s]+closed\b/.test(pageText)) return "closed"

  return null
}

/**
 * Scrape subscription data from InvestorGain's subscription page.
 * Handles BOTH direct InvestorGain URLs and fallback scenarios.
 */
export async function scrapeInvestorGainSubscription(
  ipo: IpoInput
): Promise<InvestorGainSubscription | null> {
  try {
    if (!ipo.investorgain_sub_url) {
      console.log("[v0] No investorgain_sub_url provided")
      return null
    }

    const response = await fetchWithRetry(
      ipo.investorgain_sub_url,
      {
        headers: DESKTOP_HEADERS,
        timeout: FETCH_TIMEOUT_MS,
      }
    )

    if (!response.ok) {
      console.log(
        "[v0] InvestorGain subscription fetch failed: status",
        response.status
      )
      return null
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    const total = extractSubscriptionFromMeta($)
    const status = extractStatus($)

    console.log(
      "[v0] InvestorGain subscription scraped:",
      { total, status, url: ipo.investorgain_sub_url }
    )

    // Return result even if status is null (total might be present)
    return { total, status }
  } catch (err) {
    console.error("[v0] scrapeInvestorGainSubscription error:", err)
    return null
  }
}
