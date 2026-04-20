import * as cheerio from "cheerio"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://ipoji.com/grey-market-premium-ipo-gmp-today.html", {
  headers: { "User-Agent": UA, Accept: "text/html" },
})
const html = await r.text()
const $ = cheerio.load(html)

// Each IPO has an .ipo-card (likely). Find the classes hosting labels.
console.log("ipo-card count:", $(".ipo-card").length)
console.log("ipo-card-body-stat count:", $(".ipo-card-body-stat").length)

// Count cards
const cards = $(".ipo-card")
console.log("cards:", cards.length)

cards.slice(0, 3).each((i, el) => {
  const $c = $(el)
  console.log(`\n--- Card ${i} ---`)
  const title = $c.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
  console.log("title:", title.slice(0, 100))
  $c.find(".ipo-card-body-stat").each((j, s) => {
    const label = $(s).find(".ipo-card-secondary-label").text().trim()
    const value = $(s).find(".ipo-card-body-value").text().trim()
    console.log(`  stat ${j}: ${label} = ${value}`)
  })
})

// Search for "GMP" label specifically
console.log("\n--- GMP stats in all cards ---")
$(".ipo-card-body-stat").each((i, el) => {
  const label = $(el).find(".ipo-card-secondary-label").text().trim()
  if (/gmp/i.test(label)) {
    const value = $(el).find(".ipo-card-body-value").text().trim()
    // find the parent card title
    const $card = $(el).closest(".ipo-card")
    const title = $card.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
    console.log(`  ${title.slice(0, 50)} -> ${label} = ${value}`)
  }
})
