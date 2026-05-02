import express from "express";

const app = express();

// Health check (Railway test)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug route (verify deployment)
app.get("/test", (req, res) => {
  console.log("TEST route hit");
  res.json({ working: true });
});

// Cron endpoint (no scraper for now)
app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");

  res.json({
    success: true,
    message: "NO SCRAPER MODE",
  });
});

// 🔥 CRITICAL: Railway binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Worker running on port ${PORT}`);
});
