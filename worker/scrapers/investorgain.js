{
  "name": "ipogyani-worker",
  "version": "1.0.0",
  "description": "IPOgyani GMP scraping worker",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "@supabase/supabase-js": "^2.39.0",
    "axios": "^1.6.2",
    "cheerio": "^1.0.0-rc.12"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
worker/railway.json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
worker/server.js
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
worker/lib/supabase.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
} else {
  console.warn("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY - database operations will fail");
}

module.exports = { supabase };
worker/scrapers/index.js
const { scrapeIPOWatch } = require("./ipowatch");
const { scrapeIPOji } = require("./ipoji");
const { scrapeInvestorGain } = require("./investorgain");

async function scrapeAllSources(urls) {
  const results = await Promise.allSettled([
    scrapeIPOWatch(urls.ipowatch_gmp_url),
    scrapeIPOji(urls.ipoji_gmp_url),
    scrapeInvestorGain(urls.investorgain_gmp_url)
  ]);

  const sources = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const sourceNames = ["ipowatch", "ipoji", "investorgain"];
    return { gmp: null, source: sourceNames[index], error: result.reason?.message || "unknown_error" };
  });

  return sources;
}

function aggregateGMP(sources) {
  const validGMPs = sources
    .filter(s => s.gmp !== null && s.error === null)
    .map(s => s.gmp);

  if (validGMPs.length === 0) {
    return { gmp: null, gmp_count: 0 };
  }

  const sum = validGMPs.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / validGMPs.length);

  return { gmp: avg, gmp_count: validGMPs.length };
}

module.exports = {
  scrapeIPOWatch,
  scrapeIPOji,
  scrapeInvestorGain,
  scrapeAllSources,
  aggregateGMP
};
worker/scrapers/_utils.js
const axios = require("axios");
const cheerio = require("cheerio");

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchPage(url, options = {}) {
  try {
    const response = await axios.get(url, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        ...options.headers
      },
      timeout: options.timeout || 15000
    });
    return { html: response.data, error: null };
  } catch (error) {
    return { html: null, error: error.message };
  }
}

function parseHTML(html) {
  return cheerio.load(html);
}

function cleanGMPValue(raw) {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.-]/g, "").trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function normalizeCompanyName(name) {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s*(limited|ltd|ipo)\.?\s*/gi, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

module.exports = {
  fetchPage,
  parseHTML,
  cleanGMPValue,
  normalizeCompanyName,
  USER_AGENT
};
worker/scrapers/ipowatch.js
const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeIPOWatch(url) {
  if (!url) {
    return { gmp: null, source: "ipowatch", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "ipowatch", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().toLowerCase();
        if (label.includes("gmp") || label.includes("grey market premium")) {
          const value = $(cells[1]).text();
          gmpValue = cleanGMPValue(value);
        }
      }
    });

    if (gmpValue === null) {
      $("*").each((_, el) => {
        const text = $(el).text();
        const match = text.match(/gmp[:\s]*[₹rs.]?\s*([-+]?\d+)/i);
        if (match && gmpValue === null) {
          gmpValue = cleanGMPValue(match[1]);
        }
      });
    }

    if (gmpValue !== null) {
      return { gmp: gmpValue, source: "ipowatch", error: null };
    }

    return { gmp: null, source: "ipowatch", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "ipowatch", error: err.message };
  }
}

module.exports = { scrapeIPOWatch };
worker/scrapers/ipoji.js
const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeIPOji(url) {
  if (!url) {
    return { gmp: null, source: "ipoji", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "ipoji", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const cells = $(row).find("td, th");
      cells.each((i, cell) => {
        const text = $(cell).text().toLowerCase();
        if (text.includes("gmp") || text.includes("grey market")) {
          const nextCell = $(cells[i + 1]);
          if (nextCell.length) {
            gmpValue = cleanGMPValue(nextCell.text());
          }
        }
      });
    });

    if (gmpValue === null) {
      $(".gmp-value, .premium-value, [class*='gmp']").each((_, el) => {
        const val = cleanGMPValue($(el).text());
        if (val !== null && gmpValue === null) {
          gmpValue = val;
        }
      });
    }

    if (gmpValue === null) {
      const bodyText = $("body").text();
      const match = bodyText.match(/gmp[:\s]*[₹rs.]?\s*([-+]?\d+)/i);
      if (match) {
        gmpValue = cleanGMPValue(match[1]);
      }
    }

    if (gmpValue !== null) {
      return { gmp: gmpValue, source: "ipoji", error: null };
    }

    return { gmp: null, source: "ipoji", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "ipoji", error: err.message };
  }
}

module.exports = { scrapeIPOji };
worker/scrapers/investorgain.js
const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeInvestorGain(url) {
  if (!url) {
    return { gmp: null, source: "investorgain", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "investorgain", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const rowText = $(row).text().toLowerCase();
      if (rowText.includes("gmp") || rowText.includes("grey market")) {
        const cells = $(row).find("td");
        cells.each((_, cell) => {
          const val = cleanGMPValue($(cell).text());
          if (val !== null && gmpValue === null) {
            gmpValue = val;
          }
        });
      }
    });

    if (gmpValue === null) {
      $("[class*='gmp'], [id*='gmp']").each((_, el) => {
        const val = cleanGMPValue($(el).text());
        if (val !== null && gmpValue === null) {
          gmpValue = val;
        }
      });
    }

    if (gmpValue === null) {
      const bodyText = $("body").text();
      const match = bodyText.match(/gmp[:\s]*[₹rs.]?\s*([-+]?\d+)/i);
      if (match) {
        gmpValue = cleanGMPValue(match[1]);
      }
    }

    if (gmpValue !== null) {
      return { gmp: gmpValue, source: "investorgain", error: null };
    }

    return { gmp: null, source: "investorgain", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "investorgain", error: err.message };
  }
}

module.exports = { scrapeInvestorGain };
