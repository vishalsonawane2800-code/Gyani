import * as cheerio from "cheerio"

async function main() {
  const ipowatchRes = await fetch("https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/", {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" },
  })
  const ipowatchHtml = await ipowatchRes.text()
  const $ = cheerio.load(ipowatchHtml)
  console.log("=== IPOWatch: rows containing 'citius' or 'transnet' ===")
  $("table tr").each((_, el) => {
    const text = $(el).text()
    if (/citius|transnet/i.test(text)) {
      const cells = $(el).find("td").map((_, td) => $(td).text().trim()).get()
      console.log("ROW cells:", JSON.stringify(cells))
    }
  })

  console.log("\n=== ipoji: rows containing 'citius' or 'transnet' ===")
  const ipojiRes = await fetch("https://ipoji.com/ipo-list", {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36" },
  })
  const ipojiHtml = await ipojiRes.text()
  const $2 = cheerio.load(ipojiHtml)
  $2("tr").each((_, el) => {
    const t = $2(el).text()
    if (/citius|transnet/i.test(t)) {
      const cells = $2(el).find("td").map((_, td) => $2(td).text().trim().replace(/\s+/g, " ")).get()
      console.log("ROW cells:", JSON.stringify(cells))
    }
  })
  // Also show ipoji cards if they use divs.
  $2("[class*='ipo-card'],[class*='ipo-list']").each((_, el) => {
    const t = $2(el).text()
    if (/citius|transnet/i.test(t)) {
      console.log("CARD text preview:", JSON.stringify(t.trim().slice(0, 300)))
    }
  })
}
main().catch(e => console.log("threw:", e.message))
