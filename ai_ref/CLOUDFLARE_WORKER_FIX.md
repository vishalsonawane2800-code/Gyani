# Cloudflare Worker Cron Fix — April 28, 2026

## Problem
The Cloudflare Worker was unable to trigger scrapers even though:
- The cron triggers were configured in Cloudflare dashboard
- Manual "Run Now" button in Cloudflare didn't work
- The same CRON_SECRET was configured on both Vercel and Cloudflare

## Root Cause
The middleware's CRON_SECRET validation was failing due to:
1. Whitespace/trim issues when comparing the token
2. No fallback handling if CRON_SECRET wasn't set

## Solution Applied

### 1. Reverted Vercel Native Cron (vercel.json)
Removed the crons array from vercel.json since you're using Cloudflare Worker for scheduling:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json"
}
```

### 2. Fixed Middleware CRON_SECRET Validation (middleware.ts)
Updated the authentication logic to:
- Trim whitespace from both the environment variable and incoming token
- Add explicit error logging if CRON_SECRET is not configured
- Ensure consistent comparison without encoding issues

**Before:**
```typescript
if (
  pathname.startsWith('/api/cron') &&
  process.env.CRON_SECRET &&
  token === process.env.CRON_SECRET
) {
  return NextResponse.next()
}
```

**After:**
```typescript
if (pathname.startsWith('/api/cron')) {
  const cronSecret = process.env.CRON_SECRET?.trim()
  const incomingToken = token.trim()
  
  if (cronSecret && incomingToken === cronSecret) {
    return NextResponse.next()
  }
  
  if (!cronSecret) {
    console.error('[v0] CRON_SECRET not configured in environment')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }
}
```

## Testing
1. Verify CRON_SECRET is set in both:
   - Vercel project environment variables
   - Cloudflare Worker environment variables
2. Click "Run Now" in Cloudflare Workers dashboard - should now trigger /api/cron/dispatch
3. Check the Automation dashboard at /admin/automation to see recent dispatcher runs

## How It Works
- **Cloudflare Worker**: Makes HTTP POST to `https://your-domain/api/cron/dispatch` with `Authorization: Bearer {CRON_SECRET}`
- **Middleware**: Validates the Bearer token matches CRON_SECRET
- **Dispatcher**: Runs GMP, Subscription, and Auto-Status scrapers in parallel
- **Schedule**: Cloudflare crons trigger at configured times (04:30 PM, 06:30 AM, every 15 min)

## Backup: Vercel Native Cron
If Cloudflare Worker continues to fail, you can switch back to Vercel native cron by restoring the vercel.json config:
```json
{
  "crons": [
    {
      "path": "/api/cron/dispatch",
      "schedule": "*/15 * * * *"
    }
  ]
}
```
This would run the dispatcher every 15 minutes directly on Vercel.
