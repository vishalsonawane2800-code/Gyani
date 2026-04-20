import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://ipoji.com/grey-market-premium-ipo-gmp-today.html", {
  headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
})
const html = await r.text()
const $ = cheerio.load(html)
const cards = $(".ipo-card")
console.log("Total cards:", cards.length)
cards.each((i, c) => {
  const $c = $(c)
  const title = $c.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
  const stats = []
  $c.find(".ipo-card-body-stat").each((_, s) => {
    const label = $(s).find(".ipo-card-secondary-label").text().trim()
    const value = $(s).find(".ipo-card-body-value").text().trim()
    stats.push(`${label}=${value}`)
  })
  console.log(`[${i}] "${title}"  | ${stats.join(" | ")}`)
})
