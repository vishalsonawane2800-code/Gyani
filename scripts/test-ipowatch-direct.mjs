import * as cheerio from "cheerio"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

// Find an actual IPOWatch URL from their listing
const r0 = await fetch("https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/", { headers: { "User-Agent": UA } })
const listHtml = await r0.text()
const $0 = cheerio.load(listHtml)
const gmpLinks = []
$0("a[href]").each((_, a) => {
  const href = $0(a).attr("href") || ""
  if (/ipowatch\.in\/.+gmp/i.test(href) || /ipowatch\.in\/.+(grey|ipo)/i.test(href)) {
    const txt = $0(a).text().trim()
    if (txt.length > 5 && txt.length < 80) gmpLinks.push({ href, txt })
  }
})
console.log("Links:", gmpLinks.length)
gmpLinks.slice(0, 5).forEach(l => console.log(" ", l.txt, "->", l.href))

// Try one
if (gmpLinks[0]) {
  const r = await fetch(gmpLinks[0].href, { headers: { "User-Agent": UA } })
  const html = await r.text()
  const $ = cheerio.load(html)
  console.log("\nDetail page", gmpLinks[0].href)
  console.log("  status:", r.status, "size:", html.length, "tables:", $("table").length)
  $("table").slice(0, 3).each((i, t) => {
    const rows = $(t).find("tr").length
    const hdr = $(t).find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 150)
    console.log("  T", i, "rows=", rows, "hdr=", hdr)
    $(t).find("tr").slice(0, 3).each((ri, tr) => {
      const cells = []
      $(tr).find("td,th").each((_, c) => cells.push($(c).text().replace(/\s+/g, " ").trim()))
      console.log("    row", ri, JSON.stringify(cells).slice(0, 300))
    })
  })
}
