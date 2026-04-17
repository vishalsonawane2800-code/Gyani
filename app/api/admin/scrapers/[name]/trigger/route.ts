// app/api/admin/scrapers/[name]/trigger/route.ts
// Admin manual trigger for a named scraper. Middleware verifies the admin
// JWT; the scraper function itself logs to scraper_health.

import { NextResponse } from "next/server"
import { runGmpScraper } from "@/app/api/cron/scrape-gmp/route"
import { runSubscriptionScraper } from "@/app/api/cron/scrape-subscription/route"

export const runtime = "nodejs"
export const maxDuration = 60

const RUNNERS: Record<string, () => Promise<unknown>> = {
  gmp: runGmpScraper,
  subscription: runSubscriptionScraper,
  // "dispatcher" is handled separately below so it can fan out.
}

async function runDispatcher() {
  const [gmp, sub] = await Promise.allSettled([
    runGmpScraper(),
    runSubscriptionScraper(),
  ])
  return {
    gmp: gmp.status === "fulfilled" ? gmp.value : { error: String(gmp.reason) },
    subscription:
      sub.status === "fulfilled" ? sub.value : { error: String(sub.reason) },
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params

  if (name === "dispatcher") {
    try {
      const summary = await runDispatcher()
      return NextResponse.json({ ok: true, name, summary })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error("[v0] trigger dispatcher failed:", err)
      return NextResponse.json({ ok: false, name, error: message }, { status: 500 })
    }
  }

  const runner = RUNNERS[name]
  if (!runner) {
    return NextResponse.json(
      { error: `Unknown scraper '${name}'. Valid: gmp, subscription, dispatcher` },
      { status: 400 }
    )
  }

  try {
    const summary = await runner()
    return NextResponse.json({ ok: true, name, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[v0] trigger ${name} failed:`, err)
    return NextResponse.json({ ok: false, name, error: message }, { status: 500 })
  }
}
