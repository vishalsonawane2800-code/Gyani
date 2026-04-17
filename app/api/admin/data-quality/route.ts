// app/api/admin/data-quality/route.ts
// Flags IPOs whose automation-maintained fields are stale so admins can
// jump in and manually refresh. News is intentionally excluded since that
// flow is curated by hand via /admin/reviews.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type IpoLite = {
  id: number
  company_name: string
  slug: string
  status: string
  exchange: string | null
  gmp_last_updated: string | null
  subscription_last_scraped: string | null
}

const ACTIVE_STATUSES = ["upcoming", "open", "lastday", "closed"]
const OPEN_STATUSES = ["open", "lastday"]

export async function GET(_request: Request) {
  const supabase = createAdminClient()

  const now = Date.now()
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from("ipos")
    .select(
      "id, company_name, slug, status, exchange, gmp_last_updated, subscription_last_scraped"
    )
    .in("status", ACTIVE_STATUSES)

  if (error) {
    console.error("[v0] data-quality query failed:", error.message)
    return NextResponse.json(
      { error: "Failed to load data quality", details: error.message },
      { status: 500 }
    )
  }

  const rows = (data ?? []) as IpoLite[]

  const gmpCutoff = hoursAgo(24)
  const subCutoff = hoursAgo(4)

  const staleGmp = rows
    .filter(
      (r) =>
        !r.gmp_last_updated || r.gmp_last_updated < gmpCutoff
    )
    .map((r) => ({
      ipo_id: r.id,
      company_name: r.company_name,
      slug: r.slug,
      status: r.status,
      exchange: r.exchange,
      gmp_last_updated: r.gmp_last_updated,
    }))

  const staleSubscription = rows
    .filter(
      (r) =>
        OPEN_STATUSES.includes(r.status) &&
        (!r.subscription_last_scraped || r.subscription_last_scraped < subCutoff)
    )
    .map((r) => ({
      ipo_id: r.id,
      company_name: r.company_name,
      slug: r.slug,
      status: r.status,
      exchange: r.exchange,
      subscription_last_scraped: r.subscription_last_scraped,
    }))

  // Build a unified "needs attention" list grouping stale tags per IPO.
  type Attention = {
    ipo_id: number
    company_name: string
    slug: string
    status: string
    exchange: string | null
    stale: string[]
  }
  const byId = new Map<number, Attention>()
  for (const r of staleGmp) {
    byId.set(r.ipo_id, {
      ipo_id: r.ipo_id,
      company_name: r.company_name,
      slug: r.slug,
      status: r.status,
      exchange: r.exchange,
      stale: ["gmp"],
    })
  }
  for (const r of staleSubscription) {
    const existing = byId.get(r.ipo_id)
    if (existing) existing.stale.push("subscription")
    else
      byId.set(r.ipo_id, {
        ipo_id: r.ipo_id,
        company_name: r.company_name,
        slug: r.slug,
        status: r.status,
        exchange: r.exchange,
        stale: ["subscription"],
      })
  }

  return NextResponse.json({
    cutoffs: {
      gmp_hours: 24,
      subscription_hours: 4,
    },
    totals: {
      stale_gmp: staleGmp.length,
      stale_subscription: staleSubscription.length,
      needs_attention: byId.size,
    },
    needs_attention: Array.from(byId.values()).sort((a, b) =>
      a.company_name.localeCompare(b.company_name)
    ),
  })
}
