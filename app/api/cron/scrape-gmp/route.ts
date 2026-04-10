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
      console.log(`InvestorGain GMP returned ${response.status} for ${url}`)
      return result
    }

    const html = await response.text()
    
    // InvestorGain GMP table structure:
    // The table has columns: GMP Date | IPO Price | GMP | Subscription | Sub2 Sauda Rate | Estimated Listing Price | Estimated Profit | Last Updated
    // The FIRST data row (after header) contains today's/latest GMP
    // GMP values appear as "₹2.5" or "₹-5" in the 3rd column (index 2)
    
    // Method 1: Find the GMP trend table and extract first row's GMP value
    // The table structure from InvestorGain/Chittorgarh:
    // | GMP Date | IPO Price | GMP | Subscription | ... |
    // | 10-04-2026 | 175.00 | ₹2.5 ▼ | 0.71x | ... |
    // The GMP column shows values like "₹2.5", "₹50", "₹-5"
    
    // Improved regex: Match table rows with date pattern, then capture GMP from 3rd column
    // The GMP cell contains: ₹{number} followed by optional arrow/indicator
    const tableRowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d{2}-\d{2}-\d{4})\s*(?:<[^>]*>)*\s*<\/td>[\s\S]*?<td[^>]*>\s*([\d,.]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*[₹Rs.]*\s*([+-]?\d+(?:\.\d+)?)/gi
    
    const rowMatches = [...html.matchAll(tableRowPattern)]
    if (rowMatches.length > 0) {
      // First match is the latest/today's GMP - group 3 is the GMP value
      const latestGmp = parseFloat(rowMatches[0][3])
      if (!isNaN(latestGmp)) {
        result.gmp = latestGmp
        console.log(`Extracted GMP from table first row (date: ${rowMatches[0][1]}, price: ${rowMatches[0][2]}): ${latestGmp}`)
      }
    }
    
    // Method 1.5: Alternative pattern - look for GMP in dedicated GMP column cells
    // Pattern matches: <td...>₹2.5</td> or <td...>₹2.5 <span class="down">▼</span></td>
    if (result.gmp === null) {
      const gmpCellPattern = /<td[^>]*>\s*[₹Rs.]*\s*([+-]?\d+(?:\.\d+)?)\s*(?:<[^>]*>[▼▲▶◀\-]*<\/[^>]*>)?\s*<\/td>/gi
      const gmpMatches = [...html.matchAll(gmpCellPattern)]
      // Filter to likely GMP values (typically small numbers like 2.5, 50, -10)
      for (const match of gmpMatches) {
        const val = parseFloat(match[1])
        // GMP values are typically between -500 and 500
        if (!isNaN(val) && val >= -500 && val <= 500) {
          result.gmp = val
          console.log(`Extracted GMP from cell pattern: ${val}`)
          break
        }
      }
    }
    
    // Method 2: Fallback - look for "GMP Today" specific patterns
    if (result.gmp === null) {
      const todayPatterns = [
        /GMP\s*Today[^₹₨Rs]*[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/i,
        /Today['']?s?\s*GMP[^₹₨Rs]*[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/i,
        /Current\s*GMP[^₹₨Rs]*[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/i,
        /Latest\s*GMP[^₹₨Rs]*[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/i,
      ]
      
      for (const pattern of todayPatterns) {
        const match = html.match(pattern)
        if (match && match[1]) {
          result.gmp = parseFloat(match[1])
          console.log(`Extracted GMP from today pattern: ${result.gmp}`)
          break
        }
      }
    }
    
    // Method 3: Look for GMP in a summary/highlight section (usually at top of page)
    // These often have special styling like card or highlight class
    if (result.gmp === null) {
      // Look for GMP in card/highlight/summary sections
      const highlightPattern = /<(?:div|span|td)[^>]*(?:class|id)=[^>]*(?:highlight|summary|current|today|card)[^>]*>[\s\S]*?[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/gi
      const highlightMatch = html.match(highlightPattern)
      if (highlightMatch) {
        const numMatch = highlightMatch[0].match(/[₹₨Rs.]\s*([+-]?\d+(?:\.\d+)?)/)
        if (numMatch) {
          result.gmp = parseFloat(numMatch[1])
          console.log(`Extracted GMP from highlight section: ${result.gmp}`)
        }
      }
    }

    // Parse GMP percentage from Estimated Listing Price column which shows "(X.XX%)"
    const percentMatch = html.match(/<td[^>]*>[^<]*\(\s*([+-]?\d+(?:\.\d+)?)\s*%\s*\)/i)
    if (percentMatch) {
      result.gmpPercent = parseFloat(percentMatch[1])
    }

    // Parse estimated listing price
    const listingPatterns = [
      /Estimated\s*Listing\s*Price[^₹₨Rs]*[₹₨Rs.]\s*(\d+(?:\.\d+)?)/i,
      /Est\.?\s*List\.?\s*Price[^₹₨Rs]*[₹₨Rs.]\s*(\d+(?:\.\d+)?)/i,
    ]
    
    for (const pattern of listingPatterns) {
      const match = html.match(pattern)
      if (match && match[1]) {
        result.estListing = parseFloat(match[1].replace(/,/g, ''))
        break
      }
    }

    console.log(`Scraped GMP from ${url}: GMP=${result.gmp}, Percent=${result.gmpPercent}`)
    return result
  } catch (error) {
    console.error(`Error scraping InvestorGain GMP ${url}:`, error)
    return result
  }
}

/**
 * Scrape GMP from Chittorgarh as fallback
 * URL format: https://www.chittorgarh.com/ipo/{slug}/{id}/
 * 
 * Chittorgarh GMP table structure (from screenshot):
 * | GMP Date    | IPO Price | GMP      | Subscription | Sub2 Sauda Rate | Estimated Listing Price | Estimated Profit | Last Updated |
 * | 10-04-2026  | 175.00    | ₹2.5 ▼   | 0.71x        | 200/2800        | ₹177.5 (1.43%)          | ₹212.5           | 10-Apr-2026  |
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
    
    // Method 1: Parse the GMP trend table - first data row has latest GMP
    // The table shows: Date | Price | GMP | Subscription | etc.
    // GMP column contains "₹2.5" or "₹2.5 ▼" format
    const tableRowPattern = /<tr[^>]*>[\s\S]*?<td[^>]*>\s*(\d{2}-\d{2}-\d{4})\s*(?:<[^>]*>)*(?:Open)?<\/td>[\s\S]*?<td[^>]*>\s*([\d,.]+)\s*<\/td>[\s\S]*?<td[^>]*>\s*[₹Rs.]*\s*([+-]?\d+(?:\.\d+)?)/gi
    
    const rowMatches = [...html.matchAll(tableRowPattern)]
    if (rowMatches.length > 0) {
      // First row is the latest GMP entry
      const latestGmp = parseFloat(rowMatches[0][3])
      if (!isNaN(latestGmp)) {
        result.gmp = latestGmp
        console.log(`Chittorgarh: Extracted GMP from table (date: ${rowMatches[0][1]}, price: ${rowMatches[0][2]}): ${latestGmp}`)
      }
    }
    
    // Method 2: Look for GMP value directly in cells with rupee symbol
    // Pattern: <td>₹2.5</td> or <td>₹2.5 <span>▼</span></td>
    if (result.gmp === null) {
      const gmpCellPattern = /<td[^>]*>\s*[₹Rs.]*\s*([+-]?\d+(?:\.\d+)?)\s*(?:<[^>]*>[▼▲\s]*<\/[^>]*>)?\s*<\/td>/gi
      const matches = [...html.matchAll(gmpCellPattern)]
      
      for (const match of matches) {
        const val = parseFloat(match[1])
        // GMP values are typically small (between -500 and 500)
        if (!isNaN(val) && val >= -500 && val <= 500) {
          result.gmp = val
          console.log(`Chittorgarh: Extracted GMP from cell: ${val}`)
          break
        }
      }
    }
    
    // Method 3: Fallback - simple GMP text pattern
    if (result.gmp === null) {
      const gmpMatch = html.match(/GMP[:\s]*[₹Rs.]*\s*([+-]?\d+(?:\.\d+)?)/i)
      if (gmpMatch) {
        result.gmp = parseFloat(gmpMatch[1])
        console.log(`Chittorgarh: Extracted GMP from text pattern: ${result.gmp}`)
      }
    }

    // Extract GMP percentage from the Estimated Listing Price column "(X.XX%)"
    const percentMatch = html.match(/\(\s*([+-]?\d+(?:\.\d+)?)\s*%\s*\)/i)
    if (percentMatch) {
      result.gmpPercent = parseFloat(percentMatch[1])
    }

    console.log(`Chittorgarh scrape result for ${url}: GMP=${result.gmp}, Percent=${result.gmpPercent}`)
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
      .select('id, company_name, slug, price_max, investorgain_gmp_url, chittorgarh_url')
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
          results.push({ name: ipo.company_name, gmp: gmpResult.gmp, updated: false, error: updateError.message })
        } else {
          results.push({ name: ipo.company_name, gmp: gmpResult.gmp, updated: true })
        }
      } else {
        results.push({ name: ipo.company_name, gmp: null, updated: false, error: 'No GMP data found' })
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
