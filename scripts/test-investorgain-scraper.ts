import { scrapeInvestorGainSubscription } from "@/lib/scraper/sources/subscription-investorgain"

async function test() {
  console.log("[v0] Testing InvestorGain scraper...")

  // Test with Adisoft Technologies (NSE SME, open)
  const result = await scrapeInvestorGainSubscription({
    investorgain_sub_url:
      "https://www.investorgain.com/subscription/adisoft-technologies-ipo/2042/",
  })

  console.log("[v0] Adisoft result:", result)

  if (result && result.total != null) {
    console.log("[v0] ✓ Successfully extracted subscription:", result.total)
  } else {
    console.log("[v0] ✗ Failed to extract subscription data")
  }
}

test().catch(console.error)
