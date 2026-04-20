// lib/scraper/sources/gmp-investorgain.ts
//
// DISABLED — InvestorGain is a client-rendered SPA as of 2026-04-20.
// Server-side fetches from Vercel egress return only an HTML shell with
// no data rows. See ai_ref/SCRAPER_CONTEXT.md §3b for the full rationale.
//
// The function is kept so other code that imports it (e.g. scripts, the
// dispatcher's `by_source` counters) still compiles. It now returns null
// fast and logs a single warn per call. If/when this source comes back
// online (server-rendered or with a stable JSON endpoint), restore the
// real implementation and re-add it to SOURCES in
// app/api/cron/scrape-gmp/route.ts.

type IPO = {
  company_name?: string
  investorgain_gmp_url?: string | null
}

let warned = false

export async function scrapeInvestorGainGMP(
  _ipo: IPO
): Promise<{ gmp: number } | null> {
  if (!warned) {
    console.warn(
      "[v0] scrapeInvestorGainGMP: source is disabled (SPA, no server data). " +
        "See ai_ref/SCRAPER_CONTEXT.md §3b."
    )
    warned = true
  }
  return null
}
