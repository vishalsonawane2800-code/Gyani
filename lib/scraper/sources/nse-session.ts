// lib/scraper/sources/nse-session.ts
// NSE cookie/session management. NSE's public APIs aggressively 401/403
// requests that don't carry cookies issued by www.nseindia.com. We
// therefore warm up by fetching the homepage, cache the cookies in Redis
// (TTL 30 min), and reuse them across calls.
//
// Public API:
//   - getCookies(forceRefresh?)      -> Promise<string[]>
//   - fetchNseApi(path, opts?)       -> Promise<any | null>
//
// Reliability contract: fetchNseApi NEVER throws. It retries exactly once
// with fresh cookies on 401/403/empty body, then returns null.

import { cacheGet, cacheSet, redis } from "@/lib/redis"

const COOKIE_KEY = "nse:cookies"
const COOKIE_TTL_SECONDS = 1800 // 30 min
const HOMEPAGE_URL = "https://www.nseindia.com"
const NSE_BASE = "https://www.nseindia.com"
const FETCH_TIMEOUT_MS = 15_000

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

/**
 * Splits a raw `set-cookie` header into individual cookie strings. The
 * header may contain commas inside `Expires=...` dates, so we cannot use
 * a naive `split(",")`. We split only on commas that are followed by
 * `whitespace + token + "="` which is how a new cookie starts.
 *
 * Falls back to `split(", ")` if no safe delimiter is detected.
 */
function splitSetCookie(raw: string): string[] {
  if (!raw) return []
  // Split on ", " that precedes a new cookie name token.
  const parts = raw.split(/,(?=\s*[A-Za-z0-9_-]+=)/g)
  return parts.map((p) => p.trim()).filter(Boolean)
}

/**
 * Extracts just the `name=value` segment from each cookie string and
 * returns them as an array (e.g. `["nsit=abc", "nseappid=xyz"]`). This
 * is the form we want to send back in the `Cookie` request header.
 */
function toCookiePairs(rawCookies: string[]): string[] {
  return rawCookies
    .map((c) => c.split(";")[0].trim())
    .filter((c) => c.length > 0 && c.includes("="))
}

async function fetchHomepageCookies(): Promise<string[] | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(HOMEPAGE_URL, {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      // Bypass Next.js fetch cache entirely.
      cache: "no-store",
    })

    // Prefer native getSetCookie() (Node 20+) which returns each cookie
    // as its own array entry.
    let raw: string[] = []
    const h = res.headers as unknown as {
      getSetCookie?: () => string[]
    }
    if (typeof h.getSetCookie === "function") {
      raw = h.getSetCookie()
    } else {
      const setCookie = res.headers.get("set-cookie")
      raw = setCookie ? splitSetCookie(setCookie) : []
    }

    const pairs = toCookiePairs(raw)
    return pairs.length > 0 ? pairs : null
  } catch (err) {
    console.error("[v0] NSE homepage fetch failed:", err)
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Returns cached cookies from Redis, or fetches fresh ones from the NSE
 * homepage. Pass `forceRefresh=true` to bypass the cache.
 */
export async function getCookies(forceRefresh = false): Promise<string[]> {
  if (!forceRefresh) {
    const cached = await cacheGet<string[]>(COOKIE_KEY)
    if (cached && Array.isArray(cached) && cached.length > 0) {
      return cached
    }
  } else {
    // Invalidate proactively.
    try {
      await redis.del(COOKIE_KEY)
    } catch {
      /* fail open */
    }
  }

  const fresh = await fetchHomepageCookies()
  if (fresh && fresh.length > 0) {
    await cacheSet(COOKIE_KEY, fresh, COOKIE_TTL_SECONDS)
    return fresh
  }
  return []
}

/**
 * Fetch an NSE API endpoint with the required cookies/headers.
 *
 * - `path` must start with `/api/...` OR be a full `https://www.nseindia.com/...` URL.
 * - Retries ONCE with refreshed cookies if the first attempt returns
 *   401/403 or an empty/invalid JSON body.
 * - Returns `null` (never throws) on any unrecoverable failure.
 */
export async function fetchNseApi<T = unknown>(
  path: string,
  opts: { query?: Record<string, string> } = {}
): Promise<T | null> {
  const url = buildUrl(path, opts.query)
  const first = await attemptFetch<T>(url, /*forceFresh*/ false)
  if (first.ok) return first.data

  if (first.shouldRetry) {
    const second = await attemptFetch<T>(url, /*forceFresh*/ true)
    if (second.ok) return second.data
  }
  return null
}

function buildUrl(path: string, query?: Record<string, string>): string {
  const base = path.startsWith("http") ? path : `${NSE_BASE}${path}`
  if (!query) return base
  const u = new URL(base)
  for (const [k, v] of Object.entries(query)) {
    if (v != null) u.searchParams.set(k, String(v))
  }
  return u.toString()
}

type AttemptResult<T> =
  | { ok: true; data: T; shouldRetry: false }
  | { ok: false; data: null; shouldRetry: boolean }

async function attemptFetch<T>(
  url: string,
  forceFresh: boolean
): Promise<AttemptResult<T>> {
  const cookies = await getCookies(forceFresh)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const res = await fetch(url, {
      headers: {
        Cookie: cookies.join("; "),
        "User-Agent": UA,
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: `${NSE_BASE}/`,
        "X-Requested-With": "XMLHttpRequest",
      },
      cache: "no-store",
      signal: controller.signal,
    })

    if (res.status === 401 || res.status === 403) {
      return { ok: false, data: null, shouldRetry: !forceFresh }
    }
    if (!res.ok) {
      return { ok: false, data: null, shouldRetry: false }
    }

    const text = await res.text()
    if (!text || !text.trim()) {
      return { ok: false, data: null, shouldRetry: !forceFresh }
    }

    try {
      const data = JSON.parse(text) as T
      if (data == null) {
        return { ok: false, data: null, shouldRetry: !forceFresh }
      }
      return { ok: true, data, shouldRetry: false }
    } catch {
      // NSE sometimes returns an HTML error page even with a 200 when
      // session is stale. Treat as a retryable failure.
      return { ok: false, data: null, shouldRetry: !forceFresh }
    }
  } catch (err) {
    console.error("[v0] fetchNseApi error:", err)
    return { ok: false, data: null, shouldRetry: !forceFresh }
  } finally {
    clearTimeout(timeout)
  }
}
