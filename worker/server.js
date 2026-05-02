import express from "express";

const app = express();

// 🔥 Important: log startup
console.log("Starting server...");

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Debug route
app.get("/test", (req, res) => {
  console.log("TEST route hit");
  res.json({ working: true });
});

// Cron endpoint
app.post("/api/cron/dispatch", (req, res) => {
  console.log("Cron endpoint HIT");

  res.json({
    success: true,
    message: "NO SCRAPER MODE",
  });
});

// 🔥 VERY IMPORTANT FIX
const PORT = process.env.PORT;

if (!PORT) {
  console.error("PORT not defined!");
  process.exit(1);
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
