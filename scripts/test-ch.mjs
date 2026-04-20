import * as cheerio from "cheerio"
import { readFileSync } from "fs"

const html = readFileSync("/tmp/ch_ipo.html", "utf-8")
const $ = cheerio.load(html)

function parseSubscriptionTimes(input) {
  if (!input) return null
  const s = input.toLowerCase().trim().replace(/times|x/gi, "").trim()
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function categorize(rawLabel) {
  const l = rawLabel.toLowerCase().trim()
  if (!l) return null
  if (/\bissue\s+size\b/.test(l)) return null
  if (/\btotal\s+(income|assets|amount|equity|liabilities|expenses|shares?|issue)\b/.test(l)) return null
  if (/\bshares?\s+offered\b/.test(l)) return null
  if (/\bshares?\s+bid\b/.test(l)) return null
  if (/\bamount\b/.test(l) && !/\bsubscri/.test(l)) return null
  if (/\banchor\b/.test(l) && !/ex[\s-]*anchor/.test(l)) return null
  if (/\bemployee|reservation\b/.test(l)) return null
  if (/\bmarket\s+cap\b/.test(l)) return null
  if (/^total$/i.test(l)) return "total"
  if (/^total[\s(]/.test(l)) return "total"
  if (/\b(grand\s+total|overall|aggregate|subscription\s+total)\b/.test(l)) return "total"
  if (/^total\s+(subscrib|subscri)/.test(l)) return "total"
  if (/\bqib\b/.test(l)) return "qib"
  if (/qualified[\s-]*institutional/.test(l)) return "qib"
  if (/\binstitutional\s+investors?\b/.test(l) && !/non[\s-]*institutional/.test(l)) return "qib"
  if (/non[\s-]*institutional/.test(l)) return "nii"
  if (/\bnii\b/.test(l)) return "nii"
  if (/\bhni\b/.test(l)) return "nii"
  if (/^other\s+investors?$/.test(l)) return "nii"
  if (/\bretail\b/.test(l)) return "retail"
  if (/\brii\b/.test(l)) return "retail"
  if (/retail[\s-]*individual/.test(l)) return "retail"
  return null
}

function isSubscriptionTable(headers) {
  const joined = headers.join(" | ").toLowerCase()
  if (!/subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(joined)) return false
  if (/gmp|grey\s*market/.test(joined) && !/subscri/.test(joined)) return false
  return true
}

function pickTimes(cells, headers) {
  for (let i = 0; i < cells.length; i++) {
    const h = (headers[i] || "").toLowerCase()
    if (!h) continue
    if (/subscri|\btimes\b|no\.\s*of\s*times|oversubscribed/.test(h) && !/shares?|amount/.test(h)) {
      const n = parseSubscriptionTimes(cells[i])
      if (n != null && n >= 0 && n < 10_000) return n
    }
  }
  for (let i = cells.length - 1; i >= 1; i--) {
    const raw = cells[i].trim()
    if (!raw) continue
    if (/₹|\brs\.?\b|\bcr\b|crore|lakh|lac/i.test(raw)) continue
    if (/,\d{3}/.test(raw)) continue
    const n = parseSubscriptionTimes(raw)
    if (n != null && n >= 0 && n < 10_000) return n
  }
  return null
}

const out = { total: null, retail: null, nii: null, qib: null }

$("table").each((idx, tbl) => {
  const $tbl = $(tbl)
  let headers = []
  const $headerRow = $tbl.find("tr").first()
  $headerRow.find("th, td").each((_i, el) => {
    headers.push($(el).text().replace(/\s+/g, " ").trim())
  })
  const isSub = isSubscriptionTable(headers)
  if (!isSub) return

  console.log(`Table ${idx} headers:`, headers)

  $tbl.find("tr").each((i, tr) => {
    if (i === 0) return
    const cells = []
    $(tr).find("td, th").each((_j, el) => {
      cells.push($(el).text().replace(/\s+/g, " ").trim())
    })
    if (cells.length < 2) return
    const cat = categorize(cells[0])
    console.log(`  row ${i}: cells[0]='${cells[0]}' cat=${cat} cells=${JSON.stringify(cells)}`)
    if (!cat) return
    if (out[cat] != null) return
    const times = pickTimes(cells.slice(1), headers.slice(1))
    if (times != null) out[cat] = times
  })
})

console.log("FINAL:", out)
