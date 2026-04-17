// app/api/admin/scrape-gmp/[ipoId]/route.ts
// Manual GMP scrape trigger for a single IPO. Returns detailed per-source
// results so the admin UI can show what each source reported.
// Auth: handled by middleware.ts (Bearer JWT); we also verify here defensively.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyJWT, extractToken } from "@/lib/jwt"
import { processIpoGMP } from "@/app/api/cron/scrape-gmp/route"

export const runtime = "nodejs"
export const maxDuration = 60

type Params = { params: Promise<{ ipoId: string }> }

export async function POST(request: Request, { params }: Params) {
  // Defense-in-depth: middleware already enforces this, but double-check.
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
      "id, slug, company_name, price_max, status, listing_date, investorgain_gmp_url, ipowatch_gmp_url, ipocentral_gmp_url"
    )
    .eq("id", idNum)
    .maybeSingle()

  if (error || !ipo) {
    return NextResponse.json({ error: "IPO not found" }, { status: 404 })
  }

  const started = Date.now()
  const result = await processIpoGMP(ipo as Parameters<typeof processIpoGMP>[0])
  const duration = Date.now() - started

  return NextResponse.json({
    ipo_id: ipo.id,
    company_name: ipo.company_name,
    averaged_gmp: result.averagedGMP,
    sources_used: result.sourcesUsed,
    inserted: result.inserted,
    skipped: result.skipped,
    failed: result.failed,
    error: result.error ?? null,
    per_source: result.outcomes,
    duration_ms: duration,
  })
}
