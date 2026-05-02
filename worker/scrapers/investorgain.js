import express from "express";
import { scrapeAllGMP, scrapeAndSaveGMP } from "./scrapers/index.js";

const app = express();
app.use(express.json());

console.log("Starting ipogyani-worker...");

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (_req, res) => {
  res.json({ working: true });
});

app.get("/api/gmp/:company", async (req, res) => {
  try {
    const company = decodeURIComponent(req.params.company);
    const result = await scrapeAllGMP(company);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "scrape_failed" });
  }
});

app.post("/api/cron/dispatch", async (req, res) => {
  try {
    const { job, company_name } = req.body || {};
    if (!job || !company_name) {
      return res.status(400).json({ error: "job and company_name are required" });
    }
    if (job !== "gmp") {
      return res.status(400).json({ error: `unsupported job: ${job}` });
    }
    const { result, saved } = await scrapeAndSaveGMP(company_name);
    res.json({ ok: true, job, result, saved });
  } catch (err) {
    res.status(500).json({ error: err.message || "dispatch_failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`worker listening on ${PORT}`);
});
--- worker/lib/supabase.js ---

import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
--- worker/scrapers/index.js ---

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
--- worker/scrapers/_utils.js ---

const DEFAULT_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

export async function fetchHtml(url, { timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

export function parseGmpNumber(raw) {
  if (raw === null || raw === undefined) return null;
  const text = String(raw).replace(/,/g, "").trim();
  const match = text.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function normalizeName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/\b(ipo|limited|ltd|pvt|private)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function nameMatches(target, candidate) {
  const a = normalizeName(target);
  const b = normalizeName(candidate);
  if (!a || !b) return false;
  if (a === b) return true;
  const aTokens = a.split(" ").filter(Boolean);
  const bTokens = new Set(b.split(" ").filter(Boolean));
  const overlap = aTokens.filter((t) => bTokens.has(t)).length;
  return overlap >= Math.min(2, aTokens.length);
}

export function average(nums) {
  const valid = nums.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Number((sum / valid.length).toFixed(2));
}
--- worker/scrapers/ipowatch.js ---

import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber, nameMatches } from "./_utils.js";

const SOURCE = "ipowatch";
const URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

export async function scrape(company) {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);

    let found = null;

    $("table").each((_, table) => {
      if (found !== null) return;
      const $table = $(table);
      const headers = $table
        .find("tr")
        .first()
        .find("th,td")
        .map((_, el) => $(el).text().trim().toLowerCase())
        .get();

      const nameIdx = headers.findIndex((h) => h.includes("ipo") || h.includes("name"));
      const gmpIdx = headers.findIndex((h) => h.includes("gmp"));
      if (nameIdx === -1 || gmpIdx === -1) return;

      $table.find("tr").slice(1).each((_, tr) => {
        if (found !== null) return;
        const cells = $(tr)
          .find("td")
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length <= Math.max(nameIdx, gmpIdx)) return;

        const rowName = cells[nameIdx];
        if (nameMatches(company, rowName)) {
          const gmp = parseGmpNumber(cells[gmpIdx]);
          if (gmp !== null) {
            found = { source: SOURCE, gmp, matched_name: rowName };
          }
        }
      });
    });

    if (found) return found;
    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
--- worker/scrapers/ipoji.js ---

import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber, nameMatches } from "./_utils.js";

const SOURCE = "ipoji";
const URL = "https://ipoji.com/ipo/mainboard-ipo-gmp";

export async function scrape(company) {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);

    let found = null;

    $("table").each((_, table) => {
      if (found !== null) return;
      const $table = $(table);
      const headers = $table
        .find("tr")
        .first()
        .find("th,td")
        .map((_, el) => $(el).text().trim().toLowerCase())
        .get();

      const nameIdx = headers.findIndex(
        (h) => h.includes("ipo") || h.includes("name") || h.includes("company")
      );
      const gmpIdx = headers.findIndex((h) => h.includes("gmp"));
      if (nameIdx === -1 || gmpIdx === -1) return;

      $table.find("tr").slice(1).each((_, tr) => {
        if (found !== null) return;
        const cells = $(tr)
          .find("td")
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length <= Math.max(nameIdx, gmpIdx)) return;

        const rowName = cells[nameIdx];
        if (nameMatches(company, rowName)) {
          const gmp = parseGmpNumber(cells[gmpIdx]);
          if (gmp !== null) {
            found = { source: SOURCE, gmp, matched_name: rowName };
          }
        }
      });
    });

    if (found) return found;
    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
--- worker/scrapers/investorgain.js ---

import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber, nameMatches } from "./_utils.js";

const SOURCE = "investorgain";
const URL = "https://www.investorgain.com/report/live-ipo-gmp/331/";

export async function scrape(company) {
  try {
    const html = await fetchHtml(URL);
    const $ = cheerio.load(html);

    let found = null;

    $("table").each((_, table) => {
      if (found !== null) return;
      const $table = $(table);
      const headers = $table
        .find("tr")
        .first()
        .find("th,td")
        .map((_, el) => $(el).text().trim().toLowerCase())
        .get();

      const nameIdx = headers.findIndex(
        (h) => h.includes("ipo") || h.includes("name") || h.includes("company")
      );
      const gmpIdx = headers.findIndex((h) => h.includes("gmp"));
      if (nameIdx === -1 || gmpIdx === -1) return;

      $table.find("tr").slice(1).each((_, tr) => {
        if (found !== null) return;
        const cells = $(tr)
          .find("td")
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length <= Math.max(nameIdx, gmpIdx)) return;

        const rowName = cells[nameIdx];
        if (nameMatches(company, rowName)) {
          const gmp = parseGmpNumber(cells[gmpIdx]);
          if (gmp !== null) {
            found = { source: SOURCE, gmp, matched_name: rowName };
          }
        }
      });
    });

    if (found) return found;
    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
