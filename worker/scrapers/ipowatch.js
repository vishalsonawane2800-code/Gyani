import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber, nameMatches } from "./_utils.js";

const SOURCE = "ipowatch";
const URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

export async function scrape(company) {
  try {
    const html = await fetchHtml(URL);
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

      const nameIdx = headers.findIndex((h) => h.includes("ipo") || h.includes("name"));
      const gmpIdx = headers.findIndex((h) => h.includes("gmp"));
      if (nameIdx === -1 || gmpIdx === -1) return;

      $table.find("tr").slice(1).each((_, tr) => {
        if (found !== null) return;
        const cells = $(tr)
          .find("td")
          .map((_, el) => $(el).text().trim())
          .get();
        if (cells.length <= Math.max(nameIdx, gmpIdx)) return;

        const rowName = cells[nameIdx];
        if (nameMatches(company, rowName)) {
          const gmp = parseGmpNumber(cells[gmpIdx]);
          if (gmp !== null) {
            found = { source: SOURCE, gmp, matched_name: rowName };
          }
        }
      });
    });

    if (found) return found;
    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
