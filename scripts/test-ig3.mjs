import { readFileSync, writeFileSync } from "fs"
import * as cheerio from "cheerio"

const html = readFileSync("/tmp/ig.html", "utf-8")
const $ = cheerio.load(html)

let rsc = ""
$("script").each((_, s) => {
  const c = $(s).html() || ""
  const m = c.match(/self\.__next_f\.push\(\[\d+,\s*"([\s\S]*)"\s*\]\)/)
  if (m) rsc += m[1]
})

// Do a better unescape - eval as string
let decoded
try {
  decoded = JSON.parse('"' + rsc + '"')
} catch (e) {
  console.log("JSON parse failed:", e.message)
  decoded = rsc
}
console.log("Decoded length:", decoded.length)
writeFileSync("/tmp/ig_rsc.txt", decoded)

// look for company names and GMP values
const samplesFound = decoded.match(/"[^"]*GMP[^"]*"/gi) || []
console.log("Samples with GMP:", samplesFound.slice(0, 5))

// Look for the GMP table data — typically array-like data
// Find rows by looking for company name + price patterns
const priceMatches = decoded.match(/₹\s*\d+/g) || []
console.log("₹ values:", priceMatches.slice(0, 10))

// Look for specific patterns — company,price
const dataMatches = decoded.match(/\["[A-Z][a-z ]+","[^"]*"\s*,[^\]]+\]/g) || []
console.log("Possible data rows:", dataMatches.slice(0, 3))
