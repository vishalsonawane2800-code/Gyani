// scripts/test-ipowatch-fix.mjs
// Hits the live IPOWatch listing page and runs our fixed parsing logic
// to confirm we pick the correct GMP column and match company names.

import * as cheerio from "cheerio"

const BASE_LIST_URL =
  "https://ipowatch.in/ipo-grey-market-premium-latest-ipo-gmp/"
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

function normalizeName(name) {
  if (!name) return ""
  return name
    .toLowerCase()
    .replace(/\b(limited|ltd\.?|pvt\.?|private|the|ipo|sme)\b/g, " ")
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
function findGMPColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase().trim()
    if (!/\bgmp\b/.test(h)) continue
    if (/listing|issue\s*price|ipo\s*price|lot|subscri|percent|%/.test(h)) continue
    return i
  }
  return -1
}
function findNameColumnIndex(headers) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase()
    if (/ipo\s*name|company|name/.test(h)) return i
  }
  return 0
}
function parseGMP(input) {
  if (!input) return null
  const s = String(input).toLowerCase().trim()
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/\/-/g, "")
    .replace(/,/g, "")
    .trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

const r = await fetch(BASE_LIST_URL, {
  headers: {
    "User-Agent": DESKTOP_UA,
    Accept: "text/html,application/xhtml+xml",
    "Accept-Language": "en-US,en;q=0.9",
  },
})
console.log("status:", r.status)
const html = await r.text()
const $ = cheerio.load(html)
const firstTable = $("table").first()
console.log("first table rows:", firstTable.find("tr").length)

const headers = []
firstTable.find("tr").first().find("th, td").each((_, el) => {
  headers.push($(el).text().replace(/\s+/g, " ").trim())
})
console.log("headers:", headers)
console.log("gmp col idx:", findGMPColumnIndex(headers))
console.log("name col idx:", findNameColumnIndex(headers))

// Dump rows
const gmpIdx = findGMPColumnIndex(headers)
const nameIdx = findNameColumnIndex(headers)
console.log("\nLive rows:")
firstTable.find("tr").each((rowIdx, tr) => {
  if (rowIdx === 0) return
  const cells = []
  $(tr).find("td, th").each((_, el) => cells.push($(el).text().replace(/\s+/g, " ").trim()))
  if (cells.length <= Math.max(gmpIdx, nameIdx)) return
  const name = cells[nameIdx]
  const gmp = parseGMP(cells[gmpIdx])
  console.log(" -", name, "=>", gmp, "| cells:", JSON.stringify(cells).slice(0, 200))
})

// Test name matching
console.log("\nName match tests:")
const liveNames = []
firstTable.find("tr").each((rowIdx, tr) => {
  if (rowIdx === 0) return
  const cells = []
  $(tr).find("td, th").each((_, el) => cells.push($(el).text().replace(/\s+/g, " ").trim()))
  if (cells[nameIdx]) liveNames.push(cells[nameIdx])
})
const testNames = ["Sai Parenterals Limited", "Sai Parenterals", "NonExistent Ltd"]
for (const tn of testNames) {
  const nt = normalizeName(tn)
  const hit = liveNames.find(ln => namesMatch(nt, normalizeName(ln)))
  console.log(" ", JSON.stringify(tn), "=>", hit ? `MATCHED '${hit}'` : "no match")
}
