import * as cheerio from "cheerio"
import { writeFileSync } from "fs"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://www.investorgain.com/report/live-ipo-gmp/331/", {
  headers: { "User-Agent": UA, Accept: "text/html" },
})
const html = await r.text()
writeFileSync("/tmp/ig_raw.html", html)

// Dump first 2000 bytes of raw body text
const $ = cheerio.load(html)
const bodyText = $("body").text().replace(/\s+/g, " ").trim()
console.log("body text size:", bodyText.length)
console.log("first 500:", bodyText.slice(0, 500))
console.log()
console.log("last 500:", bodyText.slice(-500))
console.log()

// Look for GMP company data
const pattern = /([A-Z][A-Za-z0-9.&\- ]{3,40}?)\s*(?:IPO|SME)?\s*₹\s*(-?\d+(?:\.\d+)?)/g
const matches = [...html.matchAll(pattern)]
console.log("Pattern matches:", matches.length)
matches.slice(0, 10).forEach(m => console.log("  ", JSON.stringify([m[1].trim(), m[2]])))

// Dump scripts content sizes
console.log("\nScripts:")
let total = 0
$("script").each((i, s) => {
  const c = $(s).html() || ""
  if (c.includes("__next_f")) {
    console.log("  script", i, "size:", c.length)
    total += c.length
  }
})
console.log("Total __next_f scripts:", total)

// Check HTML for GMP Live IPOs grid
console.log("\nDivs with class containing 'table':")
const tblDivs = $('[class*="table"]').length
console.log("  count:", tblDivs)
console.log("Divs with class 'Dataset':")
console.log("  count:", $('[class*="dataset"]').length)
