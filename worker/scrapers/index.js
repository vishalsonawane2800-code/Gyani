import { scrapeIPOWatchGMP } from "./ipowatch.js";
import { scrapeIpojiGMP } from "./ipoji.js";
import { scrapeInvestorGainGMP } from "./investorgain.js";
import { supabase } from "../lib/supabase.js";

const SOURCES = ["ipowatch", "ipoji", "investorgain"];

export async function scrapeAllGMP(ipo) {
  const company_name = ipo?.company_name || "";

  console.log("[AGGREGATOR] Starting:", company_name);

  const tasks = [
    scrapeIPOWatchGMP(ipo),
    scrapeIpojiGMP(ipo),
    scrapeInvestorGainGMP(ipo),
  ];

  const results = await Promise.allSettled(tasks);

  const sources = results.map((res, i) => {
    const fallback = { source: SOURCES[i], gmp: null };

    if (res.status === "fulfilled" && res.value) {
      console.log(`[AGGREGATOR] ${res.value.source}:`, res.value.gmp);
      return res.value;
    }

    console.warn(`[AGGREGATOR] ${SOURCES[i]} failed`);
    return fallback;
  });

  // extract valid GMP values
  const valid = sources
    .map((s) => s.gmp)
    .filter((v) => v !== null && Number.isFinite(v));

  let gmp = null;

  if (valid.length > 0) {
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    gmp = Math.round(avg * 100) / 100;
  }

  console.log("[AGGREGATOR] FINAL GMP:", gmp);

  const result = {
    company_name,
    sources,
    gmp,
    gmp_count: valid.length,
    scraped_at: new Date().toISOString(),
  };

  // 🔥 SAVE TO SUPABASE
  try {
    const { error } = await supabase
      .from("ipo_gmp")
      .upsert(result, { onConflict: "company_name" });

    if (error) {
      console.error("[SUPABASE ERROR]", error);
    } else {
      console.log("[SUPABASE] Saved:", company_name);
    }
  } catch (err) {
    console.error("[SUPABASE EXCEPTION]", err);
  }

  return result;
}

// optional exports for debugging
export {
  scrapeIPOWatchGMP,
  scrapeIpojiGMP,
  scrapeInvestorGainGMP,
};
