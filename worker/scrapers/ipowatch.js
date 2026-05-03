import * as cheerio from "cheerio";
import { fetchHtml, parseGmpNumber, nameMatches } from "./_utils.js";

const SOURCE = "ipowatch";
const LIST_URL = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

function toSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function detailUrl(company) {
  return `https://ipowatch.in/${toSlug(company)}-ipo-gmp-grey-market-premium/`;
}

function scanTableForCompany($, company) {
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
  return found;
}

async function tryList(company) {
  try {
    const html = await fetchHtml(LIST_URL);
    const $ = cheerio.load(html);
    return scanTableForCompany($, company);
  } catch (_err) {
    return null;
  }
}

async function tryDetail(company) {
  try {
    const html = await fetchHtml(detailUrl(company));
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

      const firstRow = $table.find("tr").slice(1).first();
      const cells = firstRow
        .find("td")
        .map((_, el) => $(el).text().trim())
        .get();
      if (cells.length <= gmpIdx) return;

      const gmp = parseGmpNumber(cells[gmpIdx]);
      if (gmp !== null) {
        found = { source: SOURCE, gmp, matched_name: company };
      }
    });
    return found;
  } catch (_err) {
    return null;
  }
}

export async function scrape(company) {
  try {
    const fromList = await tryList(company);
    if (fromList) return fromList;

    const fromDetail = await tryDetail(company);
    if (fromDetail) return fromDetail;

    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
