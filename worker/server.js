import express from "express";
import { scrapeIPOWatchGMP } from "./scrapers/ipowatch.js";

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
});

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");

  try {
    res.json({ success: true, message: "Job started" });
  } catch (e) {
    console.error("Response error:", e);
    return;
  }

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

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
