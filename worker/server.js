const express = require("express");
const cors = require("cors");
const { supabase } = require("./lib/supabase");
const {
  scrapeAllSources,
  aggregateGMP,
  scrapeSubscriptionAllSources,
  aggregateSubscription,
} = require("./scrapers");

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;
const BULK_CONCURRENCY = Number(process.env.BULK_CONCURRENCY || 3);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.use((err, _req, res, next) => {
  if (err && err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "invalid_json" });
  }
  return next(err);
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason?.message || reason);
});

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err?.message || err);
});

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

app.get("/api/subscription/:company", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });
  try {
    const { company } = req.params;
    const { data, error } = await supabase
      .from("subscription_data")
      .select("*")
      .eq("company_name", company)
      .single();

    if (error || !data) return res.status(404).json({ error: "not_found", company });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/subscription", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });
  try {
    const { data, error } = await supabase
      .from("subscription_data")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- SUMMARY LOGIC ----------------

function gmpStrength(gmp) {
  const v = Number(gmp);
  if (!Number.isFinite(v)) return "Unknown";
  if (v > 50) return "High";
  if (v >= 20) return "Moderate";
  return "Low";
}

function subscriptionStrength(qib) {
  const v = Number(qib);
  if (!Number.isFinite(v)) return "Unknown";
  if (v > 10) return "Strong";
  if (v >= 3) return "Average";
  return "Weak";
}

function overallSignal(gmpLevel, subLevel) {
  if (gmpLevel === "High" && subLevel === "Strong") return "🔥 Strong Listing Potential";
  if (gmpLevel === "Low" || subLevel === "Weak") return "⚠️ Risky";
  if (gmpLevel === "Unknown" && subLevel === "Unknown") return "— No Data";
  return "⚖️ Average";
}

app.get("/api/ipo/summary", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: "database_not_configured" });

  try {
    const [gmpRes, subRes] = await Promise.all([
      supabase.from("ipo_gmp").select("company_name, gmp, scraped_at"),
      supabase.from("subscription_data").select("company_name, qib, nii, retail, total, scraped_at"),
    ]);

    const subByCompany = new Map();
    (subRes.data || []).forEach(r => subByCompany.set(r.company_name, r));

    const gmpByCompany = new Map();
    (gmpRes.data || []).forEach(r => gmpByCompany.set(r.company_name, r));

    const companies = new Set([...gmpByCompany.keys(), ...subByCompany.keys()]);

    const summary = [...companies].map(name => {
      const g = gmpByCompany.get(name) || {};
      const s = subByCompany.get(name) || {};

      const gmp = Number(g.gmp) || null;
      const qib = Number(s.qib) || null;

      const gmp_strength = gmpStrength(gmp);
      const subscription_strength = subscriptionStrength(qib);

      return {
        company_name: name,
        gmp,
        qib,
        signal: overallSignal(gmp_strength, subscription_strength),
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log("IPOgyani worker running on port " + PORT);
});
