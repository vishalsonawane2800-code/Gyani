const { fetchPage, parseHTML, parseGMP, normalizeName, namesMatch } = require("./_utils");

function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase().trim();
    if (!/\bgmp\b/.test(h)) continue;
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue;
    return i;
  }
  return -1;
}

function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || "").toLowerCase();
    if (/ipo\s*name|company|name/.test(h)) return i;
  }
  return 0;
}

function parseListingTable($, targetName) {
  const targetNorm = normalizeName(targetName);
  if (!targetNorm) return null;

  let foundGMP = null;

  $("table").each((_, tbl) => {
    if (foundGMP !== null) return;
    const $tbl = $(tbl);

    const headerCells = $tbl.find("tr").first().find("th, td");
    const headers = [];
    headerCells.each((_, el) => {
      headers.push($(el).text().replace(/\s+/g, " ").trim());
    });
    if (!headers.length) return;

    const gmpIdx = findGMPColumnIndex(headers);
    if (gmpIdx < 0) return;
    const nameIdx = findNameColumnIndex(headers);

    $tbl.find("tr").each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      if (foundGMP !== null) return;

      const cells = [];
      $(tr).find("td, th").each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, " ").trim());
      });
      if (cells.length <= Math.max(gmpIdx, nameIdx)) return;

      const rowName = normalizeName(cells[nameIdx]);
      if (!namesMatch(targetNorm, rowName)) return;

      const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true });
      if (gmp !== null) foundGMP = gmp;
    });
  });

  return foundGMP;
}

function parseArticlePage($) {
  let gmp = null;

  $("table").each((_, tbl) => {
    if (gmp !== null) return;
    const $tbl = $(tbl);

    const headers = [];
    $tbl.find("tr").first().find("th, td").each((_, el) => {
      headers.push($(el).text().replace(/\s+/g, " ").trim());
    });
    const gmpIdx = findGMPColumnIndex(headers);
    if (gmpIdx < 0) return;

    $tbl.find("tr").each((rowIdx, tr) => {
      if (rowIdx === 0) return;
      if (gmp !== null) return;

      const cells = [];
      $(tr).find("td, th").each((_, el) => {
        cells.push($(el).text().replace(/\s+/g, " ").trim());
      });
      if (cells.length <= gmpIdx) return;

      const parsed = parseGMP(cells[gmpIdx], { dashAsZero: true });
      if (parsed !== null) gmp = parsed;
    });
  });

  return gmp;
}

function looksLikeListingPage(url) {
  return /ipo-grey-market-premium|gmp-latest|grey-market-premium-latest/i.test(url);
}

async function scrapeIPOWatch(url, companyName) {
  if (!url) {
    return { gmp: null, source: "ipowatch", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);
  if (error || !html) {
    return { gmp: null, source: "ipowatch", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);

    let gmp;
    if (looksLikeListingPage(url) && companyName) {
      gmp = parseListingTable($, companyName);
      if (gmp === null) gmp = parseArticlePage($);
    } else {
      gmp = parseArticlePage($);
      if (gmp === null && companyName) {
        gmp = parseListingTable($, companyName);
      }
    }

    if (gmp !== null) return { gmp, source: "ipowatch", error: null };
    return { gmp: null, source: "ipowatch", error: "not_found" };
  } catch (err) {
    return {
      gmp: null,
      source: "ipowatch",
      error: err && err.message ? err.message : "parse_error",
    };
  }
}

module.exports = { scrapeIPOWatch };
