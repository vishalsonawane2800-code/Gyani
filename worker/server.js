
Action: file_editor create /app/worker/server.js --file-text "import express from \"express\"
import { scrapeIPOWatchGMP } from \"./scrapers/ipowatch.js\"
import { scrapeIpojiGMP } from \"./scrapers/ipoji.js\"
import { scrapeInvestorGainGMP } from \"./scrapers/investorgain.js\"
import { scrapeAllGMP } from \"./scrapers/index.js\"

const app = express()
app.use(express.json())

console.log(\"Starting ipogyani-worker...\")

// ── Health ────────────────────────────────────────────────────
app.get(\"/health\", (req, res) => {
  res.json({ status: \"ok\", ts: new Date().toISOString(), uptime: process.uptime() })
})

// ── Smoke test ────────────────────────────────────────────────
app.get(\"/test\", (req, res) => {
  res.json({ working: true })
})

// ── Single-source: IPOWatch ───────────────────────────────────
// GET /api/gmp/ipowatch/:company?url=<ipowatch_gmp_url>
app.get(\"/api/gmp/ipowatch/:company\", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company)
  const ipowatch_gmp_url = req.query.url || null
  console.log(`[GET /api/gmp/ipowatch] \"${company_name}\"`)
  const result = await scrapeIPOWatchGMP({ company_name, ipowatch_gmp_url })
  res.json({ company_name, result })
})

// ── Single-source: IPOji ──────────────────────────────────────
app.get(\"/api/gmp/ipoji/:company\", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company)
  console.log(`[GET /api/gmp/ipoji] \"${company_name}\"`)
  const result = await scrapeIpojiGMP({ company_name })
  res.json({ company_name, result })
})

// ── Single-source: InvestorGain (needs explicit ?url=) ────────
app.get(\"/api/gmp/investorgain/:company\", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company)
  const investorgain_gmp_url = req.query.url || null
  console.log(`[GET /api/gmp/investorgain] \"${company_name}\" url=${investorgain_gmp_url}`)
  const result = await scrapeInvestorGainGMP({ company_name, investorgain_gmp_url })
  res.json({ company_name, result })
})

// ── Multi-source (recommended) ────────────────────────────────
// GET /api/gmp/:company?ipowatch_url=...&investorgain_url=...
app.get(\"/api/gmp/:company\", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company)
  console.log(`[GET /api/gmp] multi-source \"${company_name}\"`)
  const result = await scrapeAllGMP({
    company_name,
    ipowatch_gmp_url: req.query.ipowatch_url || null,
    investorgain_gmp_url: req.query.investorgain_url || null,
  })
  res.json(result)
})

// ── Cron dispatch (called by Cloudflare Worker) ───────────────
// POST /api/cron/dispatch
// Body: { job: \"gmp\", company_name: \"...\", ipowatch_gmp_url?, investorgain_gmp_url? }
// Returns instantly — heavy work runs async, result included in response
// but the Cloudflare Worker is only required to check { success: true }.
app.post(\"/api/cron/dispatch\", async (req, res) => {
  const { job, company_name, ipowatch_gmp_url, investorgain_gmp_url } = req.body ?? {}
  console.log(`[cron] job=\"${job}\" company=\"${company_name}\"`)

  if (job === \"gmp\" && company_name) {
    const result = await scrapeAllGMP({
      company_name,
      ipowatch_gmp_url,
      investorgain_gmp_url,
    })
    return res.json({ success: true, job, company_name, result })
  }

  res.json({ success: true, job: job ?? null, message: \"no handler for job\" })
})

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: \"not found\", path: req.path })
})

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
app.listen(PORT, \"0.0.0.0\", () => {
  console.log(`Worker running on port ${PORT}`)
})
"
Observation: Overwrite successful: /app/worker/server.js
