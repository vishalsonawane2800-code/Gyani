/**
 * Diff probe: dump ipoji cards for targets so we can find a stable marker
 * separating "active IPO, no premium row" (Citius Transnet) from
 * "post-close IPO" (PropShare Celestia).
 */
import * as cheerio from "cheerio"
import { fetchWithRetry } from "../lib/scraper/base"

const URL = "https://ipoji.com/grey-market-premium-ipo-gmp-today.html"

async function main() {
  const html = await fetchWithRetry(URL)
  const $ = cheerio.load(html)
  const cards = $(".ipo-card, article.ipo-card, [class*='ipo-card']")
  console.log("total card elements:", cards.length)

  const targets = ["citius", "propshare"]
  let dumped = 0

  cards.each((_, card) => {
    const $card = $(card)
    const fullText = $card.text().replace(/\s+/g, " ").trim().toLowerCase()
    if (!targets.some((t) => fullText.includes(t))) return

    // Only dump the card once (outer + inner will both match the text
    // filter; skip inner duplicates by requiring a direct title tag).
    const title = $card
      .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim()
    if (!title) return
    const lower = title.toLowerCase()
    if (!targets.some((t) => lower.includes(t))) return

    dumped++
    console.log("\n==== CARD:", title, "====")
    console.log("-- card classes:", $card.attr("class"))
    console.log("-- stat blocks --")
    $card.find(".ipo-card-body-stat").each((_, s) => {
      const label = $(s).find(".ipo-card-secondary-label").text().trim()
      const value = $(s).find(".ipo-card-body-value").text().trim()
      console.log(`  [${label}] = [${value}]`)
    })
    console.log("-- all descendant classes containing status/badge/tag/label/close/list/end --")
    $card.find("*").each((_, el) => {
      const c = $(el).attr("class") || ""
      if (!/status|badge|tag|label|close|list|end|subscri/i.test(c)) return
      const t = $(el).text().trim().slice(0, 80)
      if (t) console.log(`  <${c}>: ${t}`)
    })
    console.log("-- raw html (first 3000 chars) --")
    console.log($card.html()?.slice(0, 3000))
  })

  console.log("\ndumped cards:", dumped)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
