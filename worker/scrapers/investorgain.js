import { fetchHtml, parseGmpNumber } from "./_utils.js";

const SOURCE = "investorgain";

function toSlug(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildDetailUrls(company) {
  const slug = toSlug(company);
  return [
    `https://www.investorgain.com/gmp/${slug}-gmp/`,
    `https://www.investorgain.com/gmp/${slug}/`,
    `https://www.investorgain.com/ipo/${slug}/`,
  ];
}

function extractLatestGmpFromJson(html) {
  const arrMatch = html.match(/\\"gmpData\\":\s*\[(.*?)\]/s) || html.match(/"gmpData"\s*:\s*\[(.*?)\]/s);
  if (arrMatch) {
    const block = arrMatch[1];
    const gmpRe = /\\?"gmp\\?"\s*:\s*\\?"?([\d.,]+)\\?"?/g;
    let m;
    while ((m = gmpRe.exec(block)) !== null) {
      const n = parseGmpNumber(m[1]);
      if (n !== null) return n;
    }
  }

  const patterns = [
    /GMP\s*today\s*is\s*[₹Rs.\s]*([\d.,]+)/i,
    /Grey\s*Market\s*Premium[^<]*?is\s*[₹Rs.\s]*([\d.,]+)/i,
    /"current_gmp"\s*:\s*\\?"?([\d.,]+)\\?"?/i,
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
      const gmp = extractLatestGmpFromJson(html);
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
