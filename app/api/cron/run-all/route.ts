import { NextResponse } from 'next/server'

/**
 * Master Cron Endpoint - Runs all automated tasks
 * 
 * This endpoint is designed to be called by external cron services like:
 * - cron-job.org
 * - Cloudflare Workers scheduled triggers
 * - Any external scheduler
 * 
 * Tasks executed:
 * 1. Auto-update IPO statuses based on dates
 * 2. Scrape GMP data from configured URLs
 * 3. Scrape subscription data for open IPOs
 * 
 * Recommended schedule: Every 15-30 minutes during market hours (9 AM - 6 PM IST)
 * 
 * Setup with cron-job.org:
 * 1. Create account at cron-job.org
 * 2. Add new cron job with URL: https://your-domain.com/api/cron/run-all
 * 3. Set schedule: Every 15 minutes
 * 4. Add header: Authorization: Bearer YOUR_CRON_SECRET
 * 5. Set method: GET
 */

const CRON_SECRET = process.env.CRON_SECRET

// Note: Authorization is now handled by middleware.ts
// This CRON_SECRET is still used for internal API calls

// Helper to call internal API endpoints
async function callInternalAPI(path: string, baseUrl: string): Promise<{
  success: boolean
  data?: unknown
  error?: string
}> {
  try {
    const url = new URL(path, baseUrl)
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CRON_SECRET ? { Authorization: `Bearer ${CRON_SECRET}` } : {}),
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return { success: false, error: `HTTP ${response.status}: ${errorText}` }
    }

    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function GET(request: Request) {
  // Authorization is handled by middleware.ts
  const startTime = Date.now()
  const baseUrl = new URL(request.url).origin

  const results: {
    task: string
    success: boolean
    duration: number
    data?: unknown
    error?: string
  }[] = []

  // Task 1: Auto-update IPO statuses
  const statusStart = Date.now()
  const statusResult = await callInternalAPI('/api/admin/auto-status', baseUrl)
  results.push({
    task: 'auto-status',
    success: statusResult.success,
    duration: Date.now() - statusStart,
    data: statusResult.data,
    error: statusResult.error,
  })

  // Task 2: Scrape GMP data
  const gmpStart = Date.now()
  const gmpResult = await callInternalAPI('/api/cron/scrape-gmp', baseUrl)
  results.push({
    task: 'scrape-gmp',
    success: gmpResult.success,
    duration: Date.now() - gmpStart,
    data: gmpResult.data,
    error: gmpResult.error,
  })

  // Task 3: Scrape subscription data
  const subStart = Date.now()
  const subResult = await callInternalAPI('/api/cron/scrape-subscription', baseUrl)
  results.push({
    task: 'scrape-subscription',
    success: subResult.success,
    duration: Date.now() - subStart,
    data: subResult.data,
    error: subResult.error,
  })

  const totalDuration = Date.now() - startTime
  const successCount = results.filter(r => r.success).length

  return NextResponse.json({
    message: `Cron jobs completed: ${successCount}/${results.length} successful`,
    executedAt: new Date().toISOString(),
    totalDuration: `${totalDuration}ms`,
    results,
  })
}

// Also support POST method
export async function POST(request: Request) {
  return GET(request)
}
