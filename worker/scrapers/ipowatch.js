
//
// IPOWatch GMP scraper — DB-URL-driven.
// Ported from lib/scraper/sources/gmp-ipowatch.ts.
//
// IMPORTANT (per project handover):
//   - The URL is taken from `ipos.ipowatch_gmp_url`.
//   - We do NOT guess slugs and do NOT fall back to a hard-coded
//     listing URL. If the URL is missing → { gmp: null, error: \"no_url\" }.
//
// IPOWatch publishes GMP in two layouts depending on the URL admin
// stores:
//   1. The site-wide \"Live IPO GMP\" listing page — multiple rows, one per
//      live IPO. We must (a) find the row that matches `company_name`
//      and (b) pick the GMP cell by HEADER LABEL (not by index, because
//      the cell order varies and we previously picked up \"issue price\"
//      instead of \"GMP\").
//   2. A per-IPO article page — one or two small tables; we take the
//      first table whose header column mentions \"GMP\" and read the
//      latest GMP cell.
//
// Contract: never throws. Always returns
//   { gmp: number|null, source: \"ipowatch\", error: string|null }

const { fetchPage, parseHTML, parseGMP, normalizeName, namesMatch } = require(\"./_utils\");

/**
 * Pick the column index that most likely contains today's GMP, given a
 * list of header labels. Prefer headers that contain the word \"gmp\" but
 * REJECT headers about listing / issue-price / lot / subscription / %.
 */
function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || \"\").toLowerCase().trim();
    if (!/\bgmp\b/.test(h)) continue;
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue;
    return i;
  }
  return -1;
}

function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || \"\").toLowerCase();
    if (/ipo\s*name|company|name/.test(h)) return i;
  }
  return 0;
}

/**
 * Listing-page parser. Walks every table on the page; for each table
 * picks the GMP column from its header row, then scans data rows for one
 * whose name column matches `targetName`.
 */
function parseListingTable($, targetName) {
  const targetNorm = normalizeName(targetName);
  if (!targetNorm) return null;

  let foundGMP = null;

  $(\"table\").each((_, tbl) => {
    if (foundGMP !== null) return;
    const $tbl = $(tbl);

    const headerCells = $tbl.find(\"tr\").first().find(\"th, td\");
    const headers = [];
    headerCells.each((_, el) => {
      headers.push($(el).text().replace(/\s+/g, \" \").trim());
    });
    if (!headers.length) return;

    const gmpIdx = findGMPColumnIndex(headers);
    if (gmpIdx < 0) return;
    const nameIdx = findNameColumnIndex(headers);

    $tbl.find(\"tr\").each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      if (foundGMP !== null) return;

      const cells = [];
      $(tr).find(\"td, th\").each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, \" \").trim());
      });
      if (cells.length <= Math.max(gmpIdx, nameIdx)) return;

      const rowName = normalizeName(cells[nameIdx]);
      if (!namesMatch(targetNorm, rowName)) return;

      // Row matched by name → \"-\" means explicitly zero today.
      const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true });
      if (gmp !== null) foundGMP = gmp;
    });
  });

  return foundGMP;
}

/**
 * Per-article-URL parser. Takes the first table whose header has a GMP
 * column and reads the first non-null GMP cell.
 */
function parseArticlePage($) {
  let gmp = null;

  $(\"table\").each((_, tbl) => {
    if (gmp !== null) return;
    const $tbl = $(tbl);

    const headers = [];
    $tbl.find(\"tr\").first().find(\"th, td\").each((_, el) => {
      headers.push($(el).text().replace(/\s+/g, \" \").trim());
    });
    const gmpIdx = findGMPColumnIndex(headers);
    if (gmpIdx < 0) return;

    $tbl.find(\"tr\").each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      if (gmp !== null) return;

      const cells = [];
      $(tr).find(\"td, th\").each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, \" \").trim());
      });
      if (cells.length <= gmpIdx) return;

      // On a per-IPO article page every row IS this IPO → dashAsZero.
      const parsed = parseGMP(cells[gmpIdx], { dashAsZero: true });
      if (parsed !== null) gmp = parsed;
    });
  });

  return gmp;
}

/**
 * Decide whether `url` is a per-IPO article page or the site-wide
 * listing page. The listing page slug is \"ipo-grey-market-premium-...\".
 */
function looksLikeListingPage(url) {
  return /ipo-grey-market-premium|gmp-latest|grey-market-premium-latest/i.test(url);
}

/**
 * Public entry point.
 *
 * @param {string|null} url           ipos.ipowatch_gmp_url
 * @param {string|null} companyName   ipos.company_name (used only for
 *                                    listing-page row matching)
 * @returns {Promise<{gmp:number|null, source:\"ipowatch\", error:string|null}>}
 */
async function scrapeIPOWatch(url, companyName) {
  if (!url) {
    return { gmp: null, source: \"ipowatch\", error: \"no_url\" };
  }

  const { html, error } = await fetchPage(url);
  if (error || !html) {
    return { gmp: null, source: \"ipowatch\", error: error || \"fetch_failed\" };
  }

  try {
    const $ = parseHTML(html);

    let gmp;
    if (looksLikeListingPage(url) && companyName) {
      gmp = parseListingTable($, companyName);
      if (gmp === null) gmp = parseArticlePage($); // belt-and-braces
    } else {
      gmp = parseArticlePage($);
      if (gmp === null && companyName) {
        gmp = parseListingTable($, companyName);
      }
    }

    if (gmp !== null) return { gmp, source: \"ipowatch\", error: null };
    return { gmp: null, source: \"ipowatch\", error: \"not_found\" };
  } catch (err) {
    return {
      gmp: null,
      source: \"ipowatch\",
      error: err && err.message ? err.message : \"parse_error\",
    };
  }
}

module.exports = { scrapeIPOWatch };
