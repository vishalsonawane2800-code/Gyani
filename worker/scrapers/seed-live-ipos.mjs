// Admin helper to seed / update an IPO with all source URLs at once.
// Usage: set env SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, then:
//   node worker/scripts/seed-live-ipos.mjs
//
// Edit the IPOS array below with the open IPOs you want to seed.

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// ---- EDIT THIS ARRAY WHEN ADDING NEW LIVE IPOS ---------------------------
const IPOS = [
  {
    company_name:         "Kissht",
    ipowatch_gmp_url:     "https://ipowatch.in/kissht-ipo-gmp-grey-market-premium/",
    ipoji_gmp_url:        "https://www.ipoji.com/ipo/onemi-technology-kissht-ipo",
    investorgain_gmp_url: "https://www.investorgain.com/gmp/onemi-technology-ipo-gmp/1591/",
    chittorgarh_url:      "https://www.chittorgarh.com/ipo/onemi-technology-ipo/2576/",
    investorgain_sub_url: "https://www.investorgain.com/subscription/onemi-technology-ipo/1591/",
  },
  {
    company_name:         "Bagmane REIT",
    ipowatch_gmp_url:     "https://ipowatch.in/bagmane-reit-ipo-gmp-grey-market-premium/",
    ipoji_gmp_url:        "https://www.ipoji.com/ipo/bagmane-prime-office-reit-ipo",
    investorgain_gmp_url: "https://www.investorgain.com/gmp/bagmane-reit-gmp/2278/",
    chittorgarh_url:      "https://www.chittorgarh.com/ipo/bagmane-reit/3090/",
    investorgain_sub_url: "https://www.investorgain.com/subscription/bagmane-reit-ipo/2278/",
  },
];
// --------------------------------------------------------------------------

async function main() {
  for (const ipo of IPOS) {
    const { error } = await supabase
      .from("ipos")
      .upsert(ipo, { onConflict: "company_name" });
    if (error) {
      console.error(`FAIL ${ipo.company_name}:`, error.message);
    } else {
      console.log(`OK   ${ipo.company_name}`);
    }
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
