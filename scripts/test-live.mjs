import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
const HEADERS = { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" }

async function testSource(name, url) {
  try {
    const r = await fetch(url, { headers: HEADERS })
    console.log(`\n=== ${name} ===`)
    console.log("URL:", url)
    console.log("Status:", r.status)
    if (!r.ok) {
      console.log("HEADERS:", Object.fromEntries(r.headers))
      return null
    }
    const html = await r.text()
    console.log("Size:", html.length)
    return html
  } catch (e) {
    console.log(`\n=== ${name} ERROR ===`, e.message)
    return null
  }
}

const ipowatchHtml = await testSource("IPOWatch", "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/")
if (ipowatchHtml) {
  const $ = cheerio.load(ipowatchHtml)
  const tables = $("table")
  console.log("Tables count:", tables.length)
  const firstTable = tables.first()
  const headerCells = firstTable.find("tr").first().find("th, td")
  const headers = []
  headerCells.each((_, el) => headers.push($(el).text().replace(/\s+/g, " ").trim()))
  console.log("Table 0 headers:", JSON.stringify(headers))
  console.log("Table 0 row count:", firstTable.find("tr").length)
  // Print first 3 data rows
  firstTable.find("tr").each((i, tr) => {
    if (i === 0 || i > 5) return
    const cells = []
    $(tr).find("td, th").each((_, el) => cells.push($(el).text().replace(/\s+/g, " ").trim()))
    console.log(`  Row ${i}:`, JSON.stringify(cells))
  })
}

const ipojiHtml = await testSource("ipoji", "https://ipoji.com/grey-market-premium-ipo-gmp-today.html")
if (ipojiHtml) {
  const $ = cheerio.load(ipojiHtml)
  const cards = $(".ipo-card")
  console.log("ipo-card count:", cards.length)
  cards.slice(0, 2).each((_, c) => {
    const $c = $(c)
    const title = $c.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
    console.log("  card title:", title)
    $c.find(".ipo-card-body-stat").each((_, s) => {
      const label = $(s).find(".ipo-card-secondary-label").text().trim()
      const value = $(s).find(".ipo-card-body-value").text().trim()
      console.log(`    ${label}: ${value}`)
    })
  })
}
