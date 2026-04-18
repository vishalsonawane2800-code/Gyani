# IPOGyani Cron Worker

Cloudflare Worker that replaces the old Vercel cron job. Vercel's Hobby plan
limits cron to once per hour, but IPOGyani needs a 15-minute cadence. A
Cloudflare Worker on the free plan supports `*/15 * * * *` triggers at no cost.

The worker is a thin trigger: it just calls the Next.js app's existing
`/api/cron/*` route handlers over HTTPS using a shared `CRON_SECRET`.
All business logic still lives in the Next.js app — nothing was
duplicated here.

## What it does

| Cron expression | UTC time      | IST time      | Endpoint called                      |
|-----------------|---------------|---------------|--------------------------------------|
| `*/15 * * * *`  | every 15 min  | every 15 min  | `POST /api/cron/dispatch`            |
| `30 6 * * *`    | 06:30 daily   | 12:00 PM      | `POST /api/cron/scrape-gmp-history`  |
| `30 16 * * *`   | 16:30 daily   | 10:00 PM      | `POST /api/cron/scrape-gmp-history`  |

`/api/cron/dispatch` in turn fans out to `runGmpScraper()`,
`runSubscriptionScraper()`, and `runAutoStatusJob()` in parallel.

## Authentication

`middleware.ts` in the Next.js app accepts `Authorization: Bearer <CRON_SECRET>`
on `/api/cron/*`. The worker sends exactly that header, so no admin login
hop is required on each tick.

The `CRON_SECRET` value must be the **same** in:

1. The Next.js app's environment (Vercel / Cloudflare Pages project settings).
2. The worker's Wrangler secrets (`wrangler secret put CRON_SECRET`).

## One-time setup

Install Wrangler if you don't have it:

```bash
npm install -g wrangler
wrangler login
```

From this directory:

```bash
cd cloudflare-worker
npm install
```

Edit `wrangler.toml` and set `API_BASE_URL` to your deployed app URL
(no trailing slash), e.g. `https://ipogyani.com`.

Set the shared secret:

```bash
wrangler secret put CRON_SECRET
# paste the same value you use for CRON_SECRET in the Next.js app
```

## Deploy

```bash
npm run deploy
```

Wrangler will register the cron triggers automatically. Verify in the
Cloudflare dashboard under **Workers & Pages -> ipogyani-cron-worker -> Triggers**.

## Local testing

```bash
# Run the worker locally. Triggers won't fire automatically, but the
# /test/* routes can be used to simulate a cron tick.
npm run dev

# In another terminal
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:8787/test/dispatch
curl http://127.0.0.1:8787/test/gmp-history
```

You can also dry-run the scheduled handler against your production app:

```bash
wrangler dev --test-scheduled
curl "http://127.0.0.1:8787/__scheduled?cron=*/15+*+*+*+*"
curl "http://127.0.0.1:8787/__scheduled?cron=30+6+*+*+*"
```

## Tail production logs

```bash
npm run tail
```

This streams `console.log` output from every cron invocation. Each tick
logs the target path, HTTP status, duration, and any error message.

## Removing the Vercel cron

The root `vercel.json` no longer registers a cron. On next deploy Vercel
will delete the previous `*/15 * * * *` schedule for `/api/cron/dispatch`.
The route handler itself stays — it's just now triggered by Cloudflare
(and still callable manually from the admin UI with a JWT).

## Troubleshooting

| Symptom                                   | Fix                                                                                      |
|-------------------------------------------|------------------------------------------------------------------------------------------|
| 401 responses in `wrangler tail`          | `CRON_SECRET` mismatch between worker and Next.js env. Re-run `wrangler secret put`.     |
| 404 responses                              | `API_BASE_URL` is wrong or the app isn't deployed at that URL.                           |
| Schedule not firing                       | Check `wrangler.toml` was deployed (`wrangler deploy`) and the triggers are enabled.     |
| Scraper_health rows stop appearing        | Worker is up but the Next.js handler is failing. Inspect the app logs, not the worker.   |
| Need to pause cron temporarily            | Disable the triggers in Cloudflare dashboard, or run `wrangler deployments list` + rollback. |

## Files

- `src/index.ts` — Worker entry point (scheduled + fetch handlers).
- `wrangler.toml` — Deployment config, cron triggers, public vars.
- `package.json` — Deps (`wrangler`, `@cloudflare/workers-types`) and scripts.
- `tsconfig.json` — TypeScript config for Workers runtime.
