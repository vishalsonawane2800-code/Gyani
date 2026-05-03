const { fetchPage, parseHTML, normalizeName, namesMatch } = require("./_utils");
const { supabase } = require("../lib/supabase");

const SOURCE_NAMES = ["investorgain", "ipowatch", "ipoji"];

const ZERO_PLACEHOLDER_RE =
  /^(?:--|[-\u2013\u2014\u2212]|n\/?a|nil|none|not\s*available)$/i;

function parseSubscriptionTimes(input) {
  if (input === null || input === undefined) return null;
  try {
    const trimmed = String(input).trim();
    if (!trimmed) return null;

    const cleaned = trimmed
      .toLowerCase()
      .replace(/times|x\b/gi, "")
      .replace(/,/g, "")
      .trim();

    if (!cleaned) return null;
    if (ZERO_PLACEHOLDER_RE.test(cleaned)) return null;

    const match = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    if (!Number.isFinite(num)) return null;
    if (num < 0 || num >= 10000) return null;
    return num;
  } catch {
    return null;
  }
}

function categorize(rawLabel) {
  const l = String(rawLabel || "").toLowerCase().trim();
  if (!l) return null;

  if (/\bissue\s+size\b/.test(l)) return null;
  if (/\btotal\s+(income|assets|amount|equity|liabilities|expenses|shares?|issue)\b/.test(l)) return null;
  if (/\bshares?\s+offered\b/.test(l)) return null;
  if (/\bshares?\s+bid\b/.test(l)) return null;
  if (/\bamount\b/.test(l) && !/\bsubscri/.test(l)) return null;
  if (/\banchor\b/.test(l) && !/ex[\s-]*anchor/.test(l)) return null;
  if (/\bemployee|reservation\b/.test(l)) return null;
  if (/\bmarket\s+cap\b/.test(l)) return null;

  if (/^total$/i.test(l)) return "total";
  if (/^total[\s(]/.test(l)) return "total";
  if (/\b(grand\s+total|overall|aggregate|subscription\s+total)\b/.test(l)) return "total";
  if (/^total\s+(subscrib|subscri)/.test(l)) return "total";

  if (/\bqib\b/.test(l)) return "qib";
  if (/qualified[\s-]*institutional/.test(l)) return "qib";
  if (/\binstitutional\s+investors?\b/.test(l) && !/non[\s-]*institutional/.test(l)) return "qib";

  if (/non[\s-]*institutional/.test(l)) return "nii";
  if (/\bnii\b/.test(l)) return "nii";
  if (/\bhni\b/.test(l)) return "nii";
  if (/^other\s+investors?$/.test(l)) return "nii";

  if (/\bretail\b/.test(l)) return "retail";
  if (/\brii\b/.test(l)) return "retail";
  if (/retail[\s-]*individual/.test(l)) return "retail";

  return null;
}

function isSubscriptionHeader(headers) {
  const joined = headers.join(" | ").toLowerCase();
  if (!/subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(joined)) return false;
  if (/gmp|grey\s*market/.test(joined) && !/subscri/.test(joined)) return false;
  return true;
}

function tableContextMentionsSubscription($, tbl) {
  const $tbl = $(tbl);
  const caption = $tbl.find("caption").first().text();
  const prevHeading = $tbl.prevAll("h1, h2, h3, h4, h5, h6, strong, p").first().text();
  const containerHeading = $tbl
    .parent()
    .prevAll("h1, h2, h3, h4, h5, h6, strong, p")
    .first()
    .text();
  const joined = `${caption} ${prevHeading} ${containerHeading}`.toLowerCase();
  return /subscri|oversubscribed|live\s+ipo|ipo\s+live/.test(joined);
}

function pickTimes(cells, headers) {
  for (let i = 0; i < cells.length; i++) {
    const h = (headers[i] || "").toLowerCase();
    if (!h) continue;
    if (
      /subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(h) &&
      !/shares?|amount/.test(h)
    ) {
      const n = parseSubscriptionTimes(cells[i]);
      if (n !== null) return n;
    }
  }
  for (let i = cells.length - 1; i >= 0; i--) {
    const raw = String(cells[i] || "").trim();
    if (!raw) continue;
    if (/\u20B9|\brs\.?\b|\bcr\b|crore|lakh|lac/i.test(raw)) continue;
    if (/,\d{3}/.test(raw)) continue;
    const n = parseSubscriptionTimes(raw);
    if (n !== null) return n;
  }
  return null;
}

function parseSubscriptionTables($, options = {}) {
  const targetNorm = options.targetName ? normalizeName(options.targetName) : null;
  const out = { qib: null, nii: null, retail: null, total: null };

  $("table").each((_, tbl) => {
    const $tbl = $(tbl);

    const headers = [];
    $tbl.find("tr").first().find("th, td").each((_i, el) => {
      headers.push($(el).text().replace(/\s+/g, " ").trim());
    });

    const isSub = isSubscriptionHeader(headers) || tableContextMentionsSubscription($, tbl);
    if (!isSub) return;

    if (targetNorm) {
      const tblText = normalizeName($tbl.text());
      const prevText = normalizeName(
        $tbl.prevAll("h1, h2, h3, h4, h5, h6, strong, p").first().text()
      );
      const contextText = `${tblText} ${prevText}`;
      if (contextText && !namesMatch(targetNorm, contextText) && !contextText.includes(targetNorm)) {
        // continue anyway — many pages are single-IPO article pages
      }
    }

    $tbl.find("tr").each((idx, tr) => {
      if (idx === 0) return;
      const cells = [];
      $(tr).find("td, th").each((_j, el) => {
        cells.push($(el).text().replace(/\s+/g, " ").trim());
      });
      if (cells.length < 2) return;

      const cat = categorize(cells[0]);
      if (!cat) return;
      if (out[cat] !== null) return;

      const times = pickTimes(cells.slice(1), headers.slice(1));
      if (times !== null) out[cat] = times;
    });
  });

  const anyFound =
    out.qib !== null || out.nii !== null || out.retail !== null || out.total !== null;
  return anyFound ? out : null;
}

function extractInvestorGainMetaTotal($) {
  const title = $("title").text() || "";
  const ogTitle = $('meta[property="og:title"]').attr("content") || "";
  const desc = $('meta[name="description"]').attr("content") || "";
  const ogDesc = $('meta[property="og:description"]').attr("content") || "";
  const blob = [title, ogTitle, desc, ogDesc].join(" ");

  const m = blob.match(/Total:\s*([\d.]+)\s*(?:times|x)/i);
  if (!m) return null;
  return parseSubscriptionTimes(m[1]);
}

function emptyResult(source, error) {
  return { source, qib: null, nii: null, retail: null, total: null, error: error || null };
}

async function scrapeInvestorGainSubscription(url, companyName) {
  if (!url) return emptyResult("investorgain", "no_url");

  const { html, error } = await fetchPage(url);
  if (error || !html) return emptyResult("investorgain", error || "fetch_failed");

  try {
    const $ = parseHTML(html);

    const fromTables = parseSubscriptionTables($, { targetName: companyName });
    const metaTotal = extractInvestorGainMetaTotal($);

    const result = fromTables || { qib: null, nii: null, retail: null, total: null };
    if (result.total === null && metaTotal !== null) result.total = metaTotal;

    const anyFound =
      result.qib !== null ||
      result.nii !== null ||
      result.retail !== null ||
      result.total !== null;

    if (!anyFound) return emptyResult("investorgain", "not_found");
    return { source: "investorgain", ...result, error: null };
  } catch (err) {
    return emptyResult("investorgain", (err && err.message) || "parse_error");
  }
}

async function scrapeIPOWatchSubscription(url, companyName) {
  if (!url) return emptyResult("ipowatch", "no_url");

  const { html, error } = await fetchPage(url);
  if (error || !html) return emptyResult("ipowatch", error || "fetch_failed");

  try {
    const $ = parseHTML(html);
    const parsed = parseSubscriptionTables($, { targetName: companyName });
    if (!parsed) return emptyResult("ipowatch", "not_found");
    return { source: "ipowatch", ...parsed, error: null };
  } catch (err) {
    return emptyResult("ipowatch", (err && err.message) || "parse_error");
  }
}

async function scrapeIPOjiSubscription(url, companyName) {
  if (!url) return emptyResult("ipoji", "no_url");

  const { html, error } = await fetchPage(url);
  if (error || !html) return emptyResult("ipoji", error || "fetch_failed");

  try {
    const $ = parseHTML(html);

    let parsed = parseSubscriptionTables($, { targetName: companyName });

    if (!parsed) {
      const out = { qib: null, nii: null, retail: null, total: null };
      const targetNorm = companyName ? normalizeName(companyName) : null;

      $(".ipo-card").each((_, card) => {
        const $card = $(card);
        if (targetNorm) {
          const titleRaw = $card
            .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
            .first()
            .text()
            .replace(/\s+/g, " ")
            .trim();
          if (!titleRaw) return;
          const titleNorm = normalizeName(titleRaw);
          if (!namesMatch(targetNorm, titleNorm)) return;
        }

        $card.find(".ipo-card-body-stat").each((_i, s) => {
          const label = $(s).find(".ipo-card-secondary-label").text().trim().toLowerCase();
          const value = $(s).find(".ipo-card-body-value").text().trim();
          if (!label || !value) return;

          if (/\bqib\b|qualified/.test(label)) {
            const n = parseSubscriptionTimes(value);
            if (n !== null && out.qib === null) out.qib = n;
          } else if (/non[\s-]*institutional|\bnii\b|\bhni\b/.test(label)) {
            const n = parseSubscriptionTimes(value);
            if (n !== null && out.nii === null) out.nii = n;
          } else if (/\bretail\b|\brii\b/.test(label)) {
            const n = parseSubscriptionTimes(value);
            if (n !== null && out.retail === null) out.retail = n;
          } else if (/subscri|total|overall/.test(label)) {
            const n = parseSubscriptionTimes(value);
            if (n !== null && out.total === null) out.total = n;
          }
        });
      });

      const anyFound =
        out.qib !== null || out.nii !== null || out.retail !== null || out.total !== null;
      parsed = anyFound ? out : null;
    }

    if (!parsed) return emptyResult("ipoji", "not_found");
    return { source: "ipoji", ...parsed, error: null };
  } catch (err) {
    return emptyResult("ipoji", (err && err.message) || "parse_error");
  }
}

async function scrapeSubscriptionAllSources(ipo) {
  const company = ipo.company_name || null;

  const tasks = [
    scrapeInvestorGainSubscription(ipo.investorgain_gmp_url || null, company),
    scrapeIPOWatchSubscription(ipo.ipowatch_gmp_url || null, company),
    scrapeIPOjiSubscription(ipo.ipoji_gmp_url || null, company),
  ];

  const settled = await Promise.allSettled(tasks);
  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return emptyResult(SOURCE_NAMES[i], (result.reason && result.reason.message) || "unknown_error");
  });
}

function aggregateSubscription(sources) {
  const out = { qib: null, nii: null, retail: null, total: null };
  const order = ["investorgain", "ipowatch", "ipoji"];
  const byName = Object.fromEntries(sources.map((s) => [s.source, s]));

  for (const name of order) {
    const s = byName[name];
    if (!s) continue;
    for (const field of ["qib", "nii", "retail", "total"]) {
      if (out[field] === null && s[field] !== null && s[field] !== undefined) {
        out[field] = Number(s[field]);
      }
    }
  }
  return out;
}

async function scrapeSubscription(companyName) {
  if (!supabase) throw new Error("database_not_configured");

  const { data: ipo, error } = await supabase
    .from("ipos")
    .select("company_name, ipowatch_gmp_url, ipoji_gmp_url, investorgain_gmp_url")
    .eq("company_name", companyName)
    .single();

  if (error || !ipo) throw new Error(`ipo_not_found: ${companyName}`);

  const sources = await scrapeSubscriptionAllSources(ipo);
  const aggregated = aggregateSubscription(sources);

  return {
    company_name: ipo.company_name,
    qib: aggregated.qib,
    nii: aggregated.nii,
    retail: aggregated.retail,
    total: aggregated.total,
    scraped_at: new Date().toISOString(),
    sources,
  };
}

async function saveSubscription(result) {
  if (!supabase) throw new Error("database_not_configured");

  const row = {
    company_name: result.company_name,
    qib: result.qib,
    nii: result.nii,
    retail: result.retail,
    total: result.total,
    scraped_at: result.scraped_at || new Date().toISOString(),
  };

  const { error } = await supabase
    .from("subscription_data")
    .upsert(row, { onConflict: "company_name" });

  if (error) throw new Error(error.message);
  return row;
}

module.exports = {
  scrapeInvestorGainSubscription,
  scrapeIPOWatchSubscription,
  scrapeIPOjiSubscription,
  scrapeSubscriptionAllSources,
  aggregateSubscription,
  scrapeSubscription,
  saveSubscription,
  SUBSCRIPTION_SOURCE_NAMES: SOURCE_NAMES,
};
