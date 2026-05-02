import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (req, res) => {
  console.log("TEST route hit");
  res.json({ working: true });
});

app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");

  res.json({
    success: true,
    message: "NO SCRAPER MODE",
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Worker running on port ${PORT}`);
});
