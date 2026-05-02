import express from "express";
import { scrapeIPOWatchGMP } from "./scrapers/ipowatch.js";

const app = express();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cron endpoint
app.post("/api/cron/dispatch", async (req, res) => {
  console.log("Cron endpoint HIT");

  // 🔥 IMPORTANT: respond immediately (avoid Cloudflare timeout)
  res.json({ success: true, message: "Job started" });

  // Run scraper in background
  setTimeout(async () => {
    try {
      console.log("Starting scraper...");

      const gmp = await scrapeIPOWatchGMP("Mehul Telecom");

      console.log("GMP Result:", gmp);
    } catch (e) {
      console.error("SCRAPER ERROR:", e);
    }
  }, 0);
});

// Railway-compatible port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
