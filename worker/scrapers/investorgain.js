import { fetchHtml, parseGmpNumber } from "./_utils.js";

const SOURCE = "investorgain";

export async function scrape({ url } = {}) {
  if (!url || typeof url !== "string") {
    return { source: SOURCE, gmp: null, error: "no_url" };
  }

  try {
    const html = await fetchHtml(url);

    const arrMatch =
      html.match(/\\"gmpData\\":\s*\[(.*?)\]/s) ||
      html.match(/"gmpData"\s*:\s*\[(.*?)\]/s);

    if (arrMatch) {
      const block = arrMatch[1];
      const gmpRe = /\\?"gmp\\?"\s*:\s*\\?"?([\d.,]+)\\?"?/g;
      let m;
      while ((m = gmpRe.exec(block)) !== null) {
        const n = parseGmpNumber(m[1]);
        if (n !== null) return { source: SOURCE, gmp: n };
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
        if (n !== null) return { source: SOURCE, gmp: n };
      }
    }

    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
