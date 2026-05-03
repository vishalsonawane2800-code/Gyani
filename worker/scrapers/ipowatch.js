const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeIPOWatch(url) {
  if (!url) {
    return { gmp: null, source: "ipowatch", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "ipowatch", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().toLowerCase();
        if (label.includes("gmp") || label.includes("grey market premium")) {
          const value = $(cells[1]).text();
          gmpValue = cleanGMPValue(value);
        }
      }
    });

    if (gmpValue === null) {
      $("*").each((_, el) => {
        const text = $(el).text();
        const match = text.match(/gmp[:\s]*[₹rs.]?\s*([-+]?\d+)/i);
        if (match && gmpValue === null) {
          gmpValue = cleanGMPValue(match[1]);
        }
      });
    }

    if (gmpValue !== null) {
      return { gmp: gmpValue, source: "ipowatch", error: null };
    }

    return { gmp: null, source: "ipowatch", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "ipowatch", error: err.message };
  }
}

module.exports = { scrapeIPOWatch };
