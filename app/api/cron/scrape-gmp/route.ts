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

interface GMPScrapeResult {
  gmp: number | null
  gmpPercent: number | null
  estListing: number | null
  source: string
}

/**
 * Scrape GMP data from InvestorGain
 * URL format: https://www.investorgain.com/gmp/{ipo-slug}-gmp/{id}/
 * Example: https://www.investorgain.com/gmp/propshare-celestia-ipo-gmp/2226/
 */
async function scrapeInvestorGainGMP(url: string): Promise<GMPScrapeResult> {
  const result: GMPScrapeResult = { gmp: null, gmpPercent: null, estListing: null, source: 'investorgain' }
  
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
      console.log(`[v0] InvestorGain GMP returned ${response.status} for ${url}`)
      return result
    }

    const html = await response.text()
    
    // Parse GMP value from InvestorGain HTML
    // Common patterns on InvestorGain:
    // - "GMP: ₹35" or "GMP ₹35"
    // - "IPO GMP Today: ₹35"
    // - Table cells with GMP values
    // - "Grey Market Premium: ₹35"
    
    const gmpPatterns = [
      // Table row patterns (most reliable on InvestorGain)
      /GMP[^<]*?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /Grey\s*Market\s*Premium[^<]*?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /Current\s*GMP[^<]*?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /IPO\s*GMP\s*Today[^<]*?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      // JSON-like patterns
      /"gmp"[:\s]*"?([+-]?\d+(?:\.\d+)?)/i,
      /"currentGmp"[:\s]*"?([+-]?\d+(?:\.\d+)?)/i,
      // Structured data patterns
      /data-gmp="([+-]?\d+(?:\.\d+)?)"/i,
      // Text patterns
      /GMP\s*[:=]\s*[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
    ]
    
    for (const pattern of gmpPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        result.gmp = parseFloat(match[1])
        break
      }
    }

    // Parse GMP percentage
    const percentPatterns = [
      /GMP[^<]*?([+-]?\d+(?:\.\d+)?)\s*%/i,
      /([+-]?\d+(?:\.\d+)?)\s*%\s*(?:listing\s*)?gain/i,
      /"gmpPercent"[:\s]*"?([+-]?\d+(?:\.\d+)?)/i,
    ]
    
    for (const pattern of percentPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        result.gmpPercent = parseFloat(match[1])
        break
      }
    }

    // Parse estimated listing price
    const listingPatterns = [
      /Est(?:imated)?\s*List(?:ing)?\s*Price[^<]*?[₹Rs.\s]*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      /Expected\s*List(?:ing)?[^<]*?[₹Rs.\s]*(\d+(?:,\d+)*(?:\.\d+)?)/i,
      /"estimatedListing"[:\s]*"?(\d+(?:\.\d+)?)/i,
    ]
    
    for (const pattern of listingPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        result.estListing = parseFloat(match[1].replace(/,/g, ''))
        break
      }
    }

    console.log(`[v0] Scraped GMP from ${url}: GMP=${result.gmp}, Percent=${result.gmpPercent}`)
    return result
  } catch (error) {
    console.error(`[v0] Error scraping InvestorGain GMP ${url}:`, error)
    return result
  }
}

/**
 * Scrape GMP from Chittorgarh as fallback
 * URL format: https://www.chittorgarh.com/ipo/{slug}/{id}/
 */
async function scrapeChittorgarhGMP(url: string): Promise<GMPScrapeResult> {
  const result: GMPScrapeResult = { gmp: null, gmpPercent: null, estListing: null, source: 'chittorgarh' }
  
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }

    const response = await fetch(url, { headers, next: { revalidate: 0 } })
    if (!response.ok) return result

    const html = await response.text()
    
    // Chittorgarh GMP patterns
    const gmpMatch = html.match(/GMP[:\s]*[₹Rs.]*\s*([+-]?\d+)/i)
    if (gmpMatch) {
      result.gmp = parseFloat(gmpMatch[1])
    }

    const percentMatch = html.match(/([+-]?\d+(?:\.\d+)?)\s*%\s*(?:premium|gain)/i)
    if (percentMatch) {
      result.gmpPercent = parseFloat(percentMatch[1])
    }

    return result
  } catch (error) {
    console.error(`[v0] Error scraping Chittorgarh ${url}:`, error)
    return result
  }
}

export async function GET(request: Request) {
  // Verify cron secret (optional - allows both authenticated and manual calls)
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const results: { name: string; gmp: number | null; updated: boolean; error?: string }[] = []

  try {
    // Get all IPOs that need GMP tracking (not yet listed)
    const { data: ipos, error: fetchError } = await supabase
      .from('ipos')
      .select('id, name, slug, price_max, investorgain_gmp_url, chittorgarh_url')
      .in('status', ['open', 'lastday', 'upcoming', 'allot', 'listing'])

    if (fetchError) {
      console.error('[v0] Error fetching IPOs for GMP scrape:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch IPOs' }, { status: 500 })
    }

    if (!ipos || ipos.length === 0) {
      return NextResponse.json({ 
        message: 'No IPOs to scrape GMP for', 
        updatedAt: new Date().toISOString() 
      })
    }

    // Scrape GMP for each IPO
    for (const ipo of ipos) {
      let gmpResult: GMPScrapeResult = { gmp: null, gmpPercent: null, estListing: null, source: '' }

      // Priority 1: InvestorGain GMP URL
      if (ipo.investorgain_gmp_url) {
        gmpResult = await scrapeInvestorGainGMP(ipo.investorgain_gmp_url)
      }

      // Priority 2: Chittorgarh URL (fallback)
      if (gmpResult.gmp === null && ipo.chittorgarh_url) {
        gmpResult = await scrapeChittorgarhGMP(ipo.chittorgarh_url)
      }

      if (gmpResult.gmp !== null) {
        // Calculate GMP percent if not provided
        const gmpPercent = gmpResult.gmpPercent ?? 
          (ipo.price_max && ipo.price_max > 0 
            ? Math.round((gmpResult.gmp / ipo.price_max) * 100 * 10) / 10 
            : 0)

        const now = new Date().toISOString()
        const today = now.split('T')[0]

        // Update IPO with new GMP
        const { error: updateError } = await supabase
          .from('ipos')
          .update({
            gmp: gmpResult.gmp,
            gmp_percent: gmpPercent,
            gmp_last_updated: now,
            last_scraped_at: now,
          })
          .eq('id', ipo.id)

        // Upsert into GMP history (one record per day per IPO)
        await supabase
          .from('gmp_history')
          .upsert({
            ipo_id: ipo.id,
            date: today,
            gmp: gmpResult.gmp,
            gmp_percent: gmpPercent,
            source: gmpResult.source,
            recorded_at: now,
          }, {
            onConflict: 'ipo_id,date',
            ignoreDuplicates: false,
          })

        if (updateError) {
          results.push({ name: ipo.name, gmp: gmpResult.gmp, updated: false, error: updateError.message })
        } else {
          results.push({ name: ipo.name, gmp: gmpResult.gmp, updated: true })
        }
      } else {
        results.push({ name: ipo.name, gmp: null, updated: false, error: 'No GMP data found' })
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    return NextResponse.json({
      message: 'GMP scrape completed',
      updatedAt: new Date().toISOString(),
      results,
      successCount: results.filter(r => r.updated).length,
      totalCount: results.length,
    })

  } catch (error) {
    console.error('[v0] GMP scrape cron error:', error)
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
