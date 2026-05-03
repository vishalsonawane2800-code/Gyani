*")
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
    .from("subscription_data")
    .upsert(row, { onConflict: "company_name" });

  if (error) {
    console.error(`Failed to save subscription for ${ipoConfig.company_name}:`, error.message);
    return { ...row, sources, save_error: error.message };
  }
  return { ...row, sources };
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
    error: err && err.message ? err.message : "process_error",
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
    error: err && err.message ? err.message : "process_error",
  };
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
      const results = await processItemsBounded(list, BULK_CONCURRENCY, processIPO, gmpErrorShape);
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

      const results = await processItemsBounded(found, BULK_CONCURRENCY, processIPO, gmpErrorShape);
      return res.json({
        job: "gmp_bulk",
        duration_ms: Date.now() - startedAt,
        requested: companies.length,
        count: results.length,
        missing,
        results,
      });
    }

    if (job === "subscription" && company_name) {
      const { data: ipoConfig, error } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .eq("company_name", company_name)
        .single();

      if (error || !ipoConfig) {
        return res.status(404).json({ error: "ipo_not_found", company_name });
      }
      const result = await processSubscriptionIPO(ipoConfig);
      return res.json({ job: "subscription", duration_ms: Date.now() - startedAt, result });
    }

    if (job === "subscription" || (job === "subscription_bulk" && (!companies || !companies.length))) {
      const { data: ipos, error } = await supabase.from("ipos").select(IPO_COLS);
      if (error) return res.status(500).json({ error: error.message });

      const list = ipos || [];
      const results = await processItemsBounded(
        list,
        BULK_CONCURRENCY,
        processSubscriptionIPO,
        subscriptionErrorShape
      );
      return res.json({
        job,
        duration_ms: Date.now() - startedAt,
        count: results.length,
        results,
      });
    }

    if (job === "subscription_bulk" && Array.isArray(companies) && companies.length) {
      const { data: ipos, error } = await supabase
        .from("ipos")
        .select(IPO_COLS)
        .in("company_name", companies);

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
        job: "subscription_bulk",
        duration_ms: Date.now() - startedAt,
        requested: companies.length,
        count: results.length,
        missing,
        results,
      });
    }

    return res.status(400).json({
      error: "invalid_job",
      valid_jobs: ["gmp", "gmp_bulk", "subscription", "subscription_bulk"],
      hint:
        "POST { job: 'gmp' } | { job: 'gmp_bulk', companies: [..] } | " +
        "{ job: 'subscription' } | { job: 'subscription_bulk', companies: [..] }",
    });
  } catch (err) {
    console.error("[cron/dispatch] error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`IPOgyani worker running on port ${PORT}`);
});
