// app/api/cron/dispatch/route.ts
// Single dispatcher cron that runs every 15 minutes (see vercel.json) and
// fans out to the individual scrapers. This keeps us within Vercel Hobby's
// 2-cron limit.
//
// Schedule (deterministic, driven by current minute / hour):
//   Every tick (every 15 min):  runGmpScraper, runSubscriptionScraper
//
// News and YouTube pipelines are intentionally NOT wired — those flows
// are curated manually via /admin/reviews. Add them here if/when an
// automated pipeline is introduced.
//
// Auth: middleware accepts either a JWT (admin manual trigger) or the
// shared CRON_SECRET (Vercel cron header).

import { NextResponse } from "next/server"
import { logScraperRun } from "@/lib/scraper/base"
import { runGmpScraper } from "@/app/api/cron/scrape-gmp/route"
import { runSubscriptionScraper } from "@/app/api/cron/scrape-subscription/route"
import { runAutoStatusJob } from "@/app/api/admin/auto-status/route"

export const runtime = "nodejs"
export const maxDuration = 60

const DISPATCHER_NAME = "dispatcher"

type JobResult = {
  name: string
  status: "success" | "failed" | "skipped"
  duration_ms: number
  summary?: unknown
  error?: string
}

async function runJob(
  name: string,
  fn: () => Promise<unknown>
): Promise<JobResult> {
  const started = Date.now()
  try {
    const summary = await fn()
    return {
      name,
      status: "success",
      duration_ms: Date.now() - started,
      summary,
    }
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    console.error(`[v0] dispatcher: ${name} failed:`, err)
    return {
      name,
      status: "failed",
      duration_ms: Date.now() - started,
      error,
    }
  }
}

export async function GET(_request: Request) {
  const started = Date.now()
  const now = new Date()

  // Build the schedule. Always runs: gmp + subscription + auto-status.
  // auto-status handles the IST 5pm lastday->closed transition and the
  // day-after-listing migration into listed_ipos.
  // Extend here when news/youtube pipelines exist.
  const jobs: Array<{ name: string; fn: () => Promise<unknown> }> = [
    { name: "gmp", fn: runGmpScraper },
    { name: "subscription", fn: runSubscriptionScraper },
    { name: "auto-status", fn: runAutoStatusJob },
  ]

  const settled = await Promise.allSettled(
    jobs.map((j) => runJob(j.name, j.fn))
  )

  const results: JobResult[] = settled.map((s, i) => {
    if (s.status === "fulfilled") return s.value
    const error = s.reason instanceof Error ? s.reason.message : String(s.reason)
    return {
      name: jobs[i].name,
      status: "failed",
      duration_ms: 0,
      error,
    }
  })

  const failedCount = results.filter((r) => r.status === "failed").length
  const successCount = results.filter((r) => r.status === "success").length
  const duration = Date.now() - started

  // Log a single dispatcher-level row so the admin dashboard can show
  // "dispatcher is alive" heartbeats.
  await logScraperRun({
    scraperName: DISPATCHER_NAME,
    status: failedCount > 0 ? "failed" : "success",
    itemsProcessed: jobs.length,
    durationMs: duration,
    errorMessage:
      failedCount > 0
        ? `Failed ${failedCount}/${jobs.length}: ${results
            .filter((r) => r.status === "failed")
            .map((r) => `${r.name} (${r.error})`)
            .join("; ")}`
        : null,
  })

  return NextResponse.json({
    ran_at: now.toISOString(),
    duration_ms: duration,
    totals: {
      jobs: jobs.length,
      success: successCount,
      failed: failedCount,
    },
    results,
  })
}

// Allow Vercel cron retries via POST as well.
export async function POST(request: Request) {
  return GET(request)
}
