import * as cheerio from "cheerio"
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://ipoji.com/grey-market-premium-ipo-gmp-today.html", {
  headers: { "User-Agent": UA, Accept: "text/html" },
})
const html = await r.text()
console.log("size:", html.length)
const $ = cheerio.load(html)
console.log("tables:", $("table").length)
console.log("divs with table class:", $("[class*=table]").length)

// ipoji typically uses a custom grid. Let's look for rupee-containing rows.
const rupeeIdx = html.indexOf("₹")
if (rupeeIdx >= 0) {
  console.log("\n--- context around first ₹ ---")
  console.log(html.slice(Math.max(0, rupeeIdx - 200), rupeeIdx + 200))
}

// Show some body structure
const bodyText = $("body").text().replace(/\s+/g, " ")
console.log("\nbody text length:", bodyText.length)
// Extract all "Company ... ₹ X" patterns
const matches = [...bodyText.matchAll(/([A-Z][A-Za-z0-9 .&()-]{4,40})\s+₹\s*(-?\d+(?:\.\d+)?)/g)]
console.log("patterns:", matches.length)
matches.slice(0, 10).forEach(m => console.log("  ", JSON.stringify([m[1].trim(), m[2]])))

// Check JSON-LD or script data
console.log("\nscripts with JSON:", $("script[type='application/json'], script[type='application/ld+json']").length)

// List tag names used
const tagCounts = {}
$("*").each((_, el) => {
  tagCounts[el.tagName] = (tagCounts[el.tagName] || 0) + 1
})
const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 15)
console.log("top tags:", sorted)
