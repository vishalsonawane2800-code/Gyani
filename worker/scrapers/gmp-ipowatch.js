// worker/scrapers/ipowatch.js

import * as cheerio from "cheerio";
import {
  DESKTOP_HEADERS,
  fetchWithRetry,
  namesMatch,
  normalizeName,
  parseGMP,
} from "./_utils.js";

const SOURCE = "ipowatch";
const BASE_LIST_URL =
  "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

function log(...args) {
  console.log(`[${SOURCE}]`, ...args);
}
function warn(...args) {
  console.warn(`[${SOURCE}]`, ...args);
}

// ---------------- COLUMN HELPERS ----------------

function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();

    if (!h.includes("gmp")) continue;

    if (
      h.includes("listing") ||
      h.includes("issue") ||
      h.includes("price") ||
      h.includes("lot") ||
      h.includes("%")
    ) {
      continue;
    }

    return i;
  }
  return -1;
}

function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (h.includes("name") || h.includes("company") || h.includes("ipo")) {
      return i;
    }
  }
  return 0;
}

function rowCells($, tr) {
  const cells = [];
  $(tr)
    .find("td, th")
    .each((_, el) => {
      cells.push($(el).text().replace(/\s+/g, " ").trim());
    });
  return cells;
}

// ---------------- TABLE PARSER ----------------

function parseTable($, $tbl, companyName, label) {
  if (!$tbl || !$tbl.length) return null;

  const headers = rowCells($, $tbl.find("tr").first());
  const gmpIdx = findGMPColumnIndex(headers);

  if (gmpIdx < 0) {
    warn(label, "GMP column not found", headers);
    return null;
  }

  const nameIdx = findNameColumnIndex(headers);
  const target = normalizeName(companyName);

  let found = null;

  $tbl.find("tr").each((i, tr) => {
    if (i === 0 || found !== null) return;

    const cells = rowCells($, tr);
    if (cells.length <= Math.max(gmpIdx, nameIdx)) return;

    const rowName = normalizeName(cells[nameIdx]);

    if (!namesMatch(target, rowName)) return;

    const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true });

    if (gmp !== null) {
      found = gmp;
      log(label, "MATCH:", cells);
      log(label, "GMP:", gmp);
    }
  });

  return found;
}

// ---------------- ARTICLE PARSER ----------------

function parseArticlePage($) {
  let gmp = null;

  $("table").each((_, tbl) => {
    if (gmp !== null) return;

    const $tbl = $(tbl);
    const headers = rowCells($, $tbl.find("tr").first());
    const gmpIdx = findGMPColumnIndex(headers);

    if (gmpIdx < 0) return;

    $tbl.find("tr").each((i, tr) => {
      if (i === 0 || gmp !== null) return;

      const cells = rowCells($, tr);
      if (cells.length <= gmpIdx) return;

      const val = parseGMP(cells[gmpIdx], { dashAsZero: true });

      if (val !== null) gmp = val;
    });
  });

  return gmp;
}

// ---------------- MAIN FUNCTION ----------------

export async function scrapeIPOWatchGMP(ipo) {
  const company = ipo?.company_name || "";
  const url = ipo?.ipowatch_gmp_url || BASE_LIST_URL;

  try {
    const res = await fetchWithRetry(url, {
      headers: DESKTOP_HEADERS,
    });

    if (!res.ok) {
      warn("HTTP error", res.status);
      return { source: SOURCE, gmp: null };
    }

    const html = await res.text();
    log("Fetched HTML length:", html.length);

    const $ = cheerio.load(html);

    let gmp = null;

    if (ipo?.ipowatch_gmp_url) {
      gmp = parseArticlePage($);
    } else {
      const tables = $("table").toArray();

      log("Tables found:", tables.length);

      // Table 0 (live)
      gmp = parseTable($, $(tables[0]), company, "table0");

      // Table 1 (listed)
      if (gmp === null && tables[1]) {
        gmp = parseTable($, $(tables[1]), company, "table1");
      }
    }

    if (gmp === null) {
      warn("No GMP found for:", company);
    } else {
      log("FINAL GMP:", company, gmp);
    }

    return { source: SOURCE, gmp };
  } catch (err) {
    console.error("[ipowatch] ERROR:", err);
    return { source: SOURCE, gmp: null };
  }
}
