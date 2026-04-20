/**
 * Diff probe: compare the ipoji card DOM for an active IPO with no
 * premium row (Citius Transnet InvIT) vs. a post-close IPO
 * (PropShare Celestia). Goal: find a stable marker that distinguishes
 * the two so we can apply the "no premium row → 0" fallback only to the
 * former.
 */
import * as cheerio from "cheerio"
import { fetchWithRetry } from "../lib/scraper/base"

const URL = "https://www.ipoji.com/"

async function main() {
  const html = await fetchWithRetry(URL)
  const $ = cheerio.load(html)
  const cards = $(".ipo-card, article.ipo-card, [class*='ipo-card']")

  const targets = ["citius transnet", "propshare celestia"]

  cards.each((_, card) => {
    const $card = $(card)
    const title = $card
      .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
      .first()
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
    if (!targets.some((t) => title.includes(t))) return

    console.log("\n==== CARD:", title.slice(0, 80), "====")
    console.log("-- raw html (first 2000 chars) --")
    console.log($card.html()?.slice(0, 2000))
    console.log("-- classes --")
    console.log($card.attr("class"))
    console.log("-- stat labels --")
    $card.find(".ipo-card-body-stat").each((_, s) => {
      const label = $(s).find(".ipo-card-secondary-label").text().trim()
      const value = $(s).find(".ipo-card-body-value").text().trim()
      console.log(`  ${label} = ${value}`)
    })
    console.log("-- all date-ish text --")
    const text = $card.text().replace(/\s+/g, " ").trim()
    const dateMatches = text.match(/\b(?:open|close|list|listing|gmp|subscription)[^.|]{0,80}/gi)
    console.log(dateMatches)
    console.log("-- status/badge candidates --")
    $card
      .find("[class*='status'], [class*='badge'], [class*='tag'], [class*='label']")
      .each((_, el) => {
        const t = $(el).text().trim()
        const c = $(el).attr("class")
        if (t) console.log(`  <${c}>: ${t}`)
      })
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
