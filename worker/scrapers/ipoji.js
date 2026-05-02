// worker/scrapers/ipoji.js

import * as cheerio from "cheerio";
import {
  DESKTOP_HEADERS,
  fetchWithRetry,
  namesMatch,
  normalizeName,
  parseGMP,
} from "./_utils.js";

const SOURCE = "ipoji";
const BASE_LIST_URL =
  "https://ipoji.com/grey-market-premium-ipo-gmp-today.html";

function log(...args) {
  console.log(`[${SOURCE}]`, ...args);
}

function cleanCardTitle(title) {
  const cut = title.split(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/
  )[0];

  return (cut || title).replace(/\s+/g, " ").trim();
}

export async function scrapeIpojiGMP(ipo) {
  const company_name = ipo?.company_name || "";

  try {
    const res = await fetchWithRetry(BASE_LIST_URL, {
      headers: DESKTOP_HEADERS,
    });

    if (!res.ok) {
      console.warn(`[${SOURCE}] HTTP ${res.status}`);
      return { source: SOURCE, gmp: null };
    }

    const html = await res.text();
    log(`Fetched "${company_name}" — length=${html.length}`);

    const $ = cheerio.load(html);
    const cards = $(".ipo-card");

    if (!cards.length) return { source: SOURCE, gmp: null };

    const targetNorm = normalizeName(company_name);

    let gmp = null;

    cards.each((_, card) => {
      if (gmp !== null) return;

      const $card = $(card);

      const titleRaw = $card
        .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
        .first()
        .text()
        .replace(/\s+/g, " ")
        .trim();

      if (!titleRaw) return;

      const titleNorm = normalizeName(cleanCardTitle(titleRaw));

      if (!namesMatch(targetNorm, titleNorm)) return;

      $card.find(".ipo-card-body-stat").each((_, stat) => {
        if (gmp !== null) return;

        const label = $(stat)
          .find(".ipo-card-secondary-label")
          .text()
          .toLowerCase();

        if (!/gmp|premium|grey\s*market/.test(label)) return;

        const value = $(stat)
          .find(".ipo-card-body-value")
          .text()
          .trim();

        const parsed = parseGMP(value, { dashAsZero: true });

        if (parsed !== null) {
          gmp = parsed;
          log(`MATCH → ${titleRaw} | ${value} → ${parsed}`);
        }
      });
    });

    if (gmp === null) {
      console.warn(`[${SOURCE}] No GMP found for "${company_name}"`);
    }

    return { source: SOURCE, gmp };
  } catch (err) {
    console.error(`[${SOURCE}] ERROR:`, err);
    return { source: SOURCE, gmp: null };
  }
}
