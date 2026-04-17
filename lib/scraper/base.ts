// lib/scraper/base.ts
// Shared primitives for IPOGyani automation layer:
// - fetchWithRetry: retrying fetch with timeout + default UA
// - logScraperRun: writes run metadata to scraper_health
// - verifyCronAuth / cronUnauthorized: CRON_SECRET enforcement
// - circuitBreaker{Check,RecordFailure}: Redis-backed cooldown

import { createAdminClient } from "@/lib/supabase/admin"
import { redis } from "@/lib/redis"

const DEFAULT_USER_AGENT =
  "IPOGyaniBot/1.0 (+https://ipogyani.com/bot)"

const RETRY_DELAYS_MS = [500, 1000, 2000]
const FETCH_TIMEOUT_MS = 15_000

const CIRCUIT_BREAKER_WINDOW_SECONDS = 60 * 60 // 1 hour
const CIRCUIT_BREAKER_THRESHOLD = 5

/**
 * Fetches a URL with:
 * - up to 3 retries with exponential backoff (500ms, 1000ms, 2000ms)
 * - 15s AbortController timeout per attempt
 * - default IPOGyaniBot User-Agent (overridable via options.headers)
 *
 * Throws the last error if all attempts fail or returns a non-OK response
 * on the final attempt.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const maxAttempts = RETRY_DELAYS_MS.length + 1
  let lastError: unknown = null

  const userHeaders = new Headers(options.headers)
  if (!userHeaders.has("user-agent") && !userHeaders.has("User-Agent")) {
    userHeaders.set("User-Agent", DEFAULT_USER_AGENT)
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    try {
      const response = await fetch(url, {
        ...options,
        headers: userHeaders,
        signal: controller.signal,
      })

      if (response.ok) {
        clearTimeout(timeout)
        return response
      }

      // Non-OK. Retry on 5xx and 429; surface 4xx immediately.
      if (response.status < 500 && response.status !== 429) {
        clearTimeout(timeout)
        return response
      }

      lastError = new Error(
        `fetchWithRetry: ${url} responded ${response.status} ${response.statusText}`
      )
    } catch (err) {
      lastError = err
    } finally {
      clearTimeout(timeout)
    }

    if (attempt < RETRY_DELAYS_MS.length) {
      await sleep(RETRY_DELAYS_MS[attempt])
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`fetchWithRetry: ${url} failed after ${maxAttempts} attempts`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---------------------------------------------------------------------------
// Scraper health logging
// ---------------------------------------------------------------------------

export type ScraperRunStatus = "success" | "partial" | "failed"

export interface LogScraperRunParams {
  scraperName: string
  status: ScraperRunStatus
  itemsProcessed?: number
  errorMessage?: string | null
  durationMs?: number
}

/**
 * Writes a row to the `scraper_health` table using the service-role client.
 * Failures are logged and swallowed so they never break a scraper's main flow.
 */
export async function logScraperRun(params: LogScraperRunParams): Promise<void> {
  const {
    scraperName,
    status,
    itemsProcessed = 0,
    errorMessage = null,
    durationMs,
  } = params

  try {
    const supabase = createAdminClient()
    const { error } = await supabase.from("scraper_health").insert({
      scraper_name: scraperName,
      status,
      items_processed: itemsProcessed,
      error_message: errorMessage,
      duration_ms: durationMs ?? null,
      ran_at: new Date().toISOString(),
    })

    if (error) {
      console.error("[v0] logScraperRun insert failed:", error.message)
    }
  } catch (err) {
    console.error("[v0] logScraperRun threw:", err)
  }
}

// ---------------------------------------------------------------------------
// Cron auth
// ---------------------------------------------------------------------------

/**
 * Returns true if the request carries a valid `Authorization: Bearer ${CRON_SECRET}`
 * header. Returns false when the secret is unset (fail-closed).
 */
export function verifyCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("[v0] verifyCronAuth: CRON_SECRET is not set")
    return false
  }

  const header = request.headers.get("authorization") ?? ""
  const expected = `Bearer ${secret}`

  if (header.length !== expected.length) return false

  // Constant-time-ish comparison
  let diff = 0
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ expected.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Standard 401 response for unauthorized cron requests.
 */
export function cronUnauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "content-type": "application/json" },
  })
}

// ---------------------------------------------------------------------------
// Circuit breaker
// ---------------------------------------------------------------------------

function breakerKey(sourceName: string): string {
  return `circuit-breaker:${sourceName}`
}

/**
 * Returns true if the source is healthy enough to call.
 * Returns false once `CIRCUIT_BREAKER_THRESHOLD` failures have been recorded
 * within `CIRCUIT_BREAKER_WINDOW_SECONDS`.
 *
 * Fails open on Redis errors so an infra hiccup does not halt scrapers.
 */
export async function circuitBreakerCheck(sourceName: string): Promise<boolean> {
  try {
    const count = (await redis.get<number>(breakerKey(sourceName))) ?? 0
    return count < CIRCUIT_BREAKER_THRESHOLD
  } catch (err) {
    console.error("[v0] circuitBreakerCheck error:", err)
    return true
  }
}

/**
 * Records a failure for the given source. If this is the first failure in the
 * window, sets the TTL so the counter auto-expires after 1 hour.
 */
export async function circuitBreakerRecordFailure(
  sourceName: string
): Promise<void> {
  try {
    const key = breakerKey(sourceName)
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, CIRCUIT_BREAKER_WINDOW_SECONDS)
    }
  } catch (err) {
    console.error("[v0] circuitBreakerRecordFailure error:", err)
  }
}
