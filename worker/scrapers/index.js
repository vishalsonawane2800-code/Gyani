

// Fan-out entry point. Calls the three GMP sources in parallel and
// aggregates non-null numeric results into a single average.

const { scrapeIPOWatch } = require(\"./ipowatch\");
const { scrapeIPOji } = require(\"./ipoji\");
const { scrapeInvestorGain } = require(\"./investorgain\");

const SOURCE_NAMES = [\"ipowatch\", \"ipoji\", \"investorgain\"];

/**
 * Scrape all three sources concurrently using the URLs admin stored
 * in `ipos`. Each scraper independently handles its own missing-URL /
 * fetch / parse failures and returns
 *   { source, gmp: number|null, error: string|null }.
 *
 * @param {{
 *   company_name?: string,
 *   ipowatch_gmp_url?: string|null,
 *   ipoji_gmp_url?: string|null,
 *   investorgain_gmp_url?: string|null,
 * }} ipo
 */
async function scrapeAllSources(ipo) {
  const company = ipo.company_name || null;
  const tasks = [
    scrapeIPOWatch(ipo.ipowatch_gmp_url || null, company),
    scrapeIPOji(ipo.ipoji_gmp_url || null, company),
    scrapeInvestorGain(ipo.investorgain_gmp_url || null),
  ];

  const settled = await Promise.allSettled(tasks);
  return settled.map((result, i) => {
    if (result.status === \"fulfilled\") return result.value;
    return {
      gmp: null,
      source: SOURCE_NAMES[i],
      error:
        (result.reason && result.reason.message) ||
        \"unknown_error\",
    };
  });
}

/**
 * Average the non-null numeric GMPs. Round to nearest integer to match
 * the existing Vercel pipeline's behavior so downstream UI numbers stay
 * stable.
 */
function aggregateGMP(sources) {
  const valid = sources.filter((s) => s && s.gmp !== null && s.gmp !== undefined);
  if (!valid.length) return { gmp: null, gmp_count: 0 };

  const sum = valid.reduce((a, b) => a + Number(b.gmp), 0);
  const avg = sum / valid.length;
  // Keep one decimal precision — ipoji range midpoints can be .5.
  const rounded = Math.round(avg * 100) / 100;
  return { gmp: rounded, gmp_count: valid.length };
}

module.exports = {
  scrapeIPOWatch,
  scrapeIPOji,
  scrapeInvestorGain,
  scrapeAllSources,
  aggregateGMP,
  SOURCE_NAMES,
};
