// app/api/admin/cache/clear-subscription/[ipoId]/route.ts
// Clear the Redis cache for a subscription entry, forcing a fresh scrape on next run.
// This is useful when the source URL has been updated or you want to force data refresh.

import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { redis } from "@/lib/redis"
import { verifyJWT, extractToken } from "@/lib/jwt"

export const runtime = "nodejs"
export const maxDuration = 30

type Params = { params: Promise<{ ipoId: string }> }

export async function DELETE(request: Request, { params }: Params) {
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
    .select("id, company_name, slug")
    .eq("id", idNum)
    .maybeSingle()

  if (error || !ipo) {
    return NextResponse.json({ error: "IPO not found" }, { status: 404 })
  }

  // Clear the cache key for this IPO's subscription data
  const cacheKey = `subscription:${ipo.id}`
  try {
    await redis.del(cacheKey)
    console.log(`[v0] Cleared cache for ${ipo.slug} (${cacheKey})`)
    
    return NextResponse.json({
      success: true,
      message: `Cache cleared for ${ipo.company_name}`,
      cache_key: cacheKey,
      ipo_id: ipo.id,
    })
  } catch (err) {
    console.error(`[v0] Failed to clear cache for ${ipo.slug}:`, err)
    return NextResponse.json(
      { error: "Failed to clear cache", details: String(err) },
      { status: 500 }
    )
  }
}

// Also provide a POST endpoint so the admin panel can call it easily
export async function POST(request: Request, { params }: Params) {
  return DELETE(request, { params })
}
