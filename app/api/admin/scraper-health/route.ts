// app/api/admin/scraper-health/route.ts
// Aggregates scraper_health rows for the admin Automation dashboard.
// Middleware gates this on a valid admin JWT.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const TRACKED = ["gmp", "subscription", "dispatcher"] as const
type Tracked = (typeof TRACKED)[number]

// scraper_health.scraper_name values can be either the scraper's "short"
// key (gmp, subscription, dispatcher) or the legacy full-route name
// (scrape-gmp, scrape-subscription). Match both.
const NAME_ALIASES: Record<Tracked, string[]> = {
  gmp: ["gmp", "scrape-gmp"],
  subscription: ["subscription", "scrape-subscription"],
  dispatcher: ["dispatcher"],
}

type ScraperHealthRow = {
  id: string | number
  scraper_name: string
  status: "success" | "failed" | "skipped"
  items_processed: number | null
  error_message: string | null
  duration_ms: number | null
  ran_at: string
}

type ScraperSummary = {
  lastRun: string | null
  lastStatus: "success" | "failed" | "skipped" | null
  lastError: string | null
  successRate24h: number // 0..1
  itemsLastRun: number
  runsLast24h: number
  successRuns24h: number
  avgDurationMs24h: number | null
}

function emptySummary(): ScraperSummary {
  return {
    lastRun: null,
    lastStatus: null,
    lastError: null,
    successRate24h: 0,
    itemsLastRun: 0,
    runsLast24h: 0,
    successRuns24h: 0,
    avgDurationMs24h: null,
  }
}

function summarize(rows: ScraperHealthRow[]): ScraperSummary {
  if (rows.length === 0) return emptySummary()

  // Latest by ran_at (Supabase already returns DESC, but be defensive).
  const sorted = [...rows].sort(
    (a, b) => new Date(b.ran_at).getTime() - new Date(a.ran_at).getTime()
  )
  const last = sorted[0]

  const twentyFourH = Date.now() - 24 * 60 * 60 * 1000
  const recent = sorted.filter((r) => new Date(r.ran_at).getTime() >= twentyFourH)
  const successes = recent.filter((r) => r.status === "success").length
  const durations = recent
    .map((r) => r.duration_ms)
    .filter((v): v is number => typeof v === "number")
  const avg =
    durations.length > 0
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null

  return {
    lastRun: last.ran_at,
    lastStatus: last.status,
    lastError: last.error_message,
    successRate24h: recent.length === 0 ? 0 : successes / recent.length,
    itemsLastRun: last.items_processed ?? 0,
    runsLast24h: recent.length,
    successRuns24h: successes,
    avgDurationMs24h: avg,
  }
}

export async function GET(_request: Request) {
  const supabase = createAdminClient()

  // Grab enough rows to cover 24h for all scrapers + a healthy recent-runs
  // window. 500 rows @ 4 per hour per scraper across 3 scrapers = well more
  // than 24h of headroom.
  const { data, error } = await supabase
    .from("scraper_health")
    .select("*")
    .order("ran_at", { ascending: false })
    .limit(500)

  if (error) {
    console.error("[v0] scraper-health: query failed:", error.message)
    return NextResponse.json(
      { error: "Failed to load scraper health", details: error.message },
      { status: 500 }
    )
  }

  const rows = (data ?? []) as ScraperHealthRow[]

  const scrapers = TRACKED.reduce<Record<Tracked, ScraperSummary>>(
    (acc, key) => {
      const aliases = NAME_ALIASES[key]
      const matching = rows.filter((r) => aliases.includes(r.scraper_name))
      acc[key] = summarize(matching)
      return acc
    },
    {} as Record<Tracked, ScraperSummary>
  )

  return NextResponse.json({
    scrapers,
    recentRuns: rows.slice(0, 50),
  })
}
