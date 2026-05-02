import express from "express";
import { scrapeIPOWatchGMP } from "./scrapers/ipowatch.js";

const app = express();

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cron endpoint
app.post("/api/cron/dispatch", async (req, res) => {
  // Respond immediately (IMPORTANT)
  res.json({ success: true, message: "Job started" });

  // Run scraper in background
  (async () => {
    try {
      console.log("Starting scraper...");

      const gmp = await scrapeIPOWatchGMP("Mehul Telecom");

      console.log("GMP Result:", gmp);
    } catch (e) {
      console.error("Scraper error:", e);
    }
  })();
});

// 🔥 Railway-compatible port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
