import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber } from "./_utils.js";

const SOURCE = "ipowatch";

export async function scrape({ url } = {}) {
  if (!url || typeof url !== "string") {
    return { source: SOURCE, gmp: null, error: "no_url" };
  }

  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    let found = null;

    $("table").each((_, table) => {
      if (found !== null) return;
      const $table = $(table);
      const headers = $table
        .find("tr")
        .first()
        .find("th,td")
        .map((_, el) => $(el).text().trim().toLowerCase())
        .get();

      const gmpIdx = headers.findIndex((h) => h.includes("gmp"));
      if (gmpIdx === -1) return;

      const dataRows = $table.find("tr").slice(1);
      for (let i = 0; i < dataRows.length; i++) {
        const cells = $(dataRows[i])
          .find("td")
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length <= gmpIdx) continue;
        const gmp = parseGmpNumber(cells[gmpIdx]);
        if (gmp !== null) {
          found = { source: SOURCE, gmp };
          break;
        }
      }
    });

    if (found) return found;
    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
