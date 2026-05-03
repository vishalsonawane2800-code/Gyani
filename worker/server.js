
"const express = require(\"express\");
const cors = require(\"cors\");
const { supabase } = require(\"./lib/supabase\");
const {
  scrapeAllSources,
  aggregateGMP,
  scrapeSubscriptionAllSources,
  aggregateSubscription,
} = require(\"./scrapers\");

const app = express();
const PORT = process.env.PORT || 3000;
const CRON_SECRET = process.env.CRON_SECRET;
const BULK_CONCURRENCY = Number(process.env.BULK_CONCURRENCY || 3);

app.use(cors());
app.use(express.json({ limit: \"1mb\" }));

app.use((err, _req, res, next) => {
  if (err && err.type === \"entity.parse.failed\") {
    return res.status(400).json({ error: \"invalid_json\" });
  }
  return next(err);
});

process.on(\"unhandledRejection\", (reason) => {
  console.error(\"[unhandledRejection]\", reason && reason.message ? reason.message : reason);
});

process.on(\"uncaughtException\", (err) => {
  console.error(\"[uncaughtException]\", err && err.message ? err.message : err);
});

app.get(\"/health\", (_req, res) => {
  res.json({ status: \"ok\", timestamp: new Date().toISOString() });
});

app.get(\"/test\", (_req, res) => {
  res.json({
    status: \"ok\",
    message: \"IPOgyani worker is running\",
    env: {
      supabase_configured: !!supabase,
      cron_secret_configured: !!CRON_SECRET,
      bulk_concurrency: BULK_CONCURRENCY,
    },
  });
});

app.get(\"/api/gmp/:company\", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });
  try {
    const { company } = req.params;
    const { data, error } = await supabase
      .from(\"ipo_gmp\")
      .select(\"*\")
      .eq(\"company_name\", company)
      .single();

    if (error || !data) return res.status(404).json({ error: \"not_found\", company });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(\"/api/gmp\", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });
  try {
    const { data, error } = await supabase
      .from(\"ipo_gmp\")
      .select(\"*\")
      .order(\"scraped_at\", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(\"/api/subscription/:company\", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });
  try {
    const { company } = req.params;
    const { data, error } = await supabase
      .from(\"subscription_data\")
      .select(\"*\")
      .eq(\"company_name\", company)
      .single();

    if (error || !data) return res.status(404).json({ error: \"not_found\", company });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get(\"/api/subscription\", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });
  try {
    const { data, error } = await supabase
      .from(\"subscription_data\")
      .select(\"*\")
      .order(\"scraped_at\", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// Aggregated summary endpoint (frontend dashboard)
// GET /api/ipo/summary
// Combines ipo_gmp + subscription_data on company_name and adds derived
// signals (gmp_strength, subscription_strength, signal). Read-only.
// ---------------------------------------------------------------------------
function gmpStrength(gmp) {
  const v = Number(gmp);
  if (!Number.isFinite(v)) return \"Unknown\";
  if (v > 50) return \"High\";
  if (v >= 20) return \"Moderate\";
  return \"Low\";
}

function subscriptionStrength(qib) {
  const v = Number(qib);
  if (!Number.isFinite(v)) return \"Unknown\";
  if (v > 10) return \"Strong\";
  if (v >= 3) return \"Average\";
  return \"Weak\";
}

function overallSignal(gmpLevel, subLevel) {
  if (gmpLevel === \"High\" && subLevel === \"Strong\") return \"🔥 Strong Listing Potential\";
  if (gmpLevel === \"Low\" || subLevel === \"Weak\") return \"⚠️ Risky\";
  if (gmpLevel === \"Unknown\" && subLevel === \"Unknown\") return \"— No Data\";
  return \"⚖️ Average\";
}

app.get(\"/api/ipo/summary\", async (_req, res) => {
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });
  try {
    const [gmpRes, subRes] = await Promise.all([
      supabase
        .from(\"ipo_gmp\")
        .select(\"company_name, gmp, sources, scraped_at\")
        .order(\"scraped_at\", { ascending: false }),
      supabase
        .from(\"subscription_data\")
        .select(\"company_name, qib, nii, retail, total, scraped_at\")
        .order(\"scraped_at\", { ascending: false }),
    ]);

    if (gmpRes.error) return res.status(500).json({ error: gmpRes.error.message });
    if (subRes.error) return res.status(500).json({ error: subRes.error.message });

    const subByCompany = new Map();
    for (const row of subRes.data || []) {
      if (!subByCompany.has(row.company_name)) subByCompany.set(row.company_name, row);
    }
    const gmpByCompany = new Map();
    for (const row of gmpRes.data || []) {
      if (!gmpByCompany.has(row.company_name)) gmpByCompany.set(row.company_name, row);
    }

    const allCompanies = new Set([...gmpByCompany.keys(), ...subByCompany.keys()]);

    const summary = Array.from(allCompanies).map((company_name) => {
      const g = gmpByCompany.get(company_name) || {};
      const s = subByCompany.get(company_name) || {};

      const gmp = g.gmp != null ? Number(g.gmp) : null;
      const qib = s.qib != null ? Number(s.qib) : null;
      const nii = s.nii != null ? Number(s.nii) : null;
      const retail = s.retail != null ? Number(s.retail) : null;
      const total = s.total != null ? Number(s.total) : null;

      const gmp_strength = gmpStrength(gmp);
      const subscription_strength = subscriptionStrength(qib);
      const signal = overallSignal(gmp_strength, subscription_strength);

      return {
        company_name,
        gmp,
        qib,
        nii,
        retail,
        total,
        gmp_strength,
        subscription_strength,
        signal,
        gmp_scraped_at: g.scraped_at || null,
        subscription_scraped_at: s.scraped_at || null,
      };
    });

    // Sort: rows with strongest signal first, then by gmp desc, then by qib desc.
    const signalRank = {
      \"🔥 Strong Listing Potential\": 0,
      \"⚖️ Average\": 1,
      \"⚠️ Risky\": 2,
      \"— No Data\": 3,
    };
    summary.sort((a, b) => {
      const r = (signalRank[a.signal] ?? 9) - (signalRank[b.signal] ?? 9);
      if (r !== 0) return r;
      const ga = a.gmp == null ? -Infinity : a.gmp;
      const gb = b.gmp == null ? -Infinity : b.gmp;
      if (gb !== ga) return gb - ga;
      const qa = a.qib == null ? -Infinity : a.qib;
      const qb = b.qib == null ? -Infinity : b.qib;
      return qb - qa;
    });

    res.set(\"Cache-Control\", \"public, max-age=60\");
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const IPO_COLS = \"company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url, chittorgarh_url, investorgain_sub_url\";


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
    .from(\"ipo_gmp\")
    .upsert(result, { onConflict: \"company_name\" });

  if (error) {
    console.error(\"Failed to save GMP for \" + ipoConfig.company_name + \":\", error.message);
    return Object.assign({}, result, { save_error: error.message });
  }
  return result;
}

async function processSubscriptionIPO(ipoConfig) {
  const sources = await scrapeSubscriptionAllSources(ipoConfig);
  const agg = aggregateSubscription(sources);

  const row = {
    company_name: ipoConfig.company_name,
    qib: agg.qib,
    nii: agg.nii,
    retail: agg.retail,
    total: agg.total,
    scraped_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(\"subscription_data\")
    .upsert(row, { onConflict: \"company_name\" });

  if (error) {
    console.error(\"Failed to save subscription for \" + ipoConfig.company_name + \":\", error.message);
    return Object.assign({}, row, { sources: sources, save_error: error.message });
  }
  return Object.assign({}, row, { sources: sources });
}

async function processItemsBounded(items, concurrency, handler, errorShapeFn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      try {
        results[idx] = await handler(items[idx]);
      } catch (err) {
        results[idx] = errorShapeFn(items[idx], err);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

function gmpErrorShape(ipo, err) {
  return {
    company_name: ipo.company_name,
    sources: [],
    gmp: null,
    gmp_count: 0,
    scraped_at: new Date().toISOString(),
    error: err && err.message ? err.message : \"process_error\",
  };
}

function subscriptionErrorShape(ipo, err) {
  return {
    company_name: ipo.company_name,
    qib: null,
    nii: null,
    retail: null,
    total: null,
    scraped_at: new Date().toISOString(),
    sources: [],
    error: err && err.message ? err.message : \"process_error\",
  };
}

function verifyCronAuth(req) {
  if (!CRON_SECRET) return true;
  const header = req.headers.authorization || \"\";
  if (!header.startsWith(\"Bearer \")) return false;
  return header.slice(\"Bearer \".length) === CRON_SECRET;
}

app.post(\"/api/cron/dispatch\", async (req, res) => {
  if (!verifyCronAuth(req)) return res.status(401).json({ error: \"unauthorized\" });
  if (!supabase) return res.status(503).json({ error: \"database_not_configured\" });

  const body = req.body || {};
  const job = body.job;
  const company_name = body.company_name;
  const companies = body.companies;
  const startedAt = Date.now();

  console.log(\"[cron/dispatch] job=\" + String(job || \"none\") +
    (company_name ? \" company=\" + company_name : \"\") +
    (Array.isArray(companies) ? \" companies=\" + companies.length : \"\"));

  try {
    if (job === \"gmp\" && company_name) {
      const { data: ipoConfig, error } = await supabase
        .from(\"ipos\")
        .select(IPO_COLS)
        .eq(\"company_name\", company_name)
        .single();

      if (error || !ipoConfig) {
        return res.status(404).json({ error: \"ipo_not_found\", company_name: company_name });
      }
      const result = await processIPO(ipoConfig);
      return res.json({ job: \"gmp\", duration_ms: Date.now() - startedAt, result: result });
    }

    if (job === \"gmp\" || (job === \"gmp_bulk\" && (!companies || !companies.length))) {
      const { data: ipos, error } = await supabase.from(\"ipos\").select(IPO_COLS);
      if (error) return res.status(500).json({ error: error.message });

      const list = ipos || [];
      const results = await processItemsBounded(list, BULK_CONCURRENCY, processIPO, gmpErrorShape);
      return res.json({
        job: job,
        duration_ms: Date.now() - startedAt,
        count: results.length,
        results: results,
      });
    }

    if (job === \"gmp_bulk\" && Array.isArray(companies) && companies.length) {
      const { data: ipos, error } = await supabase
        .from(\"ipos\")
        .select(IPO_COLS)
        .in(\"company_name\", companies);

      if (error) return res.status(500).json({ error: error.message });

      const found = ipos || [];
      const foundNames = new Set(found.map((r) => r.company_name));
      const missing = companies.filter((c) => !foundNames.has(c));

      const results = await processItemsBounded(found, BULK_CONCURRENCY, processIPO, gmpErrorShape);
      return res.json({
        job: \"gmp_bulk\",
        duration_ms: Date.now() - startedAt,
        requested: companies.length,
        count: results.length,
        missing: missing,
        results: results,
      });
    }

    if (job === \"subscription\" && company_name) {
      const { data: ipoConfig, error } = await supabase
        .from(\"ipos\")
        .select(IPO_COLS)
        .eq(\"company_name\", company_name)
        .single();

      if (error || !ipoConfig) {
        return res.status(404).json({ error: \"ipo_not_found\", company_name: company_name });
      }
      const result = await processSubscriptionIPO(ipoConfig);
      return res.json({ job: \"subscription\", duration_ms: Date.now() - startedAt, result: result });
    }

    if (job === \"subscription\" || (job === \"subscription_bulk\" && (!companies || !companies.length))) {
      const { data: ipos, error } = await supabase.from(\"ipos\").select(IPO_COLS);
      if (error) return res.status(500).json({ error: error.message });

      const list = ipos || [];
      const results = await processItemsBounded(
        list,
        BULK_CONCURRENCY,
        processSubscriptionIPO,
        subscriptionErrorShape
      );
      return res.json({
        job: job,
        duration_ms: Date.now() - startedAt,
        count: results.length,
        results: results,
      });
    }

    if (job === \"subscription_bulk\" && Array.isArray(companies) && companies.length) {
      const { data: ipos, error } = await supabase
        .from(\"ipos\")
        .select(IPO_COLS)
        .in(\"company_name\", companies);

      if (error) return res.status(500).json({ error: error.message });

      const found = ipos || [];
      const foundNames = new Set(found.map((r) => r.company_name));
      const missing = companies.filter((c) => !foundNames.has(c));

      const results = await processItemsBounded(
        found,
        BULK_CONCURRENCY,
        processSubscriptionIPO,
        subscriptionErrorShape
      );
      return res.json({
        job: \"subscription_bulk\",
        duration_ms: Date.now() - startedAt,
        requested: companies.length,
        count: results.length,
        missing: missing,
        results: results,
      });
    }

    return res.status(400).json({
      error: \"invalid_job\",
      valid_jobs: [\"gmp\", \"gmp_bulk\", \"subscription\", \"subscription_bulk\"],
      hint:
        \"POST { job: 'gmp' } | { job: 'gmp_bulk', companies: [..] } | \" +
        \"{ job: 'subscription' } | { job: 'subscription_bulk', companies: [..] }\",
    });
  } catch (err) {
    console.error(\"[cron/dispatch] error:\", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(\"IPOgyani worker running on port \" + PORT);
  console.log(\"[startup] supabase=\" + (supabase ? \"ok\" : \"missing\") +
    \" cron_secret=\" + (CRON_SECRET ? \"set\" : \"unset\") +
    \" bulk_concurrency=\" + BULK_CONCURRENCY);
});
