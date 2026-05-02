import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

import { scrapeIPOWatchGMP } from "./scrapers/ipowatch.js";

app.post("/api/cron/dispatch", async (req, res) => {
  const gmp = await scrapeIPOWatchGMP("Mehul Telecom");

  console.log("GMP:", gmp);

  res.json({ success: true, gmp });
});

app.listen(3000, () => {
  console.log("Worker running on port 3000");
});
