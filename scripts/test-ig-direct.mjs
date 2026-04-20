import * as cheerio from "cheerio"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://www.investorgain.com/ipo/sai-parenterals-ipo/7842/", { headers: { "User-Agent": UA } })
const html = await r.text()
const $ = cheerio.load(html)
const body = $("body").text()
console.log("size:", html.length, "bodylen:", body.length, "₹:", (html.match(/₹/g)||[]).length)
console.log("tables:", $("table").length)

// Look for GMP in body text
console.log("\n--- GMP patterns ---")
const matches = [...body.matchAll(/gmp[^0-9]{0,60}₹\s*([\d.,]+)/gi)]
console.log("generic gmp matches:", matches.length)
matches.slice(0, 5).forEach(m => console.log("  ", JSON.stringify(m[0].slice(0,150)), "->", m[1]))
const matches2 = [...body.matchAll(/last\s+gmp[\s\S]{0,100}?₹\s*([\d.,]+)/gi)]
console.log("last gmp matches:", matches2.length)
matches2.slice(0, 3).forEach(m => console.log("  ", JSON.stringify(m[0].slice(0, 200))))

// Find sentence with "GMP"
console.log("\n--- sentences with GMP ---")
const sentences = body.split(/[.!?]\s+/).filter(s => /gmp/i.test(s)).slice(0, 5)
sentences.forEach(s => console.log(" ", s.trim().slice(0, 200)))

// Check __next_f
let rsc = ""
$("script").each((_, s) => {
  const c = $(s).html() || ""
  const m = c.match(/self\.__next_f\.push\(\[\d+\s*,\s*("(?:[\s\S])*?")\]\)/)
  if (m) {
    try {
      rsc += JSON.parse(m[1])
    } catch {}
  }
})
console.log("\nRSC length:", rsc.length)
console.log("RSC ₹ count:", (rsc.match(/₹/g)||[]).length)
if (rsc.length > 0) {
  // Find gmp mentions in RSC
  const rscMatches = [...rsc.matchAll(/gmp[\s\S]{0,100}?₹\s*([\d.,]+)/gi)]
  console.log("RSC gmp matches:", rscMatches.length)
  rscMatches.slice(0, 5).forEach(m => console.log("  ", JSON.stringify(m[0].slice(0,150))))
}
