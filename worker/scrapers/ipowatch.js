import express from "express";

const app = express();

// 🔥 Basic health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 🔥 Direct test route (to verify Railway is serving latest code)
app.get("/test", (req, res) => {
  console.log("TEST route hit");
  res.json({ working: true });
});

// 🔥 Cron endpoint (NO scraper for now — isolate issue)
app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");

  res.json({
    success: true,
    message: "NO SCRAPER MODE",
  });
});

// 🔥 Required for Railway
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
