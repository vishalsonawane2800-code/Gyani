import { fetchHtml, parseGmpNumber } from "./_utils.js";

const SOURCE = "ipoji";

export async function scrape({ url } = {}) {
  if (!url || typeof url !== "string") {
    return { source: SOURCE, gmp: null, error: "no_url" };
  }

  try {
    const html = await fetchHtml(url);

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
        if (n !== null) return { source: SOURCE, gmp: n };
      }
    }

    return { source: SOURCE, gmp: null, error: "not_found" };
  } catch (err) {
    return { source: SOURCE, gmp: null, error: err.message || "scrape_failed" };
  }
}
