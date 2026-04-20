import * as cheerio from "cheerio"
import { readFileSync } from "fs"

const html = readFileSync("/tmp/ig.html", "utf-8")
const $ = cheerio.load(html)

// Concatenate all __next_f.push payloads into one string
let rsc = ""
$("script").each((_, s) => {
  const c = $(s).html() || ""
  const m = c.match(/self\.__next_f\.push\(\[\d+,\s*"([\s\S]*)"\s*\]\)/)
  if (m) {
    rsc += m[1]
  }
})

console.log("RSC length:", rsc.length)
// Unescape
rsc = rsc.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\u003c/g, '<').replace(/\\u003e/g, '>').replace(/\\u0026/g, '&').replace(/\\\//g, '/')
console.log("After unescape:", rsc.length)
console.log("Has <table:", (rsc.match(/<table/g)||[]).length)
console.log("Has tr:", (rsc.match(/<tr/g)||[]).length)
console.log("Has GMP:", rsc.toLowerCase().split("gmp").length - 1)

// Parse it as HTML to find tables
const $$ = cheerio.load(rsc)
console.log("Parsed tables:", $$("table").length)
$$("table").each((i, t) => {
  const firstRow = $$(t).find("tr").first().text().replace(/\s+/g, " ").trim().slice(0, 200)
  console.log(`  table ${i}: rows=${$$(t).find("tr").length} header=${firstRow}`)
})
