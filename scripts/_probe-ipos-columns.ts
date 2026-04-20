// One-off: probe which of the known URL columns actually exist on the
// currently-connected Supabase `ipos` table. We do this by attempting to
// SELECT each column individually — if a column doesn't exist, Supabase
// returns PGRST204 / 42703, which lets us report precisely which columns
// are missing without needing direct Postgres introspection access.

import { createClient } from "@supabase/supabase-js"

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ""

if (!url || !key) {
  console.error("Missing Supabase env. url?", !!url, "key?", !!key)
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const COLUMNS_TO_CHECK = [
  "id",
  "company_name",
  "slug",
  "chittorgarh_url",
  "investorgain_gmp_url",
  "investorgain_sub_url",
  "ipowatch_gmp_url",
  "ipocentral_gmp_url",
  "allotment_url",
  "drhp_url",
  "rhp_url",
  "anchor_investors_url",
  "subscription_source",
  "list_day_close",
  "list_day_change_pct",
  "listing_price",
]

async function main() {
  console.log("Probing ipos columns on:", url)
  const present: string[] = []
  const missing: { col: string; err: string }[] = []

  for (const col of COLUMNS_TO_CHECK) {
    const { error } = await supabase.from("ipos").select(col).limit(1)
    if (error) {
      missing.push({ col, err: `${error.code ?? ""} ${error.message ?? ""}`.trim() })
    } else {
      present.push(col)
    }
  }

  console.log("\nPRESENT columns:")
  for (const c of present) console.log("  +", c)
  console.log("\nMISSING columns:")
  if (missing.length === 0) {
    console.log("  (none — all checked columns exist)")
  } else {
    for (const m of missing) console.log("  -", m.col, "=>", m.err)
  }
}

main().catch((e) => {
  console.error("threw:", e?.message ?? e)
  process.exit(1)
})
