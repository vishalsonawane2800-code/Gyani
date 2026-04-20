import * as cheerio from "cheerio"

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function normalizeName(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd\.?|pvt\.?|private|the|ipo|sme|reit|invit)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
function namesMatch(a, b) {
  if (!a || !b) return false
  if (a === b) return true
  const short = a.length <= b.length ? a : b
  const long = a.length <= b.length ? b : a
  if (short.length < 6) return false
  return long.startsWith(short)
}
function parseIpojiPremium(raw) {
  if (!raw) return null
  const s = String(raw).replace(/₹|rs\.?|inr/gi, "").trim()
  if (!s || /^(-|n\/?a|nil)$/i.test(s)) return null
  const rangeMatch = s.match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/)
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1])
    const b = parseFloat(rangeMatch[2])
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Math.round(((a + b) / 2) * 100) / 100
    }
  }
  const flatMatch = s.match(/(-?\d+(?:\.\d+)?)/)
  if (flatMatch) {
    const n = parseFloat(flatMatch[1])
    return Number.isFinite(n) ? n : null
  }
  return null
}
function cleanCardTitle(title) {
  const cut = title.split(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/)[0]
  return (cut || title).replace(/\s+/g, " ").trim()
}

const r = await fetch("https://ipoji.com/grey-market-premium-ipo-gmp-today.html", {
  headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
})
const html = await r.text()
const $ = cheerio.load(html)

const testIPOs = [
  "Mehul Telecom",
  "Mehul Telecom Limited",
  "Citius Transnet Investment Trust",
  "PropShare Celestia",
  "Adisoft Technologies Limited",
  "Sai Parenterals Limited",
  "NonExistent Pvt Ltd",
]
for (const name of testIPOs) {
  const target = normalizeName(name)
  let gmp = null
  let matchedTitle = null
  $(".ipo-card").each((_, card) => {
    if (gmp !== null) return
    const $card = $(card)
    const titleRaw = $card.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
    if (!titleRaw) return
    const cleaned = cleanCardTitle(titleRaw)
    const titleNorm = normalizeName(cleaned)
    if (!namesMatch(target, titleNorm)) return
    matchedTitle = cleaned
    $card.find(".ipo-card-body-stat").each((_, s) => {
      if (gmp !== null) return
      const label = $(s).find(".ipo-card-secondary-label").text().trim().toLowerCase()
      if (!/gmp|exp\.?\s*premium|grey\s*market/.test(label)) return
      const value = $(s).find(".ipo-card-body-value").text().trim()
      const parsed = parseIpojiPremium(value)
      if (parsed !== null) gmp = parsed
    })
  })
  console.log(`${name.padEnd(40)} => ${gmp === null ? "null" : gmp} ${matchedTitle ? `(matched "${matchedTitle}")` : ""}`)
}

// Some sample cards with premiums:
console.log("\n--- cards with 'Exp. Premium' ---")
let shown = 0
$(".ipo-card").each((_, card) => {
  if (shown >= 5) return
  const $c = $(card)
  const titleRaw = $c.find(".ipo-card-title, .ipo-card-header, h2, h3, a").first().text().replace(/\s+/g, " ").trim()
  let premium = null, val = null
  $c.find(".ipo-card-body-stat").each((_, s) => {
    const l = $(s).find(".ipo-card-secondary-label").text().trim()
    if (/exp.*premium|gmp/i.test(l)) { premium = l; val = $(s).find(".ipo-card-body-value").text().trim() }
  })
  if (val) {
    console.log(`  ${cleanCardTitle(titleRaw).slice(0, 45).padEnd(45)} | ${premium} = ${val} -> parsed ${parseIpojiPremium(val)}`)
    shown++
  }
})
