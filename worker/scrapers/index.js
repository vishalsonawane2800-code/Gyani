const { scrapeIPOWatch } = require("./ipowatch");
const { scrapeIPOji } = require("./ipoji");
const { scrapeInvestorGain } = require("./investorgain");
const {
  scrapeInvestorGainSubscription,
  scrapeIPOWatchSubscription,
  scrapeIPOjiSubscription,
  scrapeSubscriptionAllSources,
  aggregateSubscription,
  scrapeSubscription,
  saveSubscription,
  SUBSCRIPTION_SOURCE_NAMES,
} = require("./subscription");

const SOURCE_NAMES = ["ipowatch", "ipoji", "investorgain"];

async function scrapeAllSources(ipo) {
  const company = ipo.company_name || null;
  const tasks = [
    scrapeIPOWatch(ipo.ipowatch_gmp_url || null, company),
    scrapeIPOji(ipo.ipoji_gmp_url || null, company),
    scrapeInvestorGain(ipo.investorgain_gmp_url || null),
  ];

  const settled = await Promise.allSettled(tasks);
  return settled.map((result, i) => {
    if (result.status === "fulfilled") return result.value;
    return {
      gmp: null,
      source: SOURCE_NAMES[i],
      error: (result.reason && result.reason.message) || "unknown_error",
    };
  });
}

function aggregateGMP(sources) {
  const valid = sources.filter((s) => s && s.gmp !== null && s.gmp !== undefined);
  if (!valid.length) return { gmp: null, gmp_count: 0 };

  const sum = valid.reduce((a, b) => a + Number(b.gmp), 0);
  const avg = sum / valid.length;
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
  scrapeInvestorGainSubscription,
  scrapeIPOWatchSubscription,
  scrapeIPOjiSubscription,
  scrapeSubscriptionAllSources,
  aggregateSubscription,
  scrapeSubscription,
  saveSubscription,
  SUBSCRIPTION_SOURCE_NAMES,
};
