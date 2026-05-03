
// InvestorGain GMP scraper — DB-URL-driven.
// Ported from lib/scraper/sources/gmp-investorgain.ts.
//
// InvestorGain's listing page is SPA-rendered (not useful from a server
// scrape), so admin must store the per-IPO article URL in
// `ipos.investorgain_gmp_url`. If missing → { gmp: null, error: \"no_url\" }.
//
// Strategy:
//   1. Walk all <table> rows; for any row whose joined text mentions
//      \"GMP\" / \"Grey Market Premium\", take the first numeric/dash cell
//      that follows the label cell.
//   2. If no labelled row found, regex the body text for
//      \"GMP: ₹120\" / \"Grey Market Premium Rs 75\" patterns.

const { fetchPage, parseHTML, parseGMP } = require(\"./_utils\");

function extractFromTables($) {
  const rows = $(\"table tr\").toArray();
  for (const tr of rows) {
    const cells = $(tr)
      .find(\"th, td\")
      .toArray()
      .map((c) => $(c).text().replace(/\s+/g, \" \").trim());
    if (!cells.length) continue;

    const rowText = cells.join(\" \").toLowerCase();
    if (!/gmp|grey\s*market\s*premium/.test(rowText)) continue;

    for (let i = 1; i < cells.length; i++) {
      const n = parseGMP(cells[i], { dashAsZero: true });
      if (n !== null) return n;
    }

    const fallback = parseGMP(cells.join(\" \"), { dashAsZero: true });
    if (fallback !== null) return fallback;
  }
  return null;
}

function extractFromText($) {
  const bodyText = $(\"body\").text().replace(/\s+/g, \" \");
  const m = bodyText.match(
    /\b(?:gmp|grey\s*market\s*premium)\b[^0-9\-\u2013\u2014]{0,20}(?:₹|rs\.?|inr)?\s*([\-\u2013\u2014]|\d+(?:\.\d+)?)/i
  );
  if (!m) return null;
  return parseGMP(m[1], { dashAsZero: true });
}

async function scrapeInvestorGain(url) {
  if (!url) {
    return { gmp: null, source: \"investorgain\", error: \"no_url\" };
  }

  const { html, error } = await fetchPage(url);
  if (error || !html) {
    return { gmp: null, source: \"investorgain\", error: error || \"fetch_failed\" };
  }

  try {
    const $ = parseHTML(html);

    let gmp = extractFromTables($);
    if (gmp === null) gmp = extractFromText($);

    if (gmp !== null) return { gmp, source: \"investorgain\", error: null };
    return { gmp: null, source: \"investorgain\", error: \"not_found\" };
  } catch (err) {
    return {
      gmp: null,
      source: \"investorgain\",
      error: err && err.message ? err.message : \"parse_error\",
    };
  }
}
