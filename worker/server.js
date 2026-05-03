import express from "express";
import { scrapeAllGMP, scrapeAndSaveGMP } from "./scrapers/index.js";
import { supabase } from "./lib/supabase.js";

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

app.get("/api/gmp", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("ipo_gmp")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message || "db_error" });
    }

    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message || "fetch_failed" });
  }
});

function requireCronAuth(req, res, next) {
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return res.status(500).json({ error: "CRON_SECRET not configured" });
  }

  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token || token !== expected) {
    return res.status(401).json({ error: "unauthorized" });
  }

  next();
}

app.post("/api/cron/dispatch", requireCronAuth, async (req, res) => {
  try {
    const { job, company_name, companies } = req.body || {};

    if (!job) {
      return res.status(400).json({ error: "job is required" });
    }

    if (job === "gmp") {
      if (!company_name) {
        return res.status(400).json({ error: "job and company_name are required" });
      }

      const { result, saved } = await scrapeAndSaveGMP(company_name);
      return res.json({ ok: true, job, result, saved });
    }

    if (job === "gmp_bulk") {
      if (!Array.isArray(companies) || companies.length === 0) {
        return res.status(400).json({ error: "companies array is required" });
      }

      const results = [];

      for (const name of companies) {
        try {
          const { result, saved } = await scrapeAndSaveGMP(name);
          results.push({ company_name: name, ok: true, result, saved });
        } catch (err) {
          results.push({
            company_name: name,
            ok: false,
            error: err.message || "scrape_failed",
          });
        }
      }

      return res.json({
        ok: true,
        job,
        count: results.length,
        results,
      });
    }

    return res.status(400).json({ error: `unsupported job: ${job}` });
  } catch (err) {
    res.status(500).json({ error: err.message || "dispatch_failed" });
  }
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`worker listening on ${PORT}`);
});
