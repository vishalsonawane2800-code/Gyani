import { fetchHtml, parseGmpNumber } from "./_utils.js";

const SOURCE = "ipoji";

function toSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDetailUrls(company) {
  const slug = toSlug(company);
  const urls = new Set();
  urls.add(`https://www.ipoji.com/ipo/${slug}-ipo`);
  urls.add(`https://www.ipoji.com/ipo/${slug}`);
  if (!/-ipo$/.test(slug)) urls.add(`https://www.ipoji.com/ipo/${slug}-ipo`);
  return Array.from(urls);
}

function extractGmpFromHtml(html) {
  const patterns = [
    /GMP\s*today\s*is\s*[₹Rs.\s]*([\d.,]+)/i,
    /Premium\s*\(GMP\)\s*for[^<]*?is\s*[₹Rs.\s]*([\d.,]+)/i,
    /"current_gmp"\s*:\s*"?([\d.,]+)"?/i,
    /"gmp"\s*:\s*"?([\d.,]+)"?/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const n = parseGmpNumber(m[1]);
      if (n !== null) return n;
    }
  }
  return null;
}

export async function scrape(company) {
  const urls = buildDetailUrls(company);
  let lastError = null;

  for (const url of urls) {
    try {
      const html = await fetchHtml(url);
      const gmp = extractGmpFromHtml(html);
      if (gmp !== null) {
        return { source: SOURCE, gmp, matched_name: company };
      }
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError) {
    return { source: SOURCE, gmp: null, error: lastError.message || "scrape_failed" };
  }
  return { source: SOURCE, gmp: null, error: "not_found" };
}
