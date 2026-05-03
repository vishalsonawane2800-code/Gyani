

import { supabase } from "../lib/supabase.js";
import { scrape as scrapeIpowatch } from "./ipowatch.js";
import { scrape as scrapeIpoji } from "./ipoji.js";
import { scrape as scrapeInvestorgain } from "./investorgain.js";
import { average } from "./_utils.js";

/**
 * Load per-source GMP URLs for a company from the master `ipos` table.
 *
 * Schema reference (see scripts/007_complete_setup.sql, 012, 013, 002):
 *   ipos.company_name         TEXT  -- canonical lookup key
 *   ipos.ipowatch_gmp_url     TEXT  -- migration 012
 *   ipos.ipoji_gmp_url        TEXT  -- migration 013
 *   ipos.investorgain_gmp_url TEXT  -- migration 002
 *
 * Returns the URL trio (any field may be null/undefined). Returns an empty
 * object when the company is not found so callers degrade gracefully (each
 * scraper will then return `no_url`).
 */
async function loadSourceUrls(company_name) {
  const { data, error } = await supabase
    .from("ipos")
    .select("ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url")
    .eq("company_name", company_name)
    .maybeSingle();
  if (error) throw error;
  return data || {};
}

export async function scrapeAllGMP(company_name) {
  if (!company_name || typeof company_name !== "string") {
    throw new Error("company_name is required");
  }

  const urls = await loadSourceUrls(company_name);

  const results = await Promise.all([
    scrapeIpowatch({ company_name, url: urls.ipowatch_gmp_url }),
    scrapeIpoji({ company_name, url: urls.ipoji_gmp_url }),
    scrapeInvestorgain({ company_name, url: urls.investorgain_gmp_url }),
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
