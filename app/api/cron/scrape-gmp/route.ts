// app/api/cron/scrape-gmp/route.ts
// Multi-source GMP scraper. Averages GMP across InvestorGain, IPOWatch,
// and IPOCentral. Writes one row per IPO per change to gmp_history and
// updates the ipos table's gmp / gmp_last_updated / gmp_sources_used.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cacheGet, cacheSet } from "@/lib/redis"
import {
  verifyCronAuth,
  cronUnauthorized,
  logScraperRun,
  circuitBreakerCheck,
  circuitBreakerRecordFailure,
} from "@/lib/scraper/base"
import { scrapeInvestorGainGMP } from "@/lib/scraper/sources/gmp-investorgain"
import { scrapeIPOWatchGMP } from "@/lib/scraper/sources/gmp-ipowatch"
import { scrapeIPOCentralGMP } from "@/lib/scraper/sources/gmp-ipocentral"

export const runtime = "nodejs"
export const maxDuration = 60

const GMP_CACHE_TTL_SECONDS = 900 // 15 min
const SCRAPER_NAME = "scrape-gmp"

type IpoRow = {
  id: number
  slug: string
  company_name: string
  price_max: number | null
  status: string
  listing_date: string | null
  investorgain_gmp_url: string | null
  ipowatch_gmp_url: string | null
  ipocentral_gmp_url: string | null
}

type SourceKey = "investorgain" | "ipowatch" | "ipocentral"

type SourceOutcome = {
  source: SourceKey
  gmp: number | null
  cached: boolean
  skipped: boolean
  error?: string
}

const SOURCES: {
  key: SourceKey
  scrape: (ipo: IpoRow) => Promise<{ gmp: number } | null>
}[] = [
  { key: "investorgain", scrape: (ipo) => scrapeInvestorGainGMP(ipo) },
  { key: "ipowatch", scrape: (ipo) => scrapeIPOWatchGMP(ipo) },
  { key: "ipocentral", scrape: (ipo) => scrapeIPOCentralGMP(ipo) },
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
  ipo: IpoRow,
  src: (typeof SOURCES)[number]
): Promise<SourceOutcome> {
  const cacheKey = `gmp:${src.key}:${ipo.slug}`

  try {
    // Circuit breaker
    const ok = await circuitBreakerCheck(`gmp-${src.key}`)
    if (!ok) {
      return { source: src.key, gmp: null, cached: false, skipped: true, error: "circuit_open" }
    }

    // Cache
    const cached = await cacheGet<number>(cacheKey)
    if (cached !== null && typeof cached === "number") {
      return { source: src.key, gmp: cached, cached: true, skipped: false }
    }

    const result = await src.scrape(ipo)
    if (result && typeof result.gmp === "number") {
      await cacheSet(cacheKey, result.gmp, GMP_CACHE_TTL_SECONDS)
      return { source: src.key, gmp: result.gmp, cached: false, skipped: false }
    }

    // No data (not a failure per se, but count as one for circuit breaker)
    return { source: src.key, gmp: null, cached: false, skipped: false, error: "no_data" }
  } catch (err) {
    await circuitBreakerRecordFailure(`gmp-${src.key}`)
    const msg = err instanceof Error ? err.message : String(err)
    return { source: src.key, gmp: null, cached: false, skipped: false, error: msg }
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

  if (valid.length === 0) return { gmp: null, used: [] }

  const sum = valid.reduce((acc, o) => acc + o.gmp, 0)
  const avg = Math.round((sum / valid.length) * 100) / 100
  return { gmp: avg, used: valid.map((v) => v.source) }
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

  const outcomes = await Promise.all(
    SOURCES.map((src) => scrapeOneSource(ipo, src))
  )

  const { gmp: averagedGMP, used: sourcesUsed } = averageGMP(outcomes)

  if (averagedGMP === null) {
    return {
      inserted: false,
      skipped: false,
      failed: true,
      outcomes,
      averagedGMP: null,
      sourcesUsed: [],
      error: "no_valid_source",
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

export async function GET(request: Request) {
  const started = Date.now()

  if (!verifyCronAuth(request)) {
    return cronUnauthorized()
  }

  const supabase = createAdminClient()
  const todayIso = new Date().toISOString().split("T")[0]

  const { data: ipos, error } = await supabase
    .from("ipos")
    .select(
      "id, slug, company_name, price_max, status, listing_date, investorgain_gmp_url, ipowatch_gmp_url, ipocentral_gmp_url"
    )
    .in("status", ["upcoming", "open", "lastday", "closed", "allot", "listing"])
    .or(`listing_date.is.null,listing_date.gte.${todayIso}`)

  if (error) {
    await logScraperRun({
      scraperName: SCRAPER_NAME,
      status: "failed",
      errorMessage: error.message,
      durationMs: Date.now() - started,
    })
    return NextResponse.json(
      { error: "Failed to fetch IPOs", details: error.message },
      { status: 500 }
    )
  }

  const rows = (ipos || []) as IpoRow[]
  let inserted = 0
  let skipped = 0
  let failed = 0

  for (const ipo of rows) {
    try {
      const res = await processIpoGMP(ipo)
      if (res.inserted) inserted++
      if (res.skipped) skipped++
      if (res.failed) failed++
    } catch (err) {
      failed++
      console.error("[v0] processIpoGMP threw:", err)
    }
    await sleep(randomStagger())
  }

  const duration = Date.now() - started
  // scraper_health CHECK constraint only allows success|failed|skipped.
  // Treat any failure count > 0 as a failed run (with error detail).
  const status: "success" | "failed" = failed === 0 ? "success" : "failed"

  await logScraperRun({
    scraperName: SCRAPER_NAME,
    status,
    itemsProcessed: rows.length,
    durationMs: duration,
    errorMessage:
      failed > 0 ? `Failed ${failed}/${rows.length} (inserted ${inserted}, skipped ${skipped})` : null,
  })

  return NextResponse.json({
    processed: rows.length,
    inserted,
    skipped,
    failed,
    duration_ms: duration,
  })
}
