import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

// Create Supabase client for server-side
function getSupabase() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

interface SubscriptionData {
  total: number
  retail: string
  nii: string
  qib: string
  day: number
  isFinal: boolean
}

// Fetch subscription data from NSE API
async function fetchNSESubscription(symbol: string): Promise<SubscriptionData | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.nseindia.com/',
    }

    // NSE IPO subscription status endpoint
    const url = `https://www.nseindia.com/api/ipo-detail?symbol=${encodeURIComponent(symbol)}`
    
    const response = await fetch(url, { 
      headers,
      next: { revalidate: 0 } 
    })

    if (!response.ok) {
      console.log(`[v0] NSE API returned ${response.status} for ${symbol}`)
      return null
    }

    const data = await response.json()
    
    if (data && data.subscriptionDetails) {
      const sub = data.subscriptionDetails
      return {
        total: parseFloat(sub.totalSubscription) || 0,
        retail: `${sub.retailSubscription || 0}x`,
        nii: `${sub.niiSubscription || 0}x`,
        qib: `${sub.qibSubscription || 0}x`,
        day: parseInt(sub.day) || 1,
        isFinal: data.status === 'closed'
      }
    }
    
    return null
  } catch (error) {
    console.error(`[v0] Error fetching NSE subscription for ${symbol}:`, error)
    return null
  }
}

// Fetch subscription data from BSE API
async function fetchBSESubscription(scripCode: string): Promise<SubscriptionData | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Referer': 'https://www.bseindia.com/',
    }

    // BSE IPO subscription endpoint
    const url = `https://api.bseindia.com/BseIndiaAPI/api/IPOIssueInfo/w?scripcode=${scripCode}`
    
    const response = await fetch(url, { 
      headers,
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      console.log(`[v0] BSE API returned ${response.status} for ${scripCode}`)
      return null
    }

    const data = await response.json()
    
    if (data && data.Table && data.Table[0]) {
      const info = data.Table[0]
      return {
        total: parseFloat(info.Tot_Bid_Qty) / parseFloat(info.Tot_Issue_Size) || 0,
        retail: `${(parseFloat(info.Ret_Bid_Qty) / parseFloat(info.Ret_Issue_Size) || 0).toFixed(2)}x`,
        nii: `${(parseFloat(info.NII_Bid_Qty) / parseFloat(info.NII_Issue_Size) || 0).toFixed(2)}x`,
        qib: `${(parseFloat(info.QIB_Bid_Qty) / parseFloat(info.QIB_Issue_Size) || 0).toFixed(2)}x`,
        day: 1,
        isFinal: false
      }
    }
    
    return null
  } catch (error) {
    console.error(`[v0] Error fetching BSE subscription for ${scripCode}:`, error)
    return null
  }
}

// Alternative: Scrape from ipoalerts.in (they have subscription in their detailed view)
async function fetchFromIPOAlerts(slug: string): Promise<SubscriptionData | null> {
  try {
    // Note: This requires an API key from ipoalerts.in
    const apiKey = process.env.IPOALERTS_API_KEY
    if (!apiKey) {
      console.log('[v0] IPOALERTS_API_KEY not set, skipping ipoalerts fetch')
      return null
    }

    const response = await fetch(
      `https://api.ipoalerts.in/ipos/${slug}`,
      {
        headers: {
          'x-api-key': apiKey
        }
      }
    )

    if (!response.ok) return null

    const data = await response.json()
    // ipoalerts doesn't provide subscription data in their current API
    // This is a placeholder for when they add it
    return null
  } catch (error) {
    console.error('[v0] Error fetching from ipoalerts:', error)
    return null
  }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const results: { name: string; updated: boolean; error?: string }[] = []

  try {
    // Get all open IPOs
    const { data: openIPOs, error: fetchError } = await supabase
      .from('ipos')
      .select('id, name, slug, exchange, nse_symbol, bse_scrip_code')
      .in('status', ['open', 'lastday'])

    if (fetchError) {
      console.error('[v0] Error fetching open IPOs:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    if (!openIPOs || openIPOs.length === 0) {
      return NextResponse.json({ 
        message: 'No open IPOs to update', 
        updatedAt: new Date().toISOString() 
      })
    }

    // Update subscription for each open IPO
    for (const ipo of openIPOs) {
      let subscriptionData: SubscriptionData | null = null

      // Try NSE first for mainboard, BSE for SME
      if (ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT') {
        if (ipo.nse_symbol) {
          subscriptionData = await fetchNSESubscription(ipo.nse_symbol)
        }
      } else if (ipo.exchange === 'BSE SME' && ipo.bse_scrip_code) {
        subscriptionData = await fetchBSESubscription(ipo.bse_scrip_code)
      } else if (ipo.exchange === 'NSE SME' && ipo.nse_symbol) {
        subscriptionData = await fetchNSESubscription(ipo.nse_symbol)
      }

      if (subscriptionData) {
        const { error: updateError } = await supabase
          .from('ipos')
          .update({
            subscription_total: subscriptionData.total,
            subscription_retail: subscriptionData.retail,
            subscription_nii: subscriptionData.nii,
            subscription_qib: subscriptionData.qib,
            subscription_day: subscriptionData.day,
            subscription_is_final: subscriptionData.isFinal,
            updated_at: new Date().toISOString()
          })
          .eq('id', ipo.id)

        if (updateError) {
          results.push({ name: ipo.name, updated: false, error: updateError.message })
        } else {
          results.push({ name: ipo.name, updated: true })
        }
      } else {
        results.push({ name: ipo.name, updated: false, error: 'No subscription data found' })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      message: 'Subscription update completed',
      updatedAt: new Date().toISOString(),
      results
    })

  } catch (error) {
    console.error('[v0] Cron job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Also support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
