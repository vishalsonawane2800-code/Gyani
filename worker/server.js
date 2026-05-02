import express from "express";

const app = express();

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/cron/dispatch", async (req, res) => {
  console.log("Cron triggered");
  res.json({ success: true });
});

app.listen(3000, () => {
  console.log("Worker running on port 3000");
});
