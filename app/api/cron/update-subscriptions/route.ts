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

interface ChittorgarhData {
  subscription: SubscriptionData | null
  gmp: number | null
}

// Scrape GMP and subscription data from Chittorgarh IPO page
async function fetchFromChittorgarh(chittorgarhUrl: string): Promise<ChittorgarhData> {
  const result: ChittorgarhData = { subscription: null, gmp: null }
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }

    const response = await fetch(chittorgarhUrl, { 
      headers,
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      console.log(`[v0] Chittorgarh returned ${response.status} for ${chittorgarhUrl}`)
      return result
    }

    const html = await response.text()
    
    // Parse GMP from HTML
    // Look for patterns like "GMP ₹123" or "Grey Market Premium ₹123" or "GMP: ₹123"
    const gmpPatterns = [
      /GMP[:\s]*[₹Rs.]*\s*([+-]?\d+)/i,
      /Grey\s*Market\s*Premium[:\s]*[₹Rs.]*\s*([+-]?\d+)/i,
      /IPO\s*GMP[:\s]*[₹Rs.]*\s*([+-]?\d+)/i,
      /"gmp"[:\s]*([+-]?\d+)/i,
      /GMP\s*Today[:\s]*[₹Rs.]*\s*([+-]?\d+)/i,
    ]
    
    for (const pattern of gmpPatterns) {
      const gmpMatch = html.match(pattern)
      if (gmpMatch && gmpMatch[1]) {
        result.gmp = parseInt(gmpMatch[1])
        break
      }
    }

    // Parse subscription data from HTML
    // Look for subscription table patterns
    const subscriptionPatterns = {
      total: [
        /Total[:\s]*Subscription[:\s]*([0-9.]+)\s*x/i,
        /Overall[:\s]*Subscription[:\s]*([0-9.]+)\s*x/i,
        /"totalSubscription"[:\s]*"?([0-9.]+)/i,
        /Total[:\s]*([0-9.]+)\s*times/i,
      ],
      retail: [
        /Retail[:\s]*([0-9.]+)\s*x/i,
        /RII[:\s]*([0-9.]+)\s*x/i,
        /"retailSubscription"[:\s]*"?([0-9.]+)/i,
        /Retail[:\s]*Individual[:\s]*([0-9.]+)\s*x/i,
      ],
      nii: [
        /NII[:\s]*([0-9.]+)\s*x/i,
        /sNII[:\s]*([0-9.]+)\s*x.*?bNII[:\s]*([0-9.]+)\s*x/i,
        /"niiSubscription"[:\s]*"?([0-9.]+)/i,
        /Non[- ]Institutional[:\s]*([0-9.]+)\s*x/i,
      ],
      qib: [
        /QIB[:\s]*([0-9.]+)\s*x/i,
        /"qibSubscription"[:\s]*"?([0-9.]+)/i,
        /Qualified[:\s]*Institutional[:\s]*([0-9.]+)\s*x/i,
      ],
    }

    let total = 0, retail = '0x', nii = '0x', qib = '0x'

    for (const pattern of subscriptionPatterns.total) {
      const match = html.match(pattern)
      if (match && match[1]) {
        total = parseFloat(match[1])
        break
      }
    }

    for (const pattern of subscriptionPatterns.retail) {
      const match = html.match(pattern)
      if (match && match[1]) {
        retail = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    for (const pattern of subscriptionPatterns.nii) {
      const match = html.match(pattern)
      if (match && match[1]) {
        nii = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    for (const pattern of subscriptionPatterns.qib) {
      const match = html.match(pattern)
      if (match && match[1]) {
        qib = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    // Check for day information
    let day = 1
    const dayMatch = html.match(/Day[:\s]*(\d+)/i)
    if (dayMatch && dayMatch[1]) {
      day = parseInt(dayMatch[1])
    }

    // Check if subscription is final (after close date)
    const isFinal = /subscription\s*closed|final\s*subscription|subscription\s*status[:\s]*closed/i.test(html)

    if (total > 0 || retail !== '0x') {
      result.subscription = {
        total,
        retail,
        nii,
        qib,
        day,
        isFinal
      }
    }

    return result
  } catch (error) {
    console.error(`[v0] Error scraping Chittorgarh ${chittorgarhUrl}:`, error)
    return result
  }
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  const results: { name: string; updated: boolean; gmpUpdated?: boolean; error?: string }[] = []

  try {
    // Get all open IPOs (including chittorgarh_url)
    const { data: openIPOs, error: fetchError } = await supabase
      .from('ipos')
      .select('id, company_name, slug, exchange, nse_symbol, bse_scrip_code, chittorgarh_url')
      .in('status', ['open', 'lastday', 'upcoming', 'allot'])

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

    // Update subscription and GMP for each open IPO
    for (const ipo of openIPOs) {
      let subscriptionData: SubscriptionData | null = null
      let gmpValue: number | null = null

      // PRIORITY 1: Try Chittorgarh URL if available (best source for both GMP and subscription)
      if (ipo.chittorgarh_url) {
        console.log(`[v0] Fetching from Chittorgarh for ${ipo.company_name}: ${ipo.chittorgarh_url}`)
        const chittorgarhData = await fetchFromChittorgarh(ipo.chittorgarh_url)
        
        if (chittorgarhData.subscription) {
          subscriptionData = chittorgarhData.subscription
        }
        if (chittorgarhData.gmp !== null) {
          gmpValue = chittorgarhData.gmp
        }
      }

      // PRIORITY 2: Fallback to NSE/BSE APIs if no subscription from Chittorgarh
      if (!subscriptionData) {
        if (ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT') {
          if (ipo.nse_symbol) {
            subscriptionData = await fetchNSESubscription(ipo.nse_symbol)
          }
        } else if (ipo.exchange === 'BSE SME' && ipo.bse_scrip_code) {
          subscriptionData = await fetchBSESubscription(ipo.bse_scrip_code)
        } else if (ipo.exchange === 'NSE SME' && ipo.nse_symbol) {
          subscriptionData = await fetchNSESubscription(ipo.nse_symbol)
        }
      }

      // Prepare update object
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString()
      }

      // Add subscription data if available
      if (subscriptionData) {
        updateData.subscription_total = subscriptionData.total
        updateData.subscription_retail = subscriptionData.retail
        updateData.subscription_nii = subscriptionData.nii
        updateData.subscription_qib = subscriptionData.qib
        updateData.subscription_day = subscriptionData.day
        updateData.subscription_is_final = subscriptionData.isFinal
      }

      // Update IPO if we have any data
      if (subscriptionData || gmpValue !== null) {
        const { error: updateError } = await supabase
          .from('ipos')
          .update(updateData)
          .eq('id', ipo.id)

        // Also insert GMP into gmp_history if we have a new value
        if (gmpValue !== null) {
          await supabase
            .from('gmp_history')
            .insert({
              ipo_id: ipo.id,
              gmp: gmpValue,
              recorded_at: new Date().toISOString()
            })
        }

        if (updateError) {
          results.push({ name: ipo.company_name, updated: false, error: updateError.message })
        } else {
          results.push({ 
            name: ipo.company_name, 
            updated: !!subscriptionData, 
            gmpUpdated: gmpValue !== null 
          })
        }
      } else {
        results.push({ name: ipo.company_name, updated: false, error: 'No data found from any source' })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return NextResponse.json({
      message: 'Subscription and GMP update completed',
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
