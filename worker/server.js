const express = require("express");
const cors = require("cors");
const { supabase } = require("./lib/supabase");
const { scrapeAllSources, aggregateGMP } = require("./scrapers");

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/test", (req, res) => {
  res.json({
    status: "ok",
    message: "IPOgyani worker is running",
    env: {
      supabase_configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY),
      cron_secret_configured: !!CRON_SECRET
    }
  });
});

app.get("/api/gmp/:company", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "database_not_configured" });
  }

  try {
    const { company } = req.params;

    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .eq("company_name", company)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "not_found", company });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/gmp", async (req, res) => {
  if (!supabase) {
    return res.status(503).json({ error: "database_not_configured" });
  }

  try {
    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function processIPO(ipoConfig) {
  const { company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url } = ipoConfig;

  const urls = {
    ipowatch_gmp_url,
    ipoji_gmp_url,
    investorgain_gmp_url
  };

  const sources = await scrapeAllSources(urls);
  const { gmp, gmp_count } = aggregateGMP(sources);

  const result = {
    company_name,
    sources,
    gmp,
    gmp_count,
    scraped_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from("ipo_gmp")
    .upsert(result, { onConflict: "company_name" });

  if (error) {
    console.error(`Failed to save GMP for ${company_name}:`, error.message);
    return { ...result, save_error: error.message };
  }

  return result;
}

function verifyCronAuth(req) {
  const authHeader = req.headers.authorization;
  if (!CRON_SECRET) return true;
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "");
  return token === CRON_SECRET;
}

app.post("/api/cron/dispatch", async (req, res) => {
  if (!verifyCronAuth(req)) {
    return res.status(401).json({ error: "unauthorized" });
  }

  if (!supabase) {
    return res.status(503).json({ error: "database_not_configured" });
  }

  const { job, company_name } = req.body;

  try {
    if (job === "gmp" && company_name) {
      const { data: ipoConfig, error } = await supabase
        .from("ipos")
        .select("company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url")
        .eq("company_name", company_name)
        .single();

      if (error || !ipoConfig) {
        return res.status(404).json({ error: "ipo_not_found", company_name });
      }

      const result = await processIPO(ipoConfig);
      return res.json({ job: "gmp", result });
    }

    if (job === "gmp_bulk") {
      const { data: ipos, error } = await supabase
        .from("ipos")
        .select("company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url");

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      const results = [];
      for (const ipo of ipos || []) {
        const result = await processIPO(ipo);
        results.push(result);
      }

      return res.json({ job: "gmp_bulk", count: results.length, results });
    }

    return res.status(400).json({ error: "invalid_job", valid_jobs: ["gmp", "gmp_bulk"] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IPOgyani worker running on port ${PORT}`);
});
