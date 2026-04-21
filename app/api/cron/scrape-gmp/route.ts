// app/api/cron/scrape-gmp/route.ts
// Multi-source GMP scraper. Averages GMP across active sources. Writes one
// row per IPO per change to gmp_history and updates the ipos table's
// gmp / gmp_last_updated / gmp_sources_used.
//
// Active sources (2026-04-20):
//   - IPOWatch   (listing page, per-IPO article URL override supported)
//   - ipoji      (listing page; replacement for InvestorGain/IPOCentral)
//
// Disabled sources (verified dead from Vercel egress — see ai_ref/SCRAPER_CONTEXT.md):
//   - InvestorGain: client-rendered SPA, no data in server HTML
//   - IPOCentral:   Cloudflare WAF returns 403 for all cloud IPs
//
// We still SELECT `investorgain_gmp_url` and `ipocentral_gmp_url` from `ipos`
// so admin debug logs/forms remain intact, but those URLs are intentionally
// ignored by the live cloud scraper pipeline.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cacheGet, cacheSet } from "@/lib/redis"
import {
  logScraperRun,
  circuitBreakerCheck,
  circuitBreakerRecordFailure,
} from "@/lib/scraper/base"
import { scrapeIPOWatchGMP } from "@/lib/scraper/sources/gmp-ipowatch"
import { scrapeIpojiGMP } from "@/lib/scraper/sources/gmp-ipoji"

export const runtime = "nodejs"
export const maxDuration = 60

const GMP_CACHE_TTL_SECONDS = 900 // 15 min
const SCRAPER_NAME = "scrape-gmp"

type IpoRow = {
  id: number
  slug: string
  company_name: string | null
  name: string | null
  price_max: number | null
  status: string
  listing_date: string | null
  investorgain_gmp_url: string | null
  ipowatch_gmp_url: string | null
  ipocentral_gmp_url: string | null
}

type SourceKey = "ipowatch_listing" | "ipowatch_article" | "ipoji"

type SourceOutcome = {
  source: SourceKey
  gmp: number | null
  cached: boolean
  skipped: boolean
  url: string
  error?: string
}

type ScrapeIpoInput = Omit<IpoRow, "company_name"> & { company_name: string }

const SOURCES: {
  key: SourceKey
  scrape: (ipo: ScrapeIpoInput) => Promise<{ gmp: number } | null>
  getUrl: (ipo: ScrapeIpoInput) => string
  availability: (ipo: ScrapeIpoInput) => { run: boolean; reason?: "no_url_configured" }
}[] = [
  {
    key: "ipowatch_listing",
    scrape: (ipo) => scrapeIPOWatchGMP({ ...ipo, ipowatch_gmp_url: null }),
    getUrl: (ipo) =>
      "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/",
    availability: () => ({ run: true }),
  },
  {
    key: "ipowatch_article",
    scrape: (ipo) => scrapeIPOWatchGMP(ipo),
    getUrl: (ipo) => ipo.ipowatch_gmp_url || "",
    availability: (ipo) => {
      if (!ipo.ipowatch_gmp_url) return { run: false, reason: "no_url_configured" }
      return { run: true }
    },
  },
  {
    key: "ipoji",
    scrape: (ipo) => scrapeIpojiGMP(ipo),
    getUrl: () => "https://ipoji.com/grey-market-premium-ipo-gmp-today.html",
    availability: () => ({ run: true }),
  },
]

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function randomStagger(): number {
  return 500 + Math.floor(Math.random() * 1000) // 500 - 1500ms
}

/**
 * Scrape a single source with Redis caching and circuit-breaker checks.
 */
async function scrapeOneSource(
  ipo: ScrapeIpoInput,
  src: (typeof SOURCES)[number]
): Promise<SourceOutcome> {
  const cacheKey = `gmp:${src.key}:${ipo.slug}`
  const sourceUrl = src.getUrl(ipo)
  const availability = src.availability(ipo)

  if (!availability.run) {
    return {
      source: src.key,
      gmp: null,
      cached: false,
      skipped: true,
      url: sourceUrl || "-",
      error: availability.reason,
    }
  }

  try {
    // Circuit breaker
    const ok = await circuitBreakerCheck(`gmp-${src.key}`)
    if (!ok) {
      return {
        source: src.key,
        gmp: null,
        cached: false,
        skipped: true,
        url: sourceUrl,
        error: "circuit_open",
      }
    }

    // Cache
    const cached = await cacheGet<number>(cacheKey)
    if (cached !== null && typeof cached === "number") {
      return { source: src.key, gmp: cached, cached: true, skipped: false, url: sourceUrl }
    }

    const result = await src.scrape(ipo)
    if (result && typeof result.gmp === "number") {
      await cacheSet(cacheKey, result.gmp, GMP_CACHE_TTL_SECONDS)
      return {
        source: src.key,
        gmp: result.gmp,
        cached: false,
        skipped: false,
        url: sourceUrl,
      }
    }

    // No data (not a failure per se, but count as one for circuit breaker)
    return {
      source: src.key,
      gmp: null,
      cached: false,
      skipped: false,
      url: sourceUrl,
      error: "no_data",
    }
  } catch (err) {
    await circuitBreakerRecordFailure(`gmp-${src.key}`)
    const msg = err instanceof Error ? err.message : String(err)
    return {
      source: src.key,
      gmp: null,
      cached: false,
      skipped: false,
      url: sourceUrl,
      error: msg,
    }
  }
}

/**
 * Average valid GMP values across sources; returns null if none.
 */
function averageGMP(outcomes: SourceOutcome[]): {
  gmp: number | null
  used: SourceKey[]
} {
  const valid = outcomes.filter(
    (o) => o.gmp !== null && typeof o.gmp === "number"
  ) as (SourceOutcome & { gmp: number })[]

  // IPOWatch can now contribute via both:
  // - listing constant URL
  // - per-IPO article URL
  // Avoid double-weighting the same website by preferring article over listing.
  const nonIpoWatch = valid.filter(
    (v) => v.source !== "ipowatch_listing" && v.source !== "ipowatch_article"
  )
  const ipowatchArticle = valid.find((v) => v.source === "ipowatch_article")
  const ipowatchListing = valid.find((v) => v.source === "ipowatch_listing")
  const ipowatchChosen = ipowatchArticle ?? ipowatchListing

  const deduped = ipowatchChosen ? [...nonIpoWatch, ipowatchChosen] : nonIpoWatch

  if (deduped.length === 0) return { gmp: null, used: [] }

  const sum = deduped.reduce((acc, o) => acc + o.gmp, 0)
  const avg = Math.round((sum / deduped.length) * 100) / 100
  return { gmp: avg, used: deduped.map((v) => v.source) }
}

/**
 * Process a single IPO: scrape each allowed source in parallel, dedup,
 * and persist results.
 */
export async function processIpoGMP(ipo: IpoRow): Promise<{
  inserted: boolean
  skipped: boolean
  failed: boolean
  outcomes: SourceOutcome[]
  averagedGMP: number | null
  sourcesUsed: SourceKey[]
  error?: string
}> {
  const supabase = createAdminClient()

  // Legacy rows can have `company_name` unset while `name` is populated.
  // Resolve once here so downstream source scrapers always receive a stable
  // display name for matching.
  const companyName = (ipo.company_name || ipo.name || "").trim()
  if (!companyName) {
    return {
      inserted: false,
      skipped: false,
      failed: true,
      outcomes: [],
      averagedGMP: null,
      sourcesUsed: [],
      error: "missing_company_name",
    }
  }

  const ipoForScrape: ScrapeIpoInput = {
    ...ipo,
    company_name: companyName,
  }

  const outcomes = await Promise.all(
    SOURCES.map((src) => scrapeOneSource(ipoForScrape, src))
  )

  const { gmp: averagedGMP, used: sourcesUsed } = averageGMP(outcomes)

  if (averagedGMP === null) {
    // Distinguish "no scraper errored, this IPO just isn't on either listing"
    // (expected for brand-new / already-listed IPOs) from a real failure.
    // "no_data" and "circuit_open" are non-error outcomes; anything else
    // (HTTP errors, timeouts, parse exceptions) is a real failure.
    const NON_ERROR_REASONS = new Set([
      "no_data",
      "circuit_open",
      "no_url_configured",
    ])
    const realErrors = outcomes.filter(
      (o) => o.error && !NON_ERROR_REASONS.has(o.error),
    )
    const allCleanNoData = realErrors.length === 0

    if (allCleanNoData) {
      return {
        inserted: false,
        skipped: true, // treat as a clean "nothing to record" skip
        failed: false,
        outcomes,
        averagedGMP: null,
        sourcesUsed: [],
        error: "no_data_on_sources",
      }
    }

    const errDetail = realErrors
      .map((o) => `${o.source}:${o.error}`)
      .join("; ")
    return {
      inserted: false,
      skipped: false,
      failed: true,
      outcomes,
      averagedGMP: null,
      sourcesUsed: [],
      error: `source_errors: ${errDetail}`,
    }
  }

  // Dedup: compare to latest gmp_history row
  const { data: latest } = await supabase
    .from("gmp_history")
    .select("gmp")
    .eq("ipo_id", ipo.id)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latest && typeof latest.gmp === "number" && latest.gmp === averagedGMP) {
    // Still bump gmp_last_updated so we know we checked recently
    const now = new Date().toISOString()
    await supabase
      .from("ipos")
      .update({ gmp_last_updated: now, gmp_sources_used: sourcesUsed })
      .eq("id", ipo.id)
    return {
      inserted: false,
      skipped: true,
      failed: false,
      outcomes,
      averagedGMP,
      sourcesUsed,
    }
  }

  // Insert new history row
  const now = new Date().toISOString()
  const today = now.split("T")[0]
  const gmpPercent =
    ipo.price_max && ipo.price_max > 0
      ? Math.round((averagedGMP / ipo.price_max) * 100 * 10) / 10
      : null

  const sourceLabel = `averaged(${sourcesUsed.join(",")})`

  // gmp_history has UNIQUE(ipo_id, date); upsert to respect that constraint
  // while still tracking changes via recorded_at.
  const { error: insertErr } = await supabase.from("gmp_history").upsert(
    {
      ipo_id: ipo.id,
      gmp: averagedGMP,
      gmp_percent: gmpPercent,
      date: today,
      source: sourceLabel,
      recorded_at: now,
    },
    { onConflict: "ipo_id,date", ignoreDuplicates: false }
  )

  if (insertErr) {
    return {
      inserted: false,
      skipped: false,
      failed: true,
      outcomes,
      averagedGMP,
      sourcesUsed,
      error: insertErr.message,
    }
  }

  const { error: updateErr } = await supabase
    .from("ipos")
    .update({
      gmp: averagedGMP,
      gmp_last_updated: now,
      gmp_sources_used: sourcesUsed,
    })
    .eq("id", ipo.id)

  if (updateErr) {
    return {
      inserted: true,
      skipped: false,
      failed: true,
      outcomes,
      averagedGMP,
      sourcesUsed,
      error: updateErr.message,
    }
  }

  return {
    inserted: true,
    skipped: false,
    failed: false,
    outcomes,
    averagedGMP,
    sourcesUsed,
  }
}

/**
 * Core GMP scraper pipeline. Exported so the dispatcher cron and admin
 * manual-trigger route can call it directly without an HTTP hop.
 * Always writes exactly one `scraper_health` row and never throws.
 */
export async function runGmpScraper(): Promise<{
  processed: number
  inserted: number
  skipped: number
  failed: number
  no_data?: number
  duration_ms: number
  error?: string
}> {
  const started = Date.now()
  const supabase = createAdminClient()
  const todayIso = new Date().toISOString().split("T")[0]

  const { data: ipos, error } = await supabase
    .from("ipos")
    .select(
      "id, slug, company_name, name, price_max, status, listing_date, investorgain_gmp_url, ipowatch_gmp_url, ipocentral_gmp_url"
    )
    .in("status", ["upcoming", "open", "lastday", "closed", "allot", "listing"])
    .or(`listing_date.is.null,listing_date.gte.${todayIso}`)

  if (error) {
    const duration = Date.now() - started
    await logScraperRun({
      scraperName: SCRAPER_NAME,
      status: "failed",
      errorMessage: error.message,
      durationMs: duration,
    })
    return {
      processed: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      duration_ms: duration,
      error: error.message,
    }
  }

  const rows = (ipos || []) as IpoRow[]
  let inserted = 0
  let skipped = 0
  let failed = 0
  let noData = 0
  const sourceStats: Record<
    SourceKey,
    {
      values: number
      no_data: number
      errors: number
      cached: number
      circuit_open: number
      no_url: number
    }
  > = {
    ipowatch_listing: {
      values: 0,
      no_data: 0,
      errors: 0,
      cached: 0,
      circuit_open: 0,
      no_url: 0,
    },
    ipowatch_article: {
      values: 0,
      no_data: 0,
      errors: 0,
      cached: 0,
      circuit_open: 0,
      no_url: 0,
    },
    ipoji: {
      values: 0,
      no_data: 0,
      errors: 0,
      cached: 0,
      circuit_open: 0,
      no_url: 0,
    },
  }
  const sourceDebugSamples: string[] = []
  // Track first few failure + no-data details so the admin dashboard can
  // show WHICH IPO (and WHICH source) actually broke, instead of just a bare
  // "Failed 1/1" count.
  const failureDetails: string[] = []
  const noDataSlugs: string[] = []

  for (const ipo of rows) {
    try {
      const res = await processIpoGMP(ipo)
      if (sourceDebugSamples.length < 8) {
        const sample = res.outcomes
          .map((o) => {
            const status = o.gmp !== null
              ? `${o.gmp}${o.cached ? " (cached)" : ""}`
              : o.error || "no_data"
            return `${o.source}=${status} @ ${o.url}`
          })
          .join(" | ")
        sourceDebugSamples.push(`${ipo.slug}: ${sample || "no_sources"}`)
      }
      for (const o of res.outcomes) {
        if (o.gmp !== null) sourceStats[o.source].values++
        if (o.cached) sourceStats[o.source].cached++
        if (o.error === "no_data") sourceStats[o.source].no_data++
        else if (o.error === "circuit_open") sourceStats[o.source].circuit_open++
        else if (o.error === "no_url_configured") sourceStats[o.source].no_url++
        else if (o.error) sourceStats[o.source].errors++
      }
      if (res.inserted) inserted++
      if (res.skipped) {
        skipped++
        if (res.error === "no_data_on_sources") {
          noData++
          if (noDataSlugs.length < 5) noDataSlugs.push(ipo.slug)
        }
      }
      if (res.failed) {
        failed++
        if (failureDetails.length < 5 && res.error) {
          failureDetails.push(`${ipo.slug}: ${res.error}`)
        }
      }
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      if (failureDetails.length < 5) {
        failureDetails.push(`${ipo.slug}: threw ${msg}`)
      }
      console.error("[v0] processIpoGMP threw:", err)
    }
    await sleep(randomStagger())
  }

  const duration = Date.now() - started
  const status: "success" | "failed" = failed === 0 ? "success" : "failed"

  let errorMessage: string | null = null
  const sourceStatsText = Object.entries(sourceStats)
    .map(([k, s]) =>
      `${k}[values:${s.values}, no_data:${s.no_data}, errors:${s.errors}, cached:${s.cached}, circuit_open:${s.circuit_open}, no_url:${s.no_url}]`
    )
    .join(" | ")
  if (failed > 0) {
    errorMessage =
      `Failed ${failed}/${rows.length} (inserted ${inserted}, skipped ${skipped}` +
      (noData > 0 ? `, no_data ${noData}` : "") +
      `). ` +
      failureDetails.join(" | ") +
      ` || source_stats: ${sourceStatsText}` +
      (sourceDebugSamples.length > 0
        ? ` || source_samples: ${sourceDebugSamples.join(" || ")}`
        : "")
  } else if (noData > 0 && inserted === 0) {
    // Run succeeded but recorded nothing because every IPO in the window
    // was absent from all GMP sources. Surface this in the message so
    // "0 inserted" is explained — not treated as a failure.
    errorMessage =
      `No GMP data yet on sources for ${noData}/${rows.length} IPOs: ${noDataSlugs.join(", ")}` +
      ` || source_stats: ${sourceStatsText}` +
      (sourceDebugSamples.length > 0
        ? ` || source_samples: ${sourceDebugSamples.join(" || ")}`
        : "")
  } else {
    // Keep successful runs debuggable from /admin/automation -> Recent Runs.
    errorMessage =
      `source_stats: ${sourceStatsText}` +
      (sourceDebugSamples.length > 0
        ? ` || source_samples: ${sourceDebugSamples.join(" || ")}`
        : "")
  }

  await logScraperRun({
    scraperName: SCRAPER_NAME,
    status,
    itemsProcessed: rows.length,
    durationMs: duration,
    errorMessage,
  })

  return {
    processed: rows.length,
    inserted,
    skipped,
    failed,
    no_data: noData,
    duration_ms: duration,
  }
}

export async function GET(_request: Request) {
  const result = await runGmpScraper()
  return NextResponse.json(result)
}
