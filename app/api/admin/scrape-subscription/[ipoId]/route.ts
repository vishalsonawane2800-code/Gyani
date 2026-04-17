// app/api/admin/scrape-subscription/[ipoId]/route.ts
// Manual subscription scrape for a single IPO. Reuses the orchestrator's
// per-IPO processor so behaviour (source routing, dedup, caching, DB writes)
// stays identical to the cron.
//
// Auth: middleware.ts enforces JWT; we also verify defensively here.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyJWT, extractToken } from "@/lib/jwt"
import { processIpoSubscription } from "@/app/api/cron/scrape-subscription/route"

export const runtime = "nodejs"
export const maxDuration = 60

type Params = { params: Promise<{ ipoId: string }> }

export async function POST(request: Request, { params }: Params) {
  const token = extractToken(request.headers.get("authorization"))
  const payload = token ? await verifyJWT(token) : null
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { ipoId } = await params
  const idNum = Number(ipoId)
  if (!ipoId || Number.isNaN(idNum)) {
    return NextResponse.json({ error: "Invalid ipoId" }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: ipo, error } = await supabase
    .from("ipos")
    .select(
      "id, company_name, slug, exchange, status, nse_symbol, bse_scrip_code, chittorgarh_url"
    )
    .eq("id", idNum)
    .maybeSingle()

  if (error || !ipo) {
    return NextResponse.json({ error: "IPO not found" }, { status: 404 })
  }

  const started = Date.now()
  const result = await processIpoSubscription(ipo as Parameters<typeof processIpoSubscription>[0])
  const duration = Date.now() - started

  return NextResponse.json({
    ipo_id: result.ipo_id,
    company_name: result.company_name,
    source: result.source,
    snapshot: result.snapshot,
    inserted: result.inserted,
    skipped: result.skipped,
    cached: result.cached,
    error: result.error ?? null,
    duration_ms: duration,
  })
}
