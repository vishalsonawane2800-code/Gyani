const { fetchPage, parseHTML, cleanGMPValue } = require("./_utils");

async function scrapeInvestorGain(url) {
  if (!url) {
    return { gmp: null, source: "investorgain", error: "no_url" };
  }

  const { html, error } = await fetchPage(url);

  if (error || !html) {
    return { gmp: null, source: "investorgain", error: error || "fetch_failed" };
  }

  try {
    const $ = parseHTML(html);
    let gmpValue = null;

    $("table tr").each((_, row) => {
      const rowText = $(row).text().toLowerCase();
      if (rowText.includes("gmp") || rowText.includes("grey market")) {
        const cells = $(row).find("td");
        cells.each((_, cell) => {
          const val = cleanGMPValue($(cell).text());
          if (val !== null && gmpValue === null) {
            gmpValue = val;
          }
        });
      }
    });

    if (gmpValue === null) {
      $("[class*='gmp'], [id*='gmp']").each((_, el) => {
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
      return { gmp: gmpValue, source: "investorgain", error: null };
    }

    return { gmp: null, source: "investorgain", error: "not_found" };
  } catch (err) {
    return { gmp: null, source: "investorgain", error: err.message };
  }
}

module.exports = { scrapeInvestorGain };
