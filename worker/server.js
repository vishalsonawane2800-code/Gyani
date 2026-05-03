const express = require("express");
const cors = require("cors");
const { supabase } = require("./lib/supabase");
const { scrapeAllSources, aggregateGMP } = require("./scrapers");

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;
const BULK_CONCURRENCY = Number(process.env.BULK_CONCURRENCY || 3);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/test", (_req, res) => {
  res.json({
    status: "ok",
    message: "IPOgyani worker is running",
    env: {
      supabase_configured: !!supabase,
      cron_secret_configured: !!CRON_SECRET,
      bulk_concurrency: BULK_CONCURRENCY,
    },
  });
});

app.get("/api/gmp/:company", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });
  try {
    const { company } = req.params;
    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .eq("company_name", company)
      .single();

    if (error || !data) return res.status(404).json({ error: "not_found", company });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gmp", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });
  try {
    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const IPO_COLS = "company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url";

async function processIPO(ipoConfig) {
  const sources = await scrapeAllSources(ipoConfig);
  const { gmp, gmp_count } = aggregateGMP(sources);

  const result = {
    company_name: ipoConfig.company_name,
    sources,
    gmp,
    gmp_count,
    scraped_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("ipo_gmp")
    .upsert(result, { onConflict: "company_name" });

  if (error) {
    console.error(`Failed to save GMP for ${ipoConfig.company_name}:`, error.message);
    return { ...result, save_error: error.message };
  }
  return result;
}

async function processIPOsBounded(ipos, concurrency) {
  const results = new Array(ipos.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= ipos.length) return;
      try {
        results[idx] = await processIPO(ipos[idx]);
      } catch (err) {
        results[idx] = {
          company_name: ipos[idx].company_name,
          sources: [],
          gmp: null,
          gmp_count: 0,
          scraped_at: new Date().toISOString(),
          error: err && err.message ? err.message : "process_error",
        };
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, ipos.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function verifyCronAuth(req) {
  if (!CRON_SECRET) return true;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return false;
  return header.slice("Bearer ".length) === CRON_SECRET;
}

app.post("/api/cron/dispatch", async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: "unauthorized" });
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });

  const { job, company_name, companies } = req.body || {};
  const startedAt = Date.now();

  try {
    if (job === "gmp" && company_name) {
      const { data: ipoConfig, error } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .eq("company_name", company_name)
        .single();

      if (error || !ipoConfig) {
        return res.status(404).json({ error: "ipo_not_found", company_name });
      }
      const result = await processIPO(ipoConfig);
      return res.json({ job: "gmp", duration_ms: Date.now() - startedAt, result });
    }

    if (job === "gmp" || (job === "gmp_bulk" && (!companies || !companies.length))) {
      const { data: ipos, error } = await supabase.from("ipos").select(IPO_COLS);
      if (error) return res.status(500).json({ error: error.message });

      const list = ipos || [];
      const results = await processIPOsBounded(list, BULK_CONCURRENCY);
      return res.json({
        job,
        duration_ms: Date.now() - startedAt,
        count: results.length,
        results,
      });
    }

    if (job === "gmp_bulk" && Array.isArray(companies) && companies.length) {
      const { data: ipos, error } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .in("company_name", companies);

      if (error) return res.status(500).json({ error: error.message });

      const found = ipos || [];
      const foundNames = new Set(found.map((r) => r.company_name));
      const missing = companies.filter((c) => !foundNames.has(c));

      const results = await processIPOsBounded(found, BULK_CONCURRENCY);
      return res.json({
        job: "gmp_bulk",
        duration_ms: Date.now() - startedAt,
        requested: companies.length,
        count: results.length,
        missing,
        results,
      });
    }

    return res.status(400).json({
      error: "invalid_job",
      valid_jobs: ["gmp", "gmp_bulk"],
      hint: "POST { job: 'gmp' } to scrape all, or { job: 'gmp_bulk', companies: [..] }",
    });
  } catch (err) {
    console.error("[cron/dispatch] error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IPOgyani worker running on port ${PORT}`);
});
