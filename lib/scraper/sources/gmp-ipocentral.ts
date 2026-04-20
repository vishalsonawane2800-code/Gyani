// lib/scraper/sources/gmp-ipocentral.ts
//
// DISABLED — IPOCentral is behind Cloudflare WAF. As of 2026-04-20 every
// request from Vercel egress (any UA, any headers, any referer) returns
// HTTP 403. See ai_ref/SCRAPER_CONTEXT.md §3c for the full rationale.
//
// The function is kept so other code that imports it still compiles. It
// now returns null fast and logs a single warn per call. If you want to
// re-enable this source, you need an egress that isn't on Cloudflare's
// block list (e.g. a residential proxy or the Cloudflare Worker) and then
// re-add it to SOURCES in app/api/cron/scrape-gmp/route.ts.

type IPO = {
  company_name?: string
  ipocentral_gmp_url?: string | null
}

let warned = false

export async function scrapeIPOCentralGMP(
  _ipo: IPO
): Promise<{ gmp: number } | null> {
  if (!warned) {
    console.warn(
      "[v0] scrapeIPOCentralGMP: source is disabled (Cloudflare WAF blocks " +
        "cloud IPs). See ai_ref/SCRAPER_CONTEXT.md §3c."
    )
    warned = true
  }
  return null
}
