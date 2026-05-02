import * as cheerio from "cheerio";

export async function scrapeIPOWatchGMP(companyName) {
  try {
    const url = "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/";

    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);

    let gmp = null;

    $("table tr").each((_, row) => {
      const text = $(row).text().toLowerCase();

      if (text.includes(companyName.toLowerCase())) {
        const match = text.match(/₹\s*(\d+)/);
        if (match) {
          gmp = parseInt(match[1]);
        }
      }
    });

    return gmp;
  } catch (e) {
    console.error("GMP scrape error:", e);
    return null;
  }
}
