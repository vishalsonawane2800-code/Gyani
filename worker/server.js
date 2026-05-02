

import express from "express";
import { scrapeIPOWatchGMP } from "./scrapers/ipowatch.js";
import { scrapeIpojiGMP } from "./scrapers/ipoji.js";
import { scrapeInvestorGainGMP } from "./scrapers/investorgain.js";
import { scrapeAllGMP } from "./scrapers/index.js";

const app = express();
app.use(express.json());

console.log("Starting ipogyani-worker...");

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/test", (req, res) => {
  res.json({ working: true });
});

app.get("/api/gmp/:company", async (req, res) => {
  const company_name = decodeURIComponent(req.params.company);

  const result = await scrapeAllGMP({
    company_name,
  });

  res.json(result);
});

app.post("/api/cron/dispatch", async (req, res) => {
  const { company_name } = req.body;

  res.json({ success: true });

  if (company_name) {
    await scrapeAllGMP({ company_name });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Worker running on port ${PORT}`);
});
