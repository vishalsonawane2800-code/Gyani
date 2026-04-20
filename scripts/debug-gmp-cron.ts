// Reproduces exactly what /api/cron/scrape-gmp does:
//  1. Load the same IPO window from the DB.
//  2. Run ipowatch + ipoji for each IPO (no caching, no DB writes).
//  3. Print which IPO returns null from both sources (= failure).
//
// Run with:
//   set -a && source /vercel/share/.env.project && set +a
//   pnpm exec tsx scripts/debug-gmp-cron.ts

import { createAdminClient } from "@/lib/supabase/admin"
import { scrapeIPOWatchGMP } from "@/lib/scraper/sources/gmp-ipowatch"
import { scrapeIpojiGMP } from "@/lib/scraper/sources/gmp-ipoji"

async function main() {
  const supabase = createAdminClient()
  const todayIso = new Date().toISOString().split("T")[0]

  const { data: ipos, error } = await supabase
    .from("ipos")
    .select(
      "id, slug, company_name, price_max, status, listing_date, investorgain_gmp_url, ipowatch_gmp_url, ipocentral_gmp_url"
    )
    .in("status", ["upcoming", "open", "lastday", "closed", "allot", "listing"])
    .or(`listing_date.is.null,listing_date.gte.${todayIso}`)

  if (error) {
    console.error("DB query error:", error.message)
    process.exit(1)
  }

  const rows = ipos ?? []
  console.log(`\nDB window returned ${rows.length} IPO(s):`)
  for (const r of rows) {
    console.log(`  - ${r.company_name} (slug=${r.slug}, status=${r.status}, listing_date=${r.listing_date}, ipowatch_url=${r.ipowatch_gmp_url ?? "-"})`)
  }

  console.log("\nPer-IPO scraper outcomes:")
  for (const ipo of rows) {
    const [ipow, ipoj] = await Promise.all([
      scrapeIPOWatchGMP(ipo).catch((e) => ({ error: String(e) })),
      scrapeIpojiGMP(ipo).catch((e) => ({ error: String(e) })),
    ])
    const ipowGmp = ipow && "gmp" in ipow ? ipow.gmp : null
    const ipojGmp = ipoj && "gmp" in ipoj ? ipoj.gmp : null
    const ipowErr = ipow && "error" in ipow ? ipow.error : null
    const ipojErr = ipoj && "error" in ipoj ? ipoj.error : null
    const status =
      ipowGmp === null && ipojGmp === null ? "FAIL (both null)" : "OK"
    console.log(
      `  [${status}] ${ipo.company_name}  ipowatch=${ipowGmp ?? "null"}${ipowErr ? ` (err: ${ipowErr})` : ""}  ipoji=${ipojGmp ?? "null"}${ipojErr ? ` (err: ${ipojErr})` : ""}`
    )
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
