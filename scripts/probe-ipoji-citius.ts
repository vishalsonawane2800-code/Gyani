// scripts/probe-ipoji-citius.ts
//
// One-off diagnostic: fetch the live ipoji grid and dump every card title
// and its raw "Exp. Premium" / GMP stat so we can see exactly how Citius
// Transnet (if present) is worded. Delete once the mystery is resolved.

import * as cheerio from "cheerio"

const URL = "https://ipoji.com/grey-market-premium-ipo-gmp-today.html"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const res = await fetch(URL, {
  headers: {
    "User-Agent": UA,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
})
console.log("status", res.status)
const html = await res.text()
console.log("html length", html.length)

const $ = cheerio.load(html)
const cards = $(".ipo-card")
console.log("ipo-card count:", cards.length)

cards.each((i, card) => {
  const $card = $(card)
  const title = $card
    .find(".ipo-card-title, .ipo-card-header, h2, h3, a")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim()

  const stats: Array<{ label: string; value: string }> = []
  $card.find(".ipo-card-body-stat").each((_, s) => {
    const label = $(s).find(".ipo-card-secondary-label").text().trim()
    const value = $(s).find(".ipo-card-body-value").text().trim()
    stats.push({ label, value })
  })

  console.log(`\n[${i}] ${title}`)
  for (const { label, value } of stats) {
    console.log(`    ${label}: ${value}`)
  }
})

// Explicit scan for the string "Citius" anywhere in the doc.
const citiusHits = html.match(/.{0,80}citius.{0,120}/gi)
console.log("\n--- raw 'citius' occurrences in HTML ---")
console.log(citiusHits ? citiusHits.length : 0, "hit(s)")
if (citiusHits) for (const h of citiusHits.slice(0, 10)) console.log(h)
