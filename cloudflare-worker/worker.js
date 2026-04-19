/**
 * IPOGyani Cron Worker — plain JS version for the Cloudflare dashboard editor.
 * (The TypeScript source lives in src/index.ts; they are kept in sync.)
 *
 * Required env:
 *   API_BASE_URL  - Plaintext var, e.g. https://ipogyani.com
 *   CRON_SECRET   - Secret, must match the Next.js app's CRON_SECRET
 *
 * Cron triggers (configure in dashboard -> Triggers -> Cron Triggers):
 *   every 15 min   -> POST /api/cron/dispatch
 *   30 6 * * *     -> POST /api/cron/scrape-gmp-history (12:00 PM IST)
 *   30 16 * * *    -> POST /api/cron/scrape-gmp-history (10:00 PM IST)
 */

async function callEndpoint(env, path, timeoutMs = 55000) {
  const url = `${env.API_BASE_URL.replace(/\/$/, "")}${path}`;
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CRON_SECRET}`,
        "User-Agent": "IPOGyani-Cloudflare-Cron/1.0",
      },
      signal: controller.signal,
    });

    const text = await response.text();
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed.message === "string") {
        message = parsed.message;
      }
    } catch {
      // not JSON, keep raw text
    }

    return {
      endpoint: path,
      success: response.ok,
      status: response.status,
      durationMs: Date.now() - started,
      message: message ? message.slice(0, 500) : undefined,
    };
  } catch (err) {
    return {
      endpoint: path,
      success: false,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timer);
  }
}

function resolveTargets(cronExpression) {
  switch (cronExpression) {
    case "30 6 * * *":
    case "30 16 * * *":
      return ["/api/cron/scrape-gmp-history"];
    case "*/15 * * * *":
    default:
      return ["/api/cron/dispatch"];
  }
}

export default {
  async scheduled(controller, env, _ctx) {
    const targets = resolveTargets(controller.cron);
    console.log(
      `[cron] trigger=${controller.cron} scheduledTime=${new Date(
        controller.scheduledTime
      ).toISOString()} targets=${targets.join(",")}`
    );

    const results = [];
    for (const path of targets) {
      const result = await callEndpoint(env, path);
      results.push(result);
      console.log(
        `[cron] ${path} -> ok=${result.success} status=${result.status ?? "-"} ` +
          `duration=${result.durationMs}ms ${result.error ? "err=" + result.error : ""}`
      );
    }

    const failed = results.filter((r) => !r.success).length;
    if (failed > 0) {
      throw new Error(
        `Cron completed with ${failed}/${results.length} failures: ` +
          JSON.stringify(results)
      );
    }
  },

  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        timestamp: new Date().toISOString(),
        apiBaseUrl: env.API_BASE_URL,
        hasSecret: Boolean(env.CRON_SECRET),
      });
    }

    if (url.pathname === "/test/dispatch") {
      const result = await callEndpoint(env, "/api/cron/dispatch");
      return Response.json({ triggered: "/api/cron/dispatch", result });
    }

    if (url.pathname === "/test/gmp-history") {
      const result = await callEndpoint(env, "/api/cron/scrape-gmp-history");
      return Response.json({ triggered: "/api/cron/scrape-gmp-history", result });
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
        "Schedules configured via dashboard -> Triggers -> Cron Triggers.",
      ].join("\n"),
      { headers: { "Content-Type": "text/plain" } }
    );
  },
};
