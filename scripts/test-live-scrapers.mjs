import * as cheerio from "cheerio"

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

async function fetchText(url) {
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml", "Accept-Language": "en-US,en;q=0.9" },
    })
    if (!r.ok) return { ok: false, status: r.status }
    return { ok: true, status: r.status, text: await r.text() }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

console.log("\n=== INVESTORGAIN listing ===")
{
  const r = await fetchText("https://www.investorgain.com/report/live-ipo-gmp/331/")
  console.log("ok:", r.ok, "status:", r.status, "size:", r.text?.length)
  if (r.text) {
    const $ = cheerio.load(r.text)
    console.log("  tables:", $("table").length)
    console.log("  rows in all tables:", $("table tr").length)
    console.log("  any ₹:", (r.text.match(/₹/g) || []).length)
    console.log("  has <tbody>:", (r.text.match(/<tbody/g)||[]).length)
    // Check if rendered by JS (react/next)
    console.log("  has __next_f:", r.text.includes("__next_f"))
    // Look for IPO name in raw html
    console.log("  has 'Sai Parenterals':", r.text.toLowerCase().includes("sai parenterals"))
  }
}

console.log("\n=== IPOWATCH listing ===")
{
  const r = await fetchText("https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/")
  console.log("ok:", r.ok, "status:", r.status, "size:", r.text?.length)
  if (r.text) {
    const $ = cheerio.load(r.text)
    console.log("  tables:", $("table").length)
    console.log("  rows total:", $("table tr").length)
    console.log("  rupee count:", (r.text.match(/₹/g) || []).length)
    const firstTable = $("table").first()
    console.log("  first table rows:", firstTable.find("tr").length)
    const hdr = firstTable.find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 200)
    console.log("  first table header:", hdr)
    // Check sample rows
    firstTable.find("tr").slice(1, 4).each((i, tr) => {
      const cells = []
      $(tr).find("td,th").each((_, c) => cells.push($(c).text().replace(/\s+/g, " ").trim()))
      console.log("    row", i, JSON.stringify(cells).slice(0, 300))
    })
  }
}

console.log("\n=== IPOCENTRAL listing ===")
{
  const r = await fetchText("https://ipocentral.in/ipo-grey-market-premium-today/")
  console.log("ok:", r.ok, "status:", r.status, "size:", r.text?.length)
  if (r.text) {
    const $ = cheerio.load(r.text)
    console.log("  tables:", $("table").length)
    console.log("  rupee:", (r.text.match(/₹/g) || []).length)
    const firstTable = $("table").first()
    const hdr = firstTable.find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 300)
    console.log("  first table header:", hdr)
    firstTable.find("tr").slice(1, 4).each((i, tr) => {
      const cells = []
      $(tr).find("td,th").each((_, c) => cells.push($(c).text().replace(/\s+/g, " ").trim()))
      console.log("    row", i, JSON.stringify(cells).slice(0, 300))
    })
  }
}
