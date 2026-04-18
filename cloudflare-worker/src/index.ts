/**
 * IPOGyani Cron Worker
 * --------------------
 * Replaces the old Vercel cron (`vercel.json` -> `/api/cron/dispatch`, which
 * is locked to >=1 hour on the Hobby plan) with a Cloudflare Worker that
 * can fire every 15 minutes for free.
 *
 * Schedules (see `wrangler.toml` [triggers]):
 *   - Every 15 min (`*\/15 * * * *`) -> POST /api/cron/dispatch
 *       Runs the three scrapers (gmp, subscription, auto-status) in parallel,
 *       same as the original Vercel dispatcher.
 *   - 06:30 UTC daily (`30 6 * * *`)  -> POST /api/cron/scrape-gmp-history
 *       Morning IPO GMP snapshot (12:00 PM IST).
 *   - 16:30 UTC daily (`30 16 * * *`) -> POST /api/cron/scrape-gmp-history
 *       Evening IPO GMP snapshot (10:00 PM IST).
 *
 * Auth:
 *   `middleware.ts` in the Next.js app accepts either a valid admin JWT
 *   or `Authorization: Bearer <CRON_SECRET>` on /api/cron/*. The worker
 *   uses the shared-secret path so there's no login hop every tick.
 *
 * Required environment variables (see wrangler.toml):
 *   API_BASE_URL  - Base URL of the deployed Next.js app (e.g. https://ipogyani.com)
 *   CRON_SECRET   - Must match the Next.js app's `CRON_SECRET` env var. Set as a
 *                   Wrangler secret: `wrangler secret put CRON_SECRET`.
 */

export interface Env {
  API_BASE_URL: string
  CRON_SECRET: string
}

interface CronResult {
  endpoint: string
  success: boolean
  status?: number
  durationMs: number
  message?: string
  error?: string
}

/** Fetch helper that always sends Bearer auth + timeout + sensible UA. */
async function callEndpoint(
  env: Env,
  path: string,
  timeoutMs = 55_000
): Promise<CronResult> {
  const url = `${env.API_BASE_URL.replace(/\/$/, "")}${path}`
  const started = Date.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CRON_SECRET}`,
        "User-Agent": "IPOGyani-Cloudflare-Cron/1.0",
      },
      signal: controller.signal,
    })

    const text = await response.text()
    let message = text
    try {
      const parsed = JSON.parse(text) as { message?: string }
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message
      }
    } catch {
      // not JSON, keep raw text
    }

    return {
      endpoint: path,
      success: response.ok,
      status: response.status,
      durationMs: Date.now() - started,
      message: message?.slice(0, 500),
    }
  } catch (err) {
    return {
      endpoint: path,
      success: false,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Route a cron tick to the right Next.js endpoint based on which schedule
 * fired. Cloudflare exposes the cron expression via `controller.cron`.
 */
function resolveTargets(cronExpression: string): string[] {
  switch (cronExpression) {
    case "30 6 * * *":
    case "30 16 * * *":
      return ["/api/cron/scrape-gmp-history"]
    case "*/15 * * * *":
    default:
      return ["/api/cron/dispatch"]
  }
}

export default {
  /** Scheduled (cron) trigger. */
  async scheduled(
    controller: ScheduledController,
    env: Env,
    _ctx: ExecutionContext
  ): Promise<void> {
    const targets = resolveTargets(controller.cron)
    console.log(
      `[cron] trigger=${controller.cron} scheduledTime=${new Date(
        controller.scheduledTime
      ).toISOString()} targets=${targets.join(",")}`
    )

    const results: CronResult[] = []
    for (const path of targets) {
      const result = await callEndpoint(env, path)
      results.push(result)
      console.log(
        `[cron] ${path} -> ok=${result.success} status=${result.status ?? "-"} ` +
          `duration=${result.durationMs}ms ${result.error ? "err=" + result.error : ""}`
      )
    }

    const failed = results.filter((r) => !r.success).length
    if (failed > 0) {
      // Surface the failure to Workers logs / tail so `wrangler tail` is useful.
      throw new Error(
        `Cron completed with ${failed}/${results.length} failures: ` +
          JSON.stringify(results)
      )
    }
  },

  /** Optional HTTP interface for manual checks via `wrangler dev` or curl. */
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        apiBaseUrl: env.API_BASE_URL,
        hasSecret: Boolean(env.CRON_SECRET),
      })
    }

    if (url.pathname === "/test/dispatch") {
      const result = await callEndpoint(env, "/api/cron/dispatch")
      return Response.json({ triggered: "/api/cron/dispatch", result })
    }

    if (url.pathname === "/test/gmp-history") {
      const result = await callEndpoint(env, "/api/cron/scrape-gmp-history")
      return Response.json({ triggered: "/api/cron/scrape-gmp-history", result })
    }

    return new Response(
      [
        "IPOGyani Cron Worker",
        "",
        "Endpoints:",
        "  GET /health            Health check",
        "  GET /test/dispatch     Manually fire /api/cron/dispatch",
        "  GET /test/gmp-history  Manually fire /api/cron/scrape-gmp-history",
        "",
        "Schedules configured in wrangler.toml.",
      ].join("\n"),
      { headers: { "Content-Type": "text/plain" } }
    )
  },
} satisfies ExportedHandler<Env>
