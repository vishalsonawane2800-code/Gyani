import express from "express";

const app = express();

console.log("Starting server...");

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug
app.get("/test", (req, res) => {
  console.log("TEST route hit");
  res.json({ working: true });
});

// Cron
app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");
  res.json({ success: true, message: "NO SCRAPER MODE" });
});

// 🚀 Correct binding
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
