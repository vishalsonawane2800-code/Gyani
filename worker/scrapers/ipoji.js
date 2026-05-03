const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeIPOji(url) {
  if (!url) {
    return { gmp: null, source: "ipoji", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "ipoji", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const cells = $(row).find("td, th");
      cells.each((i, cell) => {
        const text = $(cell).text().toLowerCase();
        if (text.includes("gmp") || text.includes("grey market")) {
          const nextCell = $(cells[i + 1]);
          if (nextCell.length) {
            gmpValue = cleanGMPValue(nextCell.text());
          }
        }
      });
    });

    if (gmpValue === null) {
      $(".gmp-value, .premium-value, [class*='gmp']").each((_, el) => {
        const val = cleanGMPValue($(el).text());
        if (val !== null && gmpValue === null) {
          gmpValue = val;
        }
      });
    }

    if (gmpValue === null) {
      const bodyText = $("body").text();
      const match = bodyText.match(/gmp[:\s]*[₹rs.]?\s*([-+]?\d+)/i);
      if (match) {
        gmpValue = cleanGMPValue(match[1]);
      }
    }

    if (gmpValue !== null) {
      return { gmp: gmpValue, source: "ipoji", error: null };
    }

    return { gmp: null, source: "ipoji", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "ipoji", error: err.message };
  }
}

module.exports = { scrapeIPOji };
