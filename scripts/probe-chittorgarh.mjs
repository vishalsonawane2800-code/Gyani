import * as cheerio from "cheerio"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const listUrl = "https://www.chittorgarh.com/report/mainline-ipo-live-subscription/83/"
const r = await fetch(listUrl, { headers: { "User-Agent": UA } })
console.log("list status:", r.status)
if (r.ok) {
  const html = await r.text()
  const $ = cheerio.load(html)
  const links = []
  $("a").each((_, a) => {
    const href = $(a).attr("href") || ""
    const txt = $(a).text().trim()
    if (/\/ipo\/[a-z0-9-]+-ipo\//.test(href) && txt && txt.length < 80) {
      links.push({ href, txt })
    }
  })
  console.log("IPO links found (first 10):")
  links.slice(0, 10).forEach(l => console.log(" ", l.txt, "=>", l.href))
}
