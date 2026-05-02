// IPOWatch GMP scraper — cleaned version

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

function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim();
    if (!/\bgmp\b/.test(h)) continue;
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue;
    return i;
  }
  return -1;
}

function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (/ipo\s*name|company|name/.test(h)) return i;
  }
  return 0;
}

function rowCells($, tr) {
  const cells = [];
  $(tr)
    .find("td, th")
    .each((_, el) => cells.push($(el).text().replace(/\s+/g, " ").trim()));
  return cells;
}

function parseTable($, $tbl, targetName, label) {
  if (!$tbl || !$tbl.length) return null;

  const headers = rowCells($, $tbl.find("tr").first());
  const gmpIdx = findGMPColumnIndex(headers);
  if (gmpIdx < 0) return null;

  const nameIdx = findNameColumnIndex(headers);
  const normalizedTarget = normalizeName(targetName);

  let foundGMP = null;

  $tbl.find("tr").each((rowIdx, tr) => {
    if (rowIdx === 0 || foundGMP !== null) return;

    const cells = rowCells($, tr);
    if (cells.length <= Math.max(gmpIdx, nameIdx)) return;

    const rowName = normalizeName(cells[nameIdx]);
    if (!namesMatch(normalizedTarget, rowName)) return;

    const gmp = parseGMP(cells[gmpIdx], { dashAsZero: true });
    if (gmp !== null) foundGMP = gmp;
  });

  return foundGMP;
}

export async function scrapeIPOWatchGMP(ipo) {
  const company_name = ipo?.company_name || "";
  const url = ipo?.ipowatch_gmp_url || BASE_LIST_URL;

  try {
    const res = await fetchWithRetry(url, { headers: DESKTOP_HEADERS });
    if (!res.ok) {
      warn(`HTTP ${res.status}`);
      return { source: SOURCE, gmp: null };
    }

    const html = await res.text();
    const $ = cheerio.load(html);

    const tables = $("table").toArray();

    let gmp = null;

    if (tables[0]) {
      gmp = parseTable($, $(tables[0]), company_name, "live");
    }

    if (gmp === null && tables[1]) {
      gmp = parseTable($, $(tables[1]), company_name, "listed");
    }

    return { source: SOURCE, gmp };
  } catch (err) {
    console.error("[ipowatch] error:", err);
    return { source: SOURCE, gmp: null };
  }
}
