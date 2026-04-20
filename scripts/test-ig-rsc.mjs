import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const r = await fetch("https://www.investorgain.com/report/live-ipo-gmp/331/", {
  headers: { "User-Agent": UA, Accept: "text/html" },
})
const html = await r.text()
const $ = cheerio.load(html)

// Concatenate all __next_f.push string payloads, then unescape.
let rsc = ""
$("script").each((_, s) => {
  const c = $(s).html() || ""
  // Match: self.__next_f.push([n, "..."])
  const m = c.match(/self\.__next_f\.push\(\[\d+\s*,\s*("(?:[\s\S])*?")\]\)/)
  if (m) {
    try {
      const decoded = JSON.parse(m[1])
      rsc += decoded
    } catch {}
  }
})
console.log("RSC decoded length:", rsc.length)
console.log("Has Sai Parenterals:", rsc.toLowerCase().includes("sai parenterals"))
console.log("Has ₹:", (rsc.match(/₹/g) || []).length)
console.log("Has <table:", (rsc.match(/<table/g) || []).length)
console.log("Has <tr:", (rsc.match(/<tr/g) || []).length)
console.log("Has <td:", (rsc.match(/<td/g) || []).length)

// Try to parse as HTML
const $$ = cheerio.load(rsc)
console.log("Parsed tables:", $$("table").length)
console.log("Parsed rows:", $$("tr").length)
$$("table").each((i, t) => {
  const rows = $$(t).find("tr").length
  const hdr = $$(t).find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 200)
  console.log("T", i, "rows=", rows, "hdr=", hdr.slice(0,150))
  if (rows > 1) {
    $$(t).find("tr").slice(1, 4).each((ri, tr) => {
      const cells = []
      $$(tr).find("td,th").each((_, c) => cells.push($$(c).text().replace(/\s+/g, " ").trim()))
      console.log("  row", ri, JSON.stringify(cells).slice(0, 300))
    })
  }
})
