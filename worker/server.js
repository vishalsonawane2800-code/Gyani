import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/cron/dispatch", async (req, res) => {
  // respond immediately
  res.json({ success: true, message: "Job started" });

  // run scraper in background
  (async () => {
    try {
      const gmp = await scrapeIPOWatchGMP("Mehul Telecom");
      console.log("GMP:", gmp);
    } catch (e) {
      console.error("Scraper error:", e);
    }
  })();
});

app.listen(3000, () => {
  console.log("Worker running on port 3000");
});
