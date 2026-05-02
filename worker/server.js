import express from "express"
import { scrapeIPOWatchGMP } from "./scrapers/gmp-ipowatch.js"

const app = express()
app.use(express.json())

console.log("Starting ipogyani-worker...")

// ── Health ────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", ts: new Date().toISOString(), uptime: process.uptime() })
})

// ── Smoke test ────────────────────────────────────────────────
app.get("/test", (req, res) => {
  res.json({ working: true })
})

// ── Manual GMP scrape (GET for quick browser testing) ─────────
app.get("/api/gmp/:company", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company)
  console.log(`[GET /api/gmp] scraping: "${company_name}"`)
  const result = await scrapeIPOWatchGMP({ company_name })
  res.json({ company_name, result })
})

// ── Cron dispatch (called by Cloudflare Worker) ───────────────
app.post("/api/cron/dispatch", async (req, res) => {
  const { job, company_name, ipowatch_gmp_url } = req.body ?? {}
  console.log(`[cron] job="${job}" company="${company_name}"`)

  if (job === "gmp" && company_name) {
    const result = await scrapeIPOWatchGMP({ company_name, ipowatch_gmp_url })
    return res.json({ success: true, job, company_name, result })
  }

  res.json({ success: true, job: job ?? null, message: "no handler for job" })
})

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "not found", path: req.path })
})

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Worker running on port ${PORT}`)
})
