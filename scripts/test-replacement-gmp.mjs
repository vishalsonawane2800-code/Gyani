import * as cheerio from "cheerio"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function test(name, url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" } })
    const ct = r.headers.get("content-type") || ""
    if (!r.ok) { console.log(`[${name}] ${url} => ${r.status}`); return }
    const html = await r.text()
    const $ = cheerio.load(html)
    const tables = $("table").length
    const rupees = (html.match(/₹/g) || []).length
    const rows = $("table tr").length
    // look for live ipo names
    let header = ""
    const $t = $("table").first()
    if ($t.length) {
      const hdrCells = []
      $t.find("tr").first().find("th, td").each((_, el) => hdrCells.push($(el).text().replace(/\s+/g, " ").trim()))
      header = hdrCells.join(" | ")
    }
    console.log(`[${name}] ${url}`)
    console.log(`   status=${r.status} size=${html.length} tables=${tables} rows=${rows} ₹=${rupees}`)
    console.log(`   header: ${header.slice(0, 200)}`)
    // dump a data row
    if ($t.length) {
      $t.find("tr").slice(1, 3).each((i, tr) => {
        const cells = []
        $(tr).find("td,th").each((_, c) => cells.push($(c).text().replace(/\s+/g, " ").trim()))
        console.log(`   row ${i}: ${JSON.stringify(cells).slice(0, 250)}`)
      })
    }
  } catch (e) {
    console.log(`[${name}] ${url} ERR ${e.message}`)
  }
}

await test("ipoji", "https://ipoji.com/grey-market-premium-ipo-gmp-today.html")
await test("topshare", "https://www.topsharebrokers.com/report/ipo-grey-market-premium/")
await test("moneycontrol", "https://www.moneycontrol.com/ipo/")
await test("investing-ipo", "https://www.investing.com/ipo-calendar/")
await test("ipogyan", "https://ipogyan.com/")
