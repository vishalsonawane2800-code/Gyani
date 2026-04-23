// app/api/cron/scrape-subscription/route.ts
// Subscription scraper orchestrator.
//
// Source routing (primary -> fallback):
//   Mainboard / NSE SME -> InvestorGain -> NSE API  -> Chittorgarh
//   BSE SME             -> InvestorGain -> BSE page -> Chittorgarh
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
import { scrapeInvestorGainSubscription } from "@/lib/scraper/sources/subscription-investorgain"

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
  investorgain_sub_url: string | null
  close_date?: string | null
}

// ---------------------------------------------------------------------------
// Scrape-window cutoff
// ---------------------------------------------------------------------------
// Business rule: once an IPO's bidding window is over we must stop scraping
// its subscription numbers. Concretely:
//   - close_date is in the past            -> do not scrape (stale data)
//   - close_date is today but IST >= 18:00 -> do not scrape (final numbers
//     published by exchanges around 6 PM after bidding ends at 5 PM)
//   - close_date is today and IST < 18:00  -> scrape
//   - close_date is in the future          -> scrape
// Returning `true` means "still inside scrape window".
function isWithinScrapeWindow(closeDate: string | null | undefined): boolean {
  if (!closeDate) return true // no close date configured - don't filter out
  // Compute current IST wall-clock time. Node's Date is UTC under the hood,
  // so we offset by IST (+5:30) to get the IST date + hour without relying
  // on a TZ library.
  const now = new Date()
  const istMs = now.getTime() + (5 * 60 + 30) * 60_000
  const ist = new Date(istMs)
  // Use UTC getters on the shifted Date - they return the IST wall-clock
  // values because we moved the instant forward by +5:30.
  const istDate = `${ist.getUTCFullYear()}-${String(ist.getUTCMonth() + 1).padStart(2, '0')}-${String(ist.getUTCDate()).padStart(2, '0')}`
  const istHour = ist.getUTCHours()

  if (closeDate < istDate) return false
  if (closeDate > istDate) return true
  // Same-day close: only scrape before 18:00 IST.
  return istHour < 18
}

type SourceKey = "investorgain" | "nse" | "bse" | "chittorgarh"

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
  if (exchange === "BSE SME") return ["investorgain", "bse", "chittorgarh"]
  // Mainboard, REIT, NSE SME all prefer NSE.
  return ["investorgain", "nse", "chittorgarh"]
}

async function runSource(
  source: SourceKey,
  ipo: IpoRow
): Promise<SubscriptionSnapshot | null> {
  try {
    if (source === "investorgain") {
      const result = await scrapeInvestorGainSubscription({
        investorgain_sub_url: ipo.investorgain_sub_url,
      })
      // InvestorGain returns { total, status } not the full snapshot.
      // Map to SubscriptionSnapshot with total only (partial coverage).
      if (result && result.total != null) {
        return { total: result.total, retail: null, nii: null, qib: null }
      }
      return null
    }
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

  // Gather snapshots from every source that returns data. We intentionally
  // collect all of them first and then pick the best one, rather than
  // merging field-by-field.
  //
  // Why: `total` is a weighted aggregate of the three category subscriptions
  // (retail / nii / qib) using each category's issue-size share as the
  // weight. Different sources publish on slightly different schedules and
  // with different rounding, so a `total` from source A will almost never
  // line up with category numbers from source B. The old "first non-null
  // wins per field" logic happily mixed them, producing impossible
  // snapshots like total=1.59 with retail=37, nii=79, qib=32 — where the
  // weighted total has to be somewhere between the smallest and largest
  // category, not below all of them.
  const gathered: Array<{ source: SourceKey; snap: SubscriptionSnapshot }> = []
  for (const src of order) {
    // Skip sources that obviously can't work for this IPO.
    if (src === "nse" && !ipo.nse_symbol) continue
    if (src === "bse" && !ipo.bse_scrip_code) continue

    const snap = await runSource(src, ipo)
    if (!hasAnyValue(snap)) continue

    gathered.push({ source: src, snap })

    // Stop early once we have a source that gave us every field — no
    // point hitting additional sources that will only slow the run and
    // add rate-limit risk.
    if (
      snap.total != null &&
      snap.retail != null &&
      snap.nii != null &&
      snap.qib != null
    ) {
      break
    }
  }

  if (gathered.length === 0) {
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

  // Category coverage for a snapshot (ignoring `total`). We rank by this
  // first because the UI primarily displays the three category boxes;
  // total is nice-to-have.
  const categoryCount = (s: SubscriptionSnapshot) =>
    (s.retail != null ? 1 : 0) + (s.nii != null ? 1 : 0) + (s.qib != null ? 1 : 0)

  // Pick the snapshot with the most category fields. Ties break toward
  // the earlier source in `order` (which reflects our preferred-source
  // priority for each exchange).
  let best = gathered[0]
  for (let i = 1; i < gathered.length; i++) {
    if (categoryCount(gathered[i].snap) > categoryCount(best.snap)) {
      best = gathered[i]
    }
  }

  // Build the final snapshot. Start from `best` and only borrow fields
  // from other snapshots when it is SAFE to do so:
  //   - If `best` already provides category data (retail/nii/qib), we
  //     use ONLY its total to avoid the source-mismatch bug. A missing
  //     total from that source is better than a wrong total from another.
  //   - If `best` has no category data at all (e.g. only InvestorGain
  //     responded and it only gives total), we fall back to first-non-null
  //     merging across all gathered snapshots to surface something.
  const chosenSnapshot: SubscriptionSnapshot = {
    total: best.snap.total,
    retail: best.snap.retail,
    nii: best.snap.nii,
    qib: best.snap.qib,
  }

  if (categoryCount(best.snap) === 0) {
    // Total-only fallback path: safe to merge because there are no
    // categories to mismatch with.
    for (const g of gathered) {
      for (const k of ["total", "retail", "nii", "qib"] as (keyof SubscriptionSnapshot)[]) {
        if (chosenSnapshot[k] == null && g.snap[k] != null) {
          chosenSnapshot[k] = g.snap[k]
        }
      }
    }
  }

  const chosen = { source: best.source, snapshot: chosenSnapshot }

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

  // Populate subscription_live (category-wise breakdown) so the Live
  // Subscription Tracker UI has something to render. One row per non-null
  // category keyed by (ipo_id, category). Ordered retail, nii, qib, total
  // to match the display grid.
  const liveCategories: Array<{
    category: "retail" | "nii" | "qib" | "total"
    value: number | null
    display_order: number
  }> = [
    { category: "retail", value: chosen.snapshot.retail, display_order: 0 },
    { category: "nii", value: chosen.snapshot.nii, display_order: 1 },
    { category: "qib", value: chosen.snapshot.qib, display_order: 2 },
    { category: "total", value: chosen.snapshot.total, display_order: 3 },
  ]

  const liveRows = liveCategories
    .filter((c) => c.value != null)
    .map((c) => ({
      ipo_id: ipo.id,
      category: c.category,
      subscription_times: c.value as number,
      display_order: c.display_order,
      updated_at: now.toISOString(),
    }))

  if (liveRows.length > 0) {
    const { error: liveErr } = await supabase
      .from("subscription_live")
      .upsert(liveRows, { onConflict: "ipo_id,category", ignoreDuplicates: false })
    if (liveErr) {
      console.error(
        `[v0] subscription_live upsert failed for ${ipo.slug}:`,
        liveErr.message
      )
    }
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
  no_data?: number
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
      "id, company_name, slug, exchange, status, nse_symbol, bse_scrip_code, chittorgarh_url, investorgain_sub_url, close_date"
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
      by_source: { investorgain: 0, nse: 0, bse: 0, chittorgarh: 0 },
      error: fetchErr.message,
    }
  }

  const rows: IpoRow[] = (ipos ?? [])
    .map((r) => ({
      id: r.id,
      company_name: r.company_name,
      slug: r.slug,
      exchange: r.exchange,
      status: r.status,
      nse_symbol: r.nse_symbol,
      bse_scrip_code: r.bse_scrip_code,
      chittorgarh_url: r.chittorgarh_url,
      investorgain_sub_url: r.investorgain_sub_url,
      close_date: r.close_date,
    }))
    // Drop IPOs that are past the 6 PM IST cutoff on their close day -
    // their subscription numbers are final and further polling just
    // burns source quotas + risks overwriting the final snapshot with
    // partial data.
    .filter((r) => {
      const inWindow = isWithinScrapeWindow(r.close_date)
      if (!inWindow) {
        console.log(
          `[v0] scrape-subscription: skipping ${r.slug} (past 18:00 IST cutoff on close_date=${r.close_date})`
        )
      }
      return inWindow
    })

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
      by_source: { investorgain: 0, nse: 0, bse: 0, chittorgarh: 0 },
    }
  }

  let inserted = 0
  let skipped = 0
  let failed = 0
  let noData = 0
  const sourceCounts: Record<string, number> = { investorgain: 0, nse: 0, bse: 0, chittorgarh: 0 }
  const failureDetails: string[] = []
  const noDataSlugs: string[] = []

  for (const ipo of rows) {
    try {
      const r = await processIpoSubscription(ipo)
      if (r.source) sourceCounts[r.source] = (sourceCounts[r.source] ?? 0) + 1
      if (r.inserted) inserted++
      else if (r.skipped) skipped++

      if (!r.snapshot) {
        // Clean "no data" — every source we could try returned nothing
        // without throwing. Expected for IPOs that haven't opened yet or
        // whose configured identifiers (nse_symbol/bse_scrip_code/
        // chittorgarh_url) are missing. Not a scraper failure.
        if (r.error === "All sources returned no data") {
          noData++
          if (noDataSlugs.length < 5) noDataSlugs.push(ipo.slug)
        } else {
          failed++
          if (failureDetails.length < 5) {
            failureDetails.push(`${ipo.slug}: ${r.error ?? "no_snapshot"}`)
          }
        }
      }
    } catch (err) {
      failed++
      const msg = err instanceof Error ? err.message : String(err)
      if (failureDetails.length < 5) failureDetails.push(`${ipo.slug}: threw ${msg}`)
      console.error(`[v0] subscription scrape crashed for ${ipo.slug}:`, err)
    }

    // Stagger to avoid rate limiting (500-1500ms jitter).
    await sleep(500 + Math.floor(Math.random() * 1000))
  }

  const duration = Date.now() - started
  const status: "success" | "failed" = failed > 0 ? "failed" : "success"

  let errorMessage: string | null = null
  if (failed > 0) {
    errorMessage =
      `Failed ${failed}/${rows.length} (inserted ${inserted}, skipped ${skipped}` +
      (noData > 0 ? `, no_data ${noData}` : "") +
      `). ` +
      failureDetails.join(" | ")
  } else if (noData > 0 && inserted === 0) {
    errorMessage = `No subscription data yet for ${noData}/${rows.length} IPOs: ${noDataSlugs.join(", ")}`
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
