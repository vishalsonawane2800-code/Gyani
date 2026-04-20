import * as cheerio from "cheerio"
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

const r = await fetch("https://www.chittorgarh.com/ipo_subscription/sai-parenterals-ipo/2681/", { headers: { "User-Agent": UA } })
const html = await r.text()
const $ = cheerio.load(html)
console.log("tables:", $("table").length)
$("table").each((i, t) => {
  const rows = $(t).find("tr").length
  const hdr = $(t).find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 200)
  const allTxt = $(t).text().toLowerCase()
  console.log(`T ${i} rows=${rows} hdr=${hdr.slice(0,150)}`)
  if (/subscri/.test(allTxt)) {
    $(t).find("tr").each((ri, tr) => {
      const cells = []
      $(tr).find("td,th").each((_, c) => cells.push($(c).text().replace(/\s+/g, " ").trim()))
      console.log("  row", ri, JSON.stringify(cells).slice(0, 300))
    })
  }
})
