// worker/scrapers/investorgain.js

import * as cheerio from "cheerio";
import { DESKTOP_HEADERS, fetchWithRetry, parseGMP } from "./_utils.js";

const SOURCE = "investorgain";

function log(...args) {
  console.log(`[${SOURCE}]`, ...args);
}

function warn(...args) {
  console.warn(`[${SOURCE}]`, ...args);
}

// ---------------- TABLE PARSER ----------------

function extractGmpFromTables($) {
  for (const tr of $("table tr").toArray()) {
    const cells = [];

    $(tr)
      .find("th, td")
      .each((_, c) =>
        cells.push($(c).text().replace(/\s+/g, " ").trim())
      );

    if (!cells.length) continue;

    const rowText = cells.join(" ").toLowerCase();

    if (!/gmp|grey\s*market\s*premium/.test(rowText)) continue;

    for (let i = 1; i < cells.length; i++) {
      const parsed = parseGMP(cells[i], { dashAsZero: true });
      if (parsed !== null) {
        log("TABLE MATCH:", cells);
        log("GMP:", parsed);
        return parsed;
      }
    }

    // fallback: full row scan
    const fallback = parseGMP(cells.join(" "), { dashAsZero: true });
    if (fallback !== null) {
      log("TABLE FALLBACK:", fallback);
      return fallback;
    }
  }

  return null;
}

// ---------------- TEXT PARSER ----------------

function extractGmpFromText($) {
  const text = $("body").text().replace(/\s+/g, " ");

  const match = text.match(
    /\b(gmp|grey\s*market\s*premium)\b[^0-9\-–—]{0,30}(₹|rs\.?|inr)?\s*([\-–—]|\d+(?:\.\d+)?)/i
  );

  if (!match) return null;

  const parsed = parseGMP(match[3], { dashAsZero: true });

  if (parsed !== null) {
    log("TEXT MATCH:", parsed);
  }

  return parsed;
}

// ---------------- MAIN FUNCTION ----------------

export async function scrapeInvestorGainGMP(ipo) {
  const url = ipo?.investorgain_gmp_url;

  if (!url) {
    warn("No URL provided");
    return { source: SOURCE, gmp: null };
  }

  try {
    const res = await fetchWithRetry(url, {
      headers: DESKTOP_HEADERS,
    });

    if (!res.ok) {
      warn("HTTP error:", res.status);
      return { source: SOURCE, gmp: null };
    }

    const html = await res.text();
    log("Fetched HTML length:", html.length);

    const $ = cheerio.load(html);

    // 1️⃣ Try table extraction
    const tableVal = extractGmpFromTables($);
    if (tableVal !== null) {
      return { source: SOURCE, gmp: tableVal };
    }

    // 2️⃣ Try text extraction
    const textVal = extractGmpFromText($);
    if (textVal !== null) {
      return { source: SOURCE, gmp: textVal };
    }

    warn("No GMP found at URL:", url);

    return { source: SOURCE, gmp: null };
  } catch (err) {
    console.error(`[${SOURCE}] ERROR:`, err);
    return { source: SOURCE, gmp: null };
  }
}
