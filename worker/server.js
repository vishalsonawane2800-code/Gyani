import express from "express";
import { scrapeAllGMP, scrapeAndSaveGMP } from "./scrapers/index.js";

const app = express();
app.use(express.json());

console.log("Starting ipogyani-worker...");

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (_req, res) => {
  res.json({ working: true });
});

app.get("/api/gmp/:company", async (req, res) => {
  try {
    const company = decodeURIComponent(req.params.company);
    const result = await scrapeAllGMP(company);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "scrape_failed" });
  }
});

app.post("/api/cron/dispatch", async (req, res) => {
  try {
    const { job, company_name } = req.body || {};
    if (!job || !company_name) {
      return res.status(400).json({ error: "job and company_name are required" });
    }
    if (job !== "gmp") {
      return res.status(400).json({ error: `unsupported job: ${job}` });
    }
    const { result, saved } = await scrapeAndSaveGMP(company_name);
    res.json({ ok: true, job, result, saved });
  } catch (err) {
    res.status(500).json({ error: err.message || "dispatch_failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`worker listening on ${PORT}`);
});
