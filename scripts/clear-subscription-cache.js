#!/usr/bin/env node
/**
 * Script to clear the subscription cache for a specific IPO and optionally trigger a rescrape.
 * Usage: node clear-subscription-cache.js <ipoId> [triggerRescrape]
 * Example: node clear-subscription-cache.js 3 true
 */

import { Redis } from '@upstash/redis';

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('[v0] ERROR: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });

const ipoId = process.argv[2];
const triggerRescrape = process.argv[3] === 'true';

if (!ipoId) {
  console.error('[v0] Usage: node clear-subscription-cache.js <ipoId> [triggerRescrape]');
  console.error('[v0] Example: node clear-subscription-cache.js 3 true');
  process.exit(1);
}

const cacheKey = `subscription:${ipoId}`;

async function main() {
  try {
    console.log(`[v0] Clearing cache for IPO ${ipoId}...`);
    await redis.del(cacheKey);
    console.log(`[v0] ✓ Cache cleared: ${cacheKey}`);

    if (triggerRescrape) {
      console.log(`[v0] Triggering rescrape for IPO ${ipoId}...`);
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
      
      // Note: You'll need to pass your JWT token via environment variable
      const token = process.env.ADMIN_JWT_TOKEN;
      if (!token) {
        console.warn('[v0] WARNING: ADMIN_JWT_TOKEN not set, skipping automatic rescrape');
        console.log(`[v0] To manually trigger: curl -X POST ${baseUrl}/api/admin/scrape-subscription/${ipoId}`);
        process.exit(0);
      }

      const response = await fetch(`${baseUrl}/api/admin/scrape-subscription/${ipoId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[v0] ✓ Rescrape triggered:`, result);
      } else {
        console.error(`[v0] Rescrape failed (${response.status}):`, await response.text());
        process.exit(1);
      }
    }

    console.log(`[v0] Done!`);
  } catch (error) {
    console.error(`[v0] Error:`, error.message);
    process.exit(1);
  }
}

main();
