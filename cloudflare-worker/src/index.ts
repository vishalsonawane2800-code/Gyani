/**
 * Cloudflare Worker for IPO Cron Jobs
 * 
 * This worker triggers your Next.js API endpoints on a schedule.
 * 
 * Cron Schedules:
 * - Every 15 minutes: Run main cron jobs (GMP, subscriptions, auto-status)
 * - 6:30 AM daily: Scrape GMP history (morning)
 * - 4:30 PM daily: Scrape GMP history (evening)
 */

export interface Env {
  API_BASE_URL: string
  CRON_SECRET: string
}

interface CronResult {
  endpoint: string
  success: boolean
  status?: number
  message?: string
  error?: string
}

async function callEndpoint(
  baseUrl: string,
  path: string,
  cronSecret: string
): Promise<CronResult> {
  const url = `${baseUrl}${path}`
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cronSecret}`,
        'User-Agent': 'Cloudflare-Worker-Cron/1.0',
      },
    })

    const text = await response.text()
    let message = text

    try {
      const json = JSON.parse(text)
      message = json.message || text
    } catch {
      // Response is not JSON, use raw text
    }

    return {
      endpoint: path,
      success: response.ok,
      status: response.status,
      message,
    }
  } catch (error) {
    return {
      endpoint: path,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

export default {
  // Handle scheduled cron triggers
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const cronTime = controller.cron
    const results: CronResult[] = []

    console.log(`Cron triggered: ${cronTime} at ${new Date().toISOString()}`)

    // Check if this is the GMP history schedule (6:30 AM or 4:30 PM)
    const isGmpHistorySchedule = cronTime === '30 6 * * *' || cronTime === '30 16 * * *'

    if (isGmpHistorySchedule) {
      // Only run GMP history scrape
      const result = await callEndpoint(
        env.API_BASE_URL,
        '/api/cron/scrape-gmp-history',
        env.CRON_SECRET
      )
      results.push(result)
    } else {
      // Run main cron jobs (every 15 minutes)
      // Option 1: Call the master run-all endpoint
      const result = await callEndpoint(
        env.API_BASE_URL,
        '/api/cron/run-all',
        env.CRON_SECRET
      )
      results.push(result)

      // Option 2: Or call individual endpoints (uncomment if needed)
      // const endpoints = [
      //   '/api/cron/scrape-gmp',
      //   '/api/cron/scrape-subscription',
      //   '/api/cron/update-subscriptions',
      // ]
      // 
      // for (const endpoint of endpoints) {
      //   const result = await callEndpoint(env.API_BASE_URL, endpoint, env.CRON_SECRET)
      //   results.push(result)
      // }
    }

    // Log results
    const successCount = results.filter(r => r.success).length
    console.log(`Cron completed: ${successCount}/${results.length} successful`)
    console.log('Results:', JSON.stringify(results, null, 2))
  },

  // Optional: HTTP handler for manual testing
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/test') {
      // Manual trigger for testing
      const result = await callEndpoint(
        env.API_BASE_URL,
        '/api/cron/run-all',
        env.CRON_SECRET
      )

      return new Response(JSON.stringify({
        message: 'Manual cron test executed',
        timestamp: new Date().toISOString(),
        result,
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        apiBaseUrl: env.API_BASE_URL,
      }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response('IPO Cron Worker\n\nEndpoints:\n- /health - Health check\n- /test - Manual cron test', {
      headers: { 'Content-Type': 'text/plain' },
    })
  },
}
