#!/usr/bin/env node
/**
 * Script to fix Adisoft IPO subscription data:
 * 1. Query database to get Adisoft IPO ID
 * 2. Clear the stale Redis cache
 * 3. Trigger a fresh scrape
 * 4. Verify the subscription data is correct
 */

import { createClient } from '@supabase/supabase-js'
import { Redis } from '@upstash/redis'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const UPSTASH_URL = process.env.KV_URL
const UPSTASH_TOKEN = process.env.KV_REST_API_TOKEN
const VERCEL_URL = process.env.VERCEL_URL || 'http://localhost:3000'
const ADMIN_JWT_TOKEN = process.env.ADMIN_JWT_TOKEN

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[v0] ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

if (!UPSTASH_URL || !UPSTASH_TOKEN) {
  console.error('[v0] ERROR: Missing KV_URL or KV_REST_API_TOKEN')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
const redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })

async function main() {
  try {
    console.log('[v0] Step 1: Finding Adisoft IPO in database...')
    const { data: adisoft, error: adError } = await supabase
      .from('ipos')
      .select('id, slug, company_name, chittorgarh_url')
      .eq('slug', 'adisoft-technologies-limited-ipo')
      .maybeSingle()

    if (adError || !adisoft) {
      console.error('[v0] ERROR: Could not find Adisoft IPO:', adError)
      process.exit(1)
    }

    console.log(`[v0] ✓ Found: ${adisoft.company_name} (ID: ${adisoft.id})`)
    console.log(`[v0]   Chittorgarh URL: ${adisoft.chittorgarh_url}`)

    const cacheKey = `subscription:${adisoft.id}`
    
    console.log(`\n[v0] Step 2: Clearing Redis cache (key: ${cacheKey})...`)
    await redis.del(cacheKey)
    console.log(`[v0] ✓ Cache cleared`)

    console.log(`\n[v0] Step 3: Checking live subscription data in database...`)
    const { data: liveSub, error: liveError } = await supabase
      .from('subscription_live')
      .select('*')
      .eq('ipo_id', adisoft.id)
      .order('display_order', { ascending: true })

    if (!liveError && liveSub) {
      console.log(`[v0] Current subscription data:`)
      liveSub.forEach(row => {
        console.log(`[v0]   ${row.category}: ${row.subscription_times}x`)
      })
    }

    if (ADMIN_JWT_TOKEN) {
      console.log(`\n[v0] Step 4: Triggering fresh scrape...`)
      const baseUrl = VERCEL_URL.startsWith('http') ? VERCEL_URL : `https://${VERCEL_URL}`
      const response = await fetch(
        `${baseUrl}/api/admin/scrape-subscription/${adisoft.id}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ADMIN_JWT_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        console.log(`[v0] ✓ Scrape completed:`)
        console.log(`[v0]   Source: ${result.source}`)
        console.log(`[v0]   Snapshot:`, result.snapshot)
        console.log(`[v0]   Inserted rows: ${result.inserted}`)
        console.log(`[v0]   Cached: ${result.cached}`)
        if (result.error) {
          console.log(`[v0]   ⚠ Error: ${result.error}`)
        }
      } else {
        console.error(`[v0] Scrape failed (${response.status}):`, await response.text())
        process.exit(1)
      }

      console.log(`\n[v0] Step 5: Verifying updated data...`)
      await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s for DB to update
      
      const { data: updatedSub } = await supabase
        .from('subscription_live')
        .select('*')
        .eq('ipo_id', adisoft.id)
        .order('display_order', { ascending: true })

      if (updatedSub) {
        console.log(`[v0] Updated subscription data:`)
        updatedSub.forEach(row => {
          console.log(`[v0]   ${row.category}: ${row.subscription_times}x`)
        })
      }
    } else {
      console.warn('[v0] WARNING: ADMIN_JWT_TOKEN not set')
      console.log(`[v0] To manually trigger scrape, use:`)
      console.log(`[v0]   curl -X POST ${VERCEL_URL}/api/admin/scrape-subscription/${adisoft.id} \\`)
      console.log(`[v0]     -H "Authorization: Bearer <JWT_TOKEN>" \\`)
      console.log(`[v0]     -H "Content-Type: application/json"`)
    }

    console.log(`\n[v0] ✓ Done! Cache cleared and fresh scrape triggered.`)
  } catch (error) {
    console.error(`[v0] Error:`, error.message)
    process.exit(1)
  }
}

main()
