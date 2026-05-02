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

function warn(...args) {
  console.warn(`[${SOURCE}]`, ...args);
}

// Remove date / exchange tail from title
function cleanCardTitle(title) {
  if (!title) return "";

  const cut = title.split(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\b/
  )[0];

  return (cut || title).replace(/\s+/g, " ").trim();
}

export async function scrapeIpojiGMP(ipo) {
  const company = ipo?.company_name || "";

  try {
    const res = await fetchWithRetry(BASE_LIST_URL, {
      headers: DESKTOP_HEADERS,
    });

    if (!res.ok) {
      warn("HTTP error:", res.status);
      return { source: SOURCE, gmp: null };
    }

    const html = await res.text();
    log(`Fetched "${company}" → HTML length: ${html.length}`);

    const $ = cheerio.load(html);

    const cards = $(".ipo-card");
    log(`Cards found: ${cards.length}`);

    if (!cards.length) {
      warn("No ipo-card elements found");
      return { source: SOURCE, gmp: null };
    }

    const targetNorm = normalizeName(company);
    if (!targetNorm) {
      warn("Invalid company name");
      return { source: SOURCE, gmp: null };
    }

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

      // Now inside matched card → find GMP value
      $card.find(".ipo-card-body-stat").each((_, stat) => {
        if (gmp !== null) return;

        const label = $(stat)
          .find(".ipo-card-secondary-label")
          .text()
          .toLowerCase()
          .trim();

        if (!/gmp|premium|grey/.test(label)) return;

        const value = $(stat)
          .find(".ipo-card-body-value")
          .text()
          .trim();

        const parsed = parseGMP(value, { dashAsZero: true });

        if (parsed !== null) {
          gmp = parsed;

          log("MATCHED:", titleRaw);
          log("RAW VALUE:", value);
          log("PARSED GMP:", parsed);
        }
      });
    });

    if (gmp === null) {
      warn(`"${company}" → no GMP found`);
    } else {
      log(`FINAL GMP: ${company} → ${gmp}`);
    }

    return { source: SOURCE, gmp };
  } catch (err) {
    console.error(`[${SOURCE}] ERROR:`, err);
    return { source: SOURCE, gmp: null };
  }
}
