import { supabase } from "../lib/supabase.js";
import { scrape as scrapeIpowatch } from "./ipowatch.js";
import { scrape as scrapeIpoji } from "./ipoji.js";
import { scrape as scrapeInvestorgain } from "./investorgain.js";
import { average } from "./_utils.js";

export async function scrapeAllGMP(company_name) {
  if (!company_name || typeof company_name !== "string") {
    throw new Error("company_name is required");
  }

  const results = await Promise.all([
    scrapeIpowatch(company_name),
    scrapeIpoji(company_name),
    scrapeInvestorgain(company_name),
  ]);

  const sources = results.map((r) => ({
    source: r.source,
    gmp: r.gmp,
    ...(r.error ? { error: r.error } : {}),
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
  if (!result || !result.company_name) {
    throw new Error("invalid result payload");
  }

  const { data, error } = await supabase
    .from("ipo_gmp")
    .upsert(
      {
        company_name: result.company_name,
        sources: result.sources,
        gmp: result.gmp,
        gmp_count: result.gmp_count,
        scraped_at: result.scraped_at,
      },
      { onConflict: "company_name" }
    )
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
