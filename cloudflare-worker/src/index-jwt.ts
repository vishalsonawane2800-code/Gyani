// Cloudflare Worker configuration for cron jobs with JWT auth
// This worker will:
// 1. Login to admin API to get JWT token
// 2. Use JWT token to call cron endpoints

interface Env {
  API_BASE_URL: string
  ADMIN_USERNAME: string
  ADMIN_PASSWORD: string
}

async function getAdminToken(env: Env): Promise<string> {
  const response = await fetch(`${env.API_BASE_URL}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: env.ADMIN_USERNAME,
      password: env.ADMIN_PASSWORD,
    }),
  })

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`)
  }

  const data = (await response.json()) as { token: string }
  return data.token
}

async function callCronEndpoint(env: Env, token: string, endpoint: string): Promise<Response> {
  return fetch(`${env.API_BASE_URL}${endpoint}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
}

async function runAllCrons(env: Env, token: string): Promise<void> {
  const endpoints = [
    '/api/cron/scrape-gmp',
    '/api/cron/scrape-subscription',
    '/api/cron/update-subscriptions',
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await callCronEndpoint(env, token, endpoint)
      if (!response.ok) {
        console.error(`[${endpoint}] Failed: ${response.statusText}`)
      } else {
        console.log(`[${endpoint}] Success`)
      }
    } catch (error) {
      console.error(`[${endpoint}] Error:`, error)
    }
  }
}

// Main handler for scheduled cron trigger
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      console.log('Starting scheduled cron job')

      // Get admin token
      const token = await getAdminToken(env)

      // Run all cron jobs
      await runAllCrons(env, token)

      console.log('Scheduled cron job completed')
    } catch (error) {
      console.error('Scheduled cron job failed:', error)
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const token = await getAdminToken(env)

      const response = await callCronEndpoint(env, token, '/api/cron/run-all')
      return response
    } catch (error) {
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
} satisfies ExportedHandler<Env>
