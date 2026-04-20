import * as cheerio from "cheerio"
import { readFileSync } from "fs"

const html = readFileSync("/tmp/ig.html", "utf-8")
const $ = cheerio.load(html)

console.log("Tables:", $("table").length)
$("table").each((i, t) => {
  const rows = $(t).find("tr").length
  const firstRow = $(t).find("tr").first().text().trim().replace(/\s+/g, " ").slice(0, 200)
  console.log(`Table ${i}: ${rows} rows, first: ${firstRow}`)
})
console.log("--- Has IPO names? ---")
console.log("Body has IPO:", $("body").text().toLowerCase().includes("ipo"))
console.log("Body has ₹:", $("body").text().includes("₹"))

// Check __next_f RSC data
const scripts = $("script").toArray()
console.log("Scripts:", scripts.length)
scripts.forEach((s, i) => {
  const content = $(s).html() || ""
  if (content.includes("__next_f") || content.includes("GMP") || content.includes("gmp")) {
    console.log(`Script ${i} size: ${content.length}`)
    console.log("  sample:", content.slice(0, 300))
  }
})
