const { scrapeIPOWatch } = require("./ipowatch");
const { scrapeIPOji } = require("./ipoji");
const { scrapeInvestorGain } = require("./investorgain");

async function scrapeAllSources(urls) {
  const results = await Promise.allSettled([
    scrapeIPOWatch(urls.ipowatch_gmp_url),
    scrapeIPOji(urls.ipoji_gmp_url),
    scrapeInvestorGain(urls.investorgain_gmp_url)
  ]);

  const sources = results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    const sourceNames = ["ipowatch", "ipoji", "investorgain"];
    return { gmp: null, source: sourceNames[index], error: result.reason?.message || "unknown_error" };
  });

  return sources;
}

function aggregateGMP(sources) {
  const validGMPs = sources
    .filter(s => s.gmp !== null && s.error === null)
    .map(s => s.gmp);

  if (validGMPs.length === 0) {
    return { gmp: null, gmp_count: 0 };
  }

  const sum = validGMPs.reduce((a, b) => a + b, 0);
  const avg = Math.round(sum / validGMPs.length);

  return { gmp: avg, gmp_count: validGMPs.length };
}

module.exports = {
  scrapeIPOWatch,
  scrapeIPOji,
  scrapeInvestorGain,
  scrapeAllSources,
  aggregateGMP
};
