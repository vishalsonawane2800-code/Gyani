# Build Error Fix - Supabase Environment Variables

## Error Message

```
Error: supabaseUrl is required.
    at <unknown> (.next/server/chunks/023u_@supabase_supabase-js_dist_index_mjs_0adug.0._.js:37:43463)
...
Error: Failed to collect page data for /api/admin/login
```

## Root Cause

The Next.js build process tried to initialize a Supabase client without the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables being set or available during the build phase.

## Solution Applied

### 1. Fixed `lib/supabase/client.ts`
- Changed from using non-null assertions (`!`) to proper null checks
- Now gracefully handles missing environment variables
- Will throw a helpful error message instead of a cryptic Supabase error

### 2. Verified `lib/supabase/server.ts`
- Already had proper error handling for missing env vars
- Returns `null` gracefully during build time
- Prevents initialization errors during SSG/build

### 3. Created `.env.example`
- Documents all required environment variables
- Helps developers understand what needs to be configured

## How to Fix

### For Local Development
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Fill in your Supabase credentials from the Supabase dashboard:
   - Go to https://app.supabase.com
   - Select your project
   - Settings → API → Copy the URL and keys

3. Update `.env.local` with your values

### For Vercel/Production Build
Ensure these environment variables are set in your Vercel project settings:

**Settings → Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (if needed for server-side)
- `SUPABASE_SERVICE_ROLE_KEY` (if needed for server-side)
- All `POSTGRES_*` variables

### Steps to Rebuild

1. **Clear build cache** (if using Vercel):
   - Go to your Vercel project
   - Settings → Git
   - Click "Redeploy"

2. **Run build locally**:
   ```bash
   npm run build
   ```

3. **Or push to GitHub** to trigger Vercel rebuild with env vars

## Verification

After applying the fix, the build should complete successfully. You should see:

```
✓ Completed in 45s
```

Instead of:

```
Error: Failed to collect page data for /api/admin/login
```

## What Changed

- ✅ `lib/supabase/client.ts` - Added proper error handling for missing env vars
- ✅ `.env.example` - Created to document required environment variables
- ✅ Server initialization - Verified it already handles build-time missing vars gracefully

## Files to Check

1. `.env.local` - Make sure it has Supabase credentials
2. Vercel project settings - Make sure env vars are set there too
3. `.env.example` - Reference for what env vars are needed
