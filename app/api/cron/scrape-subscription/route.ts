// app/api/cron/scrape-subscription/route.ts
// Subscription scraper orchestrator.
//
// Source routing (primary -> fallback):
//   Mainboard / NSE SME -> NSE API  -> Chittorgarh
//   BSE SME             -> BSE page -> Chittorgarh
//
// Key behaviours:
//   - Redis cache per-IPO (`subscription:<id>`) for 5 min to avoid
//     hammering sources across back-to-back cron ticks.
//   - Dedup: skip insert into subscription_history if the latest row
//     for this IPO has identical total/retail/nii/qib.
//   - Writes a `scraper_health` row once per cron run.
//   - Auth handled by middleware.ts (JWT) + optional CRON_SECRET check.
//   - NEVER throws out of per-IPO processing; one bad IPO can't fail
//     the whole run.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { cacheGet, cacheSet } from "@/lib/redis"
import { logScraperRun } from "@/lib/scraper/base"
import { scrapeNSESubscription } from "@/lib/scraper/sources/subscription-nse"
import { scrapeBSESubscription } from "@/lib/scraper/sources/subscription-bse"
import { scrapeChittorgarhSubscription } from "@/lib/scraper/sources/subscription-chittorgarh"

export const runtime = "nodejs"
export const maxDuration = 60

const SCRAPER_NAME = "scrape-subscription"
const CACHE_TTL_SECONDS = 300 // 5 min

type IpoRow = {
  id: number
  company_name: string
  slug: string
  exchange: string | null
  status: string
  nse_symbol: string | null
  bse_scrip_code: string | null
  chittorgarh_url: string | null
}

type SourceKey = "nse" | "bse" | "chittorgarh"

export type SubscriptionSnapshot = {
  total: number | null
  retail: number | null
  nii: number | null
  qib: number | null
}

export type ProcessResult = {
  ipo_id: number
  company_name: string
  source: SourceKey | null
  snapshot: SubscriptionSnapshot | null
  inserted: boolean
  skipped: boolean
  cached: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function exchangeOrder(exchange: string | null): SourceKey[] {
  if (exchange === "BSE SME") return ["bse", "chittorgarh"]
  // Mainboard, REIT, NSE SME all prefer NSE.
  return ["nse", "chittorgarh"]
}

async function runSource(
  source: SourceKey,
  ipo: IpoRow
): Promise<SubscriptionSnapshot | null> {
  try {
    if (source === "nse") {
      return await scrapeNSESubscription({ nse_symbol: ipo.nse_symbol })
    }
    if (source === "bse") {
      return await scrapeBSESubscription({
        bse_scrip_code: ipo.bse_scrip_code,
      })
    }
    return await scrapeChittorgarhSubscription({
      chittorgarh_url: ipo.chittorgarh_url,
      company_name: ipo.company_name,
      slug: ipo.slug,
    })
  } catch (err) {
    console.error(`[v0] ${source} source threw for ${ipo.slug}:`, err)
    return null
  }
}

function snapshotsEqual(
  a: SubscriptionSnapshot,
  b: { retail: number | null; nii: number | null; qib: number | null; total: number | null }
): boolean {
  const eq = (x: number | null, y: number | null) => {
    if (x == null && y == null) return true
    if (x == null || y == null) return false
    return Math.abs(x - y) < 0.005
  }
  return eq(a.total, b.total) && eq(a.retail, b.retail) && eq(a.nii, b.nii) && eq(a.qib, b.qib)
}

function hasAnyValue(s: SubscriptionSnapshot | null): s is SubscriptionSnapshot {
  if (!s) return false
  return s.total != null || s.retail != null || s.nii != null || s.qib != null
}

// ---------------------------------------------------------------------------
// Per-IPO processor — exported so the admin manual-trigger route can reuse it.
// ---------------------------------------------------------------------------

export async function processIpoSubscription(
  ipo: IpoRow
): Promise<ProcessResult> {
  const supabase = createAdminClient()
  const cacheKey = `subscription:${ipo.id}`

  // Redis short-circuit.
  const cached = await cacheGet<{ source: SourceKey; snapshot: SubscriptionSnapshot }>(
    cacheKey
  )
  if (cached && hasAnyValue(cached.snapshot)) {
    return {
      ipo_id: ipo.id,
      company_name: ipo.company_name,
      source: cached.source,
      snapshot: cached.snapshot,
      inserted: false,
      skipped: true,
      cached: true,
    }
  }

  const order = exchangeOrder(ipo.exchange)
  let chosen: { source: SourceKey; snapshot: SubscriptionSnapshot } | null = null

  for (const src of order) {
    // Skip sources that obviously can't work for this IPO.
    if (src === "nse" && !ipo.nse_symbol) continue
    if (src === "bse" && !ipo.bse_scrip_code) continue

    const snap = await runSource(src, ipo)
    if (hasAnyValue(snap)) {
      chosen = { source: src, snapshot: snap }
      break
    }
  }

  if (!chosen) {
    return {
      ipo_id: ipo.id,
      company_name: ipo.company_name,
      source: null,
      snapshot: null,
      inserted: false,
      skipped: false,
      cached: false,
      error: "All sources returned no data",
    }
  }

  // Dedup against the most recent subscription_history row.
  const { data: latest } = await supabase
    .from("subscription_history")
    .select("total, retail, nii, qib")
    .eq("ipo_id", ipo.id)
    .order("date", { ascending: false })
    .order("time", { ascending: false })
    .limit(1)
    .maybeSingle()

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const mins = now.getMinutes() < 30 ? "00" : "30"
  const timeSlot = `${String(now.getHours()).padStart(2, "0")}:${mins}`

  let inserted = false
  let skipped = false

  if (
    latest &&
    snapshotsEqual(chosen.snapshot, {
      total: toNumOrNull(latest.total),
      retail: toNumOrNull(latest.retail),
      nii: toNumOrNull(latest.nii),
      qib: toNumOrNull(latest.qib),
    })
  ) {
    skipped = true
  } else {
    // Upsert respects UNIQUE(ipo_id, date, time).
    const { error: histErr } = await supabase
      .from("subscription_history")
      .upsert(
        {
          ipo_id: ipo.id,
          date: today,
          time: timeSlot,
          retail: chosen.snapshot.retail ?? 0,
          nii: chosen.snapshot.nii ?? 0,
          qib: chosen.snapshot.qib ?? 0,
          total: chosen.snapshot.total ?? 0,
          updated_at: now.toISOString(),
        },
        { onConflict: "ipo_id,date,time", ignoreDuplicates: false }
      )
    if (histErr) {
      console.error(`[v0] subscription_history upsert failed for ${ipo.slug}:`, histErr.message)
    } else {
      inserted = true
    }
  }

  // Always update ipos with the latest numbers + source + timestamp,
  // even when the history row is deduped (keeps `subscription_last_scraped`
  // fresh so the UI shows "Updated X min ago").
  const { error: ipoErr } = await supabase
    .from("ipos")
    .update({
      subscription_total: chosen.snapshot.total,
      subscription_retail: chosen.snapshot.retail,
      subscription_nii: chosen.snapshot.nii,
      subscription_qib: chosen.snapshot.qib,
      subscription_source: chosen.source,
      subscription_last_scraped: now.toISOString(),
    })
    .eq("id", ipo.id)

  if (ipoErr) {
    console.error(`[v0] ipos update failed for ${ipo.slug}:`, ipoErr.message)
  }

  // Cache the snapshot so subsequent runs within the TTL can short-circuit.
  await cacheSet(cacheKey, chosen, CACHE_TTL_SECONDS)

  return {
    ipo_id: ipo.id,
    company_name: ipo.company_name,
    source: chosen.source,
    snapshot: chosen.snapshot,
    inserted,
    skipped,
    cached: false,
  }
}

function toNumOrNull(v: unknown): number | null {
  if (v == null) return null
  const n = typeof v === "number" ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

// ---------------------------------------------------------------------------
// GET / POST handler
// ---------------------------------------------------------------------------

/**
 * Core subscription scraper pipeline. Exported so the dispatcher and admin
 * manual-trigger route can invoke it without an HTTP hop. Always logs one
 * `scraper_health` row and never throws.
 */
export async function runSubscriptionScraper(): Promise<{
  processed: number
  inserted: number
  skipped: number
  failed: number
  duration_ms: number
  by_source: Record<string, number>
  error?: string
}> {
  const started = Date.now()
  const supabase = createAdminClient()

  // Window: status in (open|lastday|closed) AND close_date >= today - 3d.
  const threshold = new Date()
  threshold.setDate(threshold.getDate() - 3)
  const thresholdIso = threshold.toISOString().slice(0, 10)

  const { data: ipos, error: fetchErr } = await supabase
    .from("ipos")
    .select(
      "id, company_name, slug, exchange, status, nse_symbol, bse_scrip_code, chittorgarh_url, close_date"
    )
    .in("status", ["open", "lastday", "closed"])
    .gte("close_date", thresholdIso)

  if (fetchErr) {
    const duration = Date.now() - started
    console.error("[v0] scrape-subscription: fetch IPOs failed:", fetchErr.message)
    await logScraperRun({
      scraperName: SCRAPER_NAME,
      status: "failed",
      itemsProcessed: 0,
      errorMessage: fetchErr.message,
      durationMs: duration,
    })
    return {
      processed: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      duration_ms: duration,
      by_source: { nse: 0, bse: 0, chittorgarh: 0 },
      error: fetchErr.message,
    }
  }

  const rows: IpoRow[] = (ipos ?? []).map((r) => ({
    id: r.id,
    company_name: r.company_name,
    slug: r.slug,
    exchange: r.exchange,
    status: r.status,
    nse_symbol: r.nse_symbol,
    bse_scrip_code: r.bse_scrip_code,
    chittorgarh_url: r.chittorgarh_url,
  }))

  if (rows.length === 0) {
    const duration = Date.now() - started
    await logScraperRun({
      scraperName: SCRAPER_NAME,
      status: "success",
      itemsProcessed: 0,
      durationMs: duration,
    })
    return {
      processed: 0,
      inserted: 0,
      skipped: 0,
      failed: 0,
      duration_ms: duration,
      by_source: { nse: 0, bse: 0, chittorgarh: 0 },
    }
  }

  let inserted = 0
  let skipped = 0
  let failed = 0
  const sourceCounts: Record<string, number> = { nse: 0, bse: 0, chittorgarh: 0 }

  for (const ipo of rows) {
    try {
      const r = await processIpoSubscription(ipo)
      if (r.source) sourceCounts[r.source] = (sourceCounts[r.source] ?? 0) + 1
      if (r.inserted) inserted++
      else if (r.skipped) skipped++
      if (!r.snapshot) failed++
    } catch (err) {
      failed++
      console.error(`[v0] subscription scrape crashed for ${ipo.slug}:`, err)
    }

    // Stagger to avoid rate limiting (500-1500ms jitter).
    await sleep(500 + Math.floor(Math.random() * 1000))
  }

  const duration = Date.now() - started
  const status: "success" | "failed" = failed > 0 ? "failed" : "success"

  await logScraperRun({
    scraperName: SCRAPER_NAME,
    status,
    itemsProcessed: rows.length,
    durationMs: duration,
    errorMessage:
      failed > 0
        ? `Failed ${failed}/${rows.length} (inserted ${inserted}, skipped ${skipped})`
        : null,
  })

  return {
    processed: rows.length,
    inserted,
    skipped,
    failed,
    duration_ms: duration,
    by_source: sourceCounts,
  }
}

export async function GET(_request: Request) {
  const result = await runSubscriptionScraper()
  return NextResponse.json({
    message: "Subscription scrape complete",
    updated_at: new Date().toISOString(),
    ...result,
  })
}

export async function POST(request: Request) {
  return GET(request)
}
