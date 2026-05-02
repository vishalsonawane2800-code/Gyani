import express from 'express';

const app = express();

app.use(express.json());

console.log('Starting server...');

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', ts: new Date().toISOString() });
});

// Smoke test
app.get('/test', (req, res) => {
  console.log('TEST route hit');
  res.json({ working: true });
});

// Cron dispatch — called by Cloudflare Worker
app.post('/api/cron/dispatch', (req, res) => {
  const { job } = req.body ?? {};
  console.log('Cron endpoint HIT, job:', job);
  res.json({ success: true, job: job ?? null, message: 'Dispatch received' });
});

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Worker running on port ${PORT}`);
});
