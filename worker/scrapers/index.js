import { supabase } from "../lib/supabase.js";
import { scrapeIPOWatchGMP } from "./ipowatch.js";
import { scrapeIpojiGMP } from "./ipoji.js";
import { scrapeInvestorGainGMP } from "./investorgain.js";

function average(arr) {
  if (!arr.length) return null;
  return Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100;
}

export async function scrapeAllGMP(company_name) {
  if (!company_name || typeof company_name !== "string") {
    throw new Error("company_name is required");
  }

  const results = await Promise.all([
    scrapeIPOWatchGMP({ company_name }),
    scrapeIpojiGMP({ company_name }),
    scrapeInvestorGainGMP({ company_name }),
  ]);

  const sources = results.map((r) => ({
    source: r.source,
    gmp: r.gmp,
  }));

  const validGmps = sources
    .map((s) => s.gmp)
    .filter((g) => typeof g === "number" && Number.isFinite(g));

  const gmp = average(validGmps);
  const gmp_count = validGmps.length;
  const scraped_at = new Date().toISOString();

  return {
    company_name,
    sources,
    gmp,
    gmp_count,
    scraped_at,
  };
}

export async function saveGMP(result) {
  const { data, error } = await supabase
    .from("ipo_gmp")
    .upsert(result, { onConflict: "company_name" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function scrapeAndSaveGMP(company_name) {
  const result = await scrapeAllGMP(company_name);
  const saved = await saveGMP(result);
  return { result, saved };
}
