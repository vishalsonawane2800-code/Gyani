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

// ---------------- HEALTH ----------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/test", (_req, res) => {
  res.json({
    status: "ok",
    message: "IPOgyani worker running",
    env: {
      supabase: !!supabase,
      cron: !!CRON_SECRET,
      concurrency: BULK_CONCURRENCY,
    },
  });
});

// ---------------- READ ----------------
app.get("/api/gmp", async (_req, res) => {
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

app.get("/api/gmp/:company", async (req, res) => {
  try {
    const { company } = req.params;

    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .eq("company_name", company)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "not_found" });
    }

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- HELPERS ----------------
const IPO_COLS =
  "company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url";

async function processIPO(ipo) {
  const sources = await scrapeAllSources(ipo);
  const { gmp, gmp_count } = aggregateGMP(sources);

  const result = {
    company_name: ipo.company_name,
    sources,
    gmp,
    gmp_count,
    scraped_at: new Date().toISOString(),
  };

  await supabase.from("ipo_gmp").upsert(result, {
    onConflict: "company_name",
  });

  return result;
}

// ---------------- CRON AUTH ----------------
function verifyCron(req) {
  if (!CRON_SECRET) return true;
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return false;
  return header.slice(7) === CRON_SECRET;
}

// ---------------- CRON ----------------
app.post("/api/cron/dispatch", async (req, res) => {
  if (!verifyCron(req)) return res.status(401).json({ error: "unauthorized" });

  const { job, company_name, companies } = req.body || {};

  try {
    // Single IPO
    if (job === "gmp" && company_name) {
      const { data } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .eq("company_name", company_name)
        .single();

      const result = await processIPO(data);
      return res.json({ job, result });
    }

    // All IPOs
    if (job === "gmp") {
      const { data: ipos } = await supabase
        .from("ipos")
        .select(IPO_COLS);

      const results = [];
      for (const ipo of ipos || []) {
        results.push(await processIPO(ipo));
      }

      return res.json({ job, count: results.length, results });
    }

    // Bulk
    if (job === "gmp_bulk" && Array.isArray(companies)) {
      const { data: ipos } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .in("company_name", companies);

      const results = [];
      for (const ipo of ipos || []) {
        results.push(await processIPO(ipo));
      }

      return res.json({ job, results });
    }

    res.status(400).json({ error: "invalid_job" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IPOgyani worker running on ${PORT}`);
});
