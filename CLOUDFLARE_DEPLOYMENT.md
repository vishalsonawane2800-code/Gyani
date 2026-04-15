# Cloudflare Pages Deployment Guide

## Problem Fixed

Your project was failing with:
```
✘ [ERROR] The entry-point file at ".open-next/worker.js" was not found.
```

This happened because:
1. Your `next.config.mjs` had `output: 'standalone'` which prevents OpenNextJS from generating the Cloudflare worker
2. Your `netlify.toml` was publishing to `.next` instead of `.open-next`
3. The build process wasn't configured to output Cloudflare-compatible files

## What Was Fixed

### 1. **next.config.mjs**
- Removed `output: 'standalone'` - OpenNextJS needs default output mode to generate Cloudflare worker files
- Kept image optimization disabled (required for Cloudflare)

### 2. **package.json**
- Build script already uses `opennextjs-cloudflare build` ✓
- Added new `cf-build` script for local testing: `pnpm run cf-build`

### 3. **wrangler.toml**
- Updated build command to use `pnpm run build`
- Cleaned up unused D1 and KV namespace configuration (use environment variables instead)
- Fixed build upload format and path

### 4. **netlify.toml**
- Updated to use `.open-next/static` for published path
- Updated build command to `pnpm run build`
- Added warning comments about configuration

## Deployment Steps

### Deploy to Cloudflare Pages

**Method 1: GitHub Integration (Recommended)**
1. Connect your GitHub repository to Cloudflare Pages
2. Set build command: `pnpm run build`
3. Build output directory: `.open-next/static`
4. Add environment variables in Cloudflare dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Any other `NEXT_PUBLIC_*` variables
5. Deploy - Cloudflare will automatically run the build

**Method 2: CLI Deployment**
```bash
# Build locally
pnpm run build

# Deploy
wrangler pages deploy .open-next/static
```

## Environment Variables

For Cloudflare Pages, set these in your Cloudflare dashboard or in a `.env.local` file:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (server-only)
```

All `NEXT_PUBLIC_*` variables are public and sent to the browser.

## Local Testing

### Test the build locally:
```bash
# Clean build
rm -rf .open-next

# Build for Cloudflare
pnpm run build

# Preview locally
pnpm run preview

# Or use wrangler directly
wrangler pages dev .open-next/static
```

## Troubleshooting

### Issue: `.open-next/worker.js` not found

**Cause:** Build didn't run correctly

**Fix:**
```bash
# Clear cache and rebuild
rm -rf .open-next node_modules
pnpm install
pnpm run build
```

### Issue: Environment variables not loading

**Cause:** Variables not set in Cloudflare dashboard

**Fix:**
1. Go to Cloudflare Pages → Your Project → Settings → Environment Variables
2. Add your `NEXT_PUBLIC_*` variables
3. Redeploy

### Issue: Database connection failing

**Cause:** Supabase URL or key not set

**Fix:**
1. Verify in Cloudflare dashboard that `NEXT_PUBLIC_SUPABASE_URL` is set
2. Check that `NEXT_PUBLIC_SUPABASE_ANON_KEY` matches your Supabase project
3. If using server-side database calls, ensure `SUPABASE_SERVICE_ROLE_KEY` is set

## Project Structure

The `.open-next` directory after build contains:
- `worker.js` - Cloudflare Worker entry point
- `static/` - Static assets and prerendered pages
- `functions/` - Server functions for dynamic routes

## More Information

- [OpenNextJS Cloudflare Docs](https://github.com/opennextjs/opennextjs-cloudflare)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
