import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET

// Create Supabase client for server-side
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('[v0] Supabase credentials not configured')
    return null
  }
  
  return createSupabaseClient(url, key)
}

interface SubscriptionData {
  total: number
  retail: string
  nii: string
  qib: string
  day: number
  isFinal: boolean
}

/**
 * Scrape subscription data from InvestorGain
 * URL format: https://www.investorgain.com/subscription/{ipo-slug}/{id}/
 * Example: https://www.investorgain.com/subscription/om-power-transmission-ipo/1941/
 */
async function scrapeInvestorGainSubscription(url: string): Promise<SubscriptionData | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.google.com/',
    }

    const response = await fetch(url, { 
      headers,
      next: { revalidate: 0 }
    })

    if (!response.ok) {
      console.log(`[v0] InvestorGain Subscription returned ${response.status} for ${url}`)
      return null
    }

    const html = await response.text()
    
    let total = 0, retail = '0x', nii = '0x', qib = '0x', day = 1
    let isFinal = false

    // Parse total subscription
    const totalPatterns = [
      /Total[^<]*?Subscription[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /Overall[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /"totalSubscription"[:\s]*"?([0-9.]+)/i,
      /Total[:\s]*([0-9.]+)\s*times/i,
      /Application\s*Received[^<]*?([0-9.]+)\s*times/i,
    ]

    for (const pattern of totalPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        total = parseFloat(match[1])
        break
      }
    }

    // Parse retail subscription
    const retailPatterns = [
      /Retail[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /RII[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /Retail\s*Individual[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /"retailSubscription"[:\s]*"?([0-9.]+)/i,
    ]

    for (const pattern of retailPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        retail = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    // Parse NII subscription (may have sNII and bNII separately)
    const niiPatterns = [
      /(?:s)?NII[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /Non[- ]Institutional[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /"niiSubscription"[:\s]*"?([0-9.]+)/i,
    ]

    for (const pattern of niiPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        nii = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    // Parse QIB subscription
    const qibPatterns = [
      /QIB[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /Qualified\s*Institutional[^<]*?([0-9.]+)\s*(?:x|times)/i,
      /"qibSubscription"[:\s]*"?([0-9.]+)/i,
    ]

    for (const pattern of qibPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        qib = `${parseFloat(match[1]).toFixed(2)}x`
        break
      }
    }

    // Parse day information
    const dayPatterns = [
      /Day\s*(\d+)/i,
      /Day[:\s]*(\d+)\s*(?:of|\/)/i,
      /"day"[:\s]*"?(\d+)/i,
    ]

    for (const pattern of dayPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        day = parseInt(match[1])
        break
      }
    }

    // Check if subscription is final
    isFinal = /subscription\s*closed|final\s*subscription|status[:\s]*closed|bidding\s*closed/i.test(html)

    // Only return if we found some data
    if (total > 0 || retail !== '0x') {
      console.log(`[v0] Scraped subscription from ${url}: Total=${total}, Retail=${retail}, NII=${nii}, QIB=${qib}`)
      return { total, retail, nii, qib, day, isFinal }
    }

    return null
  } catch (error) {
    console.error(`[v0] Error scraping InvestorGain subscription ${url}:`, error)
    return null
  }
}

/**
 * Scrape subscription from Chittorgarh as fallback
 */
async function scrapeChittorgarhSubscription(url: string): Promise<SubscriptionData | null> {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }

    const response = await fetch(url, { headers, next: { revalidate: 0 } })
    if (!response.ok) return null

    const html = await response.text()
    
    let total = 0, retail = '0x', nii = '0x', qib = '0x', day = 1
    let isFinal = false

    // Similar patterns but adjusted for Chittorgarh's HTML structure
    const totalMatch = html.match(/Total[^<]*?([0-9.]+)\s*(?:x|times)/i)
    if (totalMatch) total = parseFloat(totalMatch[1])

    const retailMatch = html.match(/Retail[^<]*?([0-9.]+)\s*(?:x|times)/i)
    if (retailMatch) retail = `${parseFloat(retailMatch[1]).toFixed(2)}x`

    const niiMatch = html.match(/NII[^<]*?([0-9.]+)\s*(?:x|times)/i)
    if (niiMatch) nii = `${parseFloat(niiMatch[1]).toFixed(2)}x`

    const qibMatch = html.match(/QIB[^<]*?([0-9.]+)\s*(?:x|times)/i)
    if (qibMatch) qib = `${parseFloat(qibMatch[1]).toFixed(2)}x`

    const dayMatch = html.match(/Day\s*(\d+)/i)
    if (dayMatch) day = parseInt(dayMatch[1])

    isFinal = /subscription\s*closed|final/i.test(html)

    if (total > 0 || retail !== '0x') {
      return { total, retail, nii, qib, day, isFinal }
    }

    return null
  } catch (error) {
    console.error(`[v0] Error scraping Chittorgarh subscription ${url}:`, error)
    return null
  }
}

export async function GET(request: Request) {
  // Verify cron secret (optional)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const results: { name: string; subscription: SubscriptionData | null; updated: boolean; error?: string }[] = []

  try {
    // Get all IPOs that are open or lastday (subscription tracking relevant)
    const { data: ipos, error: fetchError } = await supabase
      .from('ipos')
      .select('id, name, slug, investorgain_sub_url, chittorgarh_url')
      .in('status', ['open', 'lastday'])

    if (fetchError) {
      console.error('[v0] Error fetching IPOs for subscription scrape:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    if (!ipos || ipos.length === 0) {
      return NextResponse.json({ 
        message: 'No open IPOs to scrape subscription for', 
        updatedAt: new Date().toISOString() 
      })
    }

    // Scrape subscription for each IPO
    for (const ipo of ipos) {
      let subscriptionData: SubscriptionData | null = null

      // Priority 1: InvestorGain Subscription URL
      if (ipo.investorgain_sub_url) {
        subscriptionData = await scrapeInvestorGainSubscription(ipo.investorgain_sub_url)
      }

      // Priority 2: Chittorgarh URL (fallback)
      if (!subscriptionData && ipo.chittorgarh_url) {
        subscriptionData = await scrapeChittorgarhSubscription(ipo.chittorgarh_url)
      }

      if (subscriptionData) {
        // Update IPO with subscription data
        const { error: updateError } = await supabase
          .from('ipos')
          .update({
            subscription_total: subscriptionData.total,
            subscription_retail: subscriptionData.retail,
            subscription_nii: subscriptionData.nii,
            subscription_qib: subscriptionData.qib,
            subscription_day: subscriptionData.day,
            subscription_is_final: subscriptionData.isFinal,
            last_scraped_at: new Date().toISOString(),
          })
          .eq('id', ipo.id)

        // Also insert into subscription history
        const today = new Date().toISOString().split('T')[0]
        const currentTime = new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        })

        await supabase
          .from('subscription_history')
          .upsert({
            ipo_id: ipo.id,
            date: today,
            time: currentTime,
            retail: parseFloat(subscriptionData.retail.replace('x', '')) || 0,
            nii: parseFloat(subscriptionData.nii.replace('x', '')) || 0,
            qib: parseFloat(subscriptionData.qib.replace('x', '')) || 0,
            total: subscriptionData.total,
          }, {
            onConflict: 'ipo_id,date,time',
            ignoreDuplicates: false,
          })

        if (updateError) {
          results.push({ name: ipo.name, subscription: subscriptionData, updated: false, error: updateError.message })
        } else {
          results.push({ name: ipo.name, subscription: subscriptionData, updated: true })
        }
      } else {
        results.push({ name: ipo.name, subscription: null, updated: false, error: 'No subscription data found' })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      message: 'Subscription scrape completed',
      updatedAt: new Date().toISOString(),
      results,
      successCount: results.filter(r => r.updated).length,
      totalCount: results.length,
    })

  } catch (error) {
    console.error('[v0] Subscription scrape cron error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Support POST for manual triggers from admin dashboard
export async function POST(request: Request) {
  return GET(request)
}
