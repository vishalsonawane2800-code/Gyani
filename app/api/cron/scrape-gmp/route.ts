import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * GMP Scraper for IPOGyani
 * 
 * Scrapes GMP (Grey Market Premium) from InvestorGain and Chittorgarh
 * 
 * Table structure from these sites:
 * | GMP Date    | IPO Price | GMP      | Subscription | Sub2 Sauda | Est. Listing | Est. Profit | Last Updated |
 * | 10-04-2026  | 175.00    | Rs 2.5   | 0.71x        | 200/2800   | Rs177.5(1%)  | Rs212.5     | 10-Apr-2026  |
 * 
 * The GMP column (3rd) contains values like "Rs 2.5", "Rs -5", "Rs 50"
 */

const CRON_SECRET = process.env.CRON_SECRET

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    console.error('[GMP Scraper] Supabase credentials not configured')
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
 * Parse GMP value from a cell's text content
 * 
 * InvestorGain formats observed:
 * - "₹1.5 —" (with yellow dash indicator)
 * - "₹3.5 ▼" (with red down arrow)
 * - "₹7 ▲" (with green up arrow)
 * - "₹0 —" (zero GMP)
 * - "Rs 2.5", "Rs. 50", "Rs-5"
 */
function parseGMPValue(text: string): number | null {
  if (!text) return null
  
  // Remove HTML tags first
  let clean = text.replace(/<[^>]*>/g, ' ')
  
  // Remove common non-numeric characters but keep digits, dots, minus (for negative), plus
  clean = clean
    .replace(/₹/g, '') // Remove rupee symbol
    .replace(/Rs\.?\s*/gi, '') // Remove Rs or Rs.
    // Remove arrow/trend indicators (various unicode chars used by InvestorGain)
    .replace(/[▼▲↓↑⬇⬆🔻🔺]/g, ' ')
    // Remove dash indicators (yellow "—" dash shown for neutral)
    .replace(/[—–―\u2014\u2013\u2015]/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/,/g, '') // Remove commas
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
  
  // Now extract the first number we find
  // Match patterns: "1.5", "-5", "0", "50.00"
  // Use \b for word boundary to avoid matching parts of other numbers
  const match = clean.match(/([+-]?\d+(?:\.\d+)?)/)
  if (match && match[1]) {
    const value = parseFloat(match[1])
    // GMP values are typically between -500 and 500
    // Allow 0 as valid GMP (seen in Propshare example)
    if (!isNaN(value) && value >= -500 && value <= 500) {
      console.log(`[GMP Scraper] Parsed GMP value: ${value} from cleaned text: "${clean}"`)
      return value
    }
  }
  
  console.log(`[GMP Scraper] Failed to parse GMP from: "${clean}" (original: "${text.substring(0, 50)}")`)
  return null
}

/**
 * Extract GMP from InvestorGain table
 * 
 * InvestorGain table structure (from screenshots):
 * | GMP Date    | IPO Price | GMP     | Subscription | Sub2 Sauda Rate | Estimated Listing Price | Estimated Profit* | Last Updated |
 * | 11-04-2026  | 175.00    | ₹1.5 —  | 0.71x        | 100/1400        | ₹176.5 (0.86%)          | ₹127.5            | 11-Apr-2026  |
 * 
 * Key insight: GMP column (index 2) has values like "₹1.5 —" or "₹0 —"
 * The header row has "GMP" exactly as the column header
 */
function extractGMPFromTable(html: string): number | null {
  // Find all tables
  const tablePattern = /<table[^>]*>([\s\S]*?)<\/table>/gi
  const tables = [...html.matchAll(tablePattern)]
  
  for (const tableMatch of tables) {
    const tableContent = tableMatch[1]
    
    // Check if this table has GMP-related content (case insensitive)
    if (!/gmp|grey\s*market/i.test(tableContent)) continue
    
    // Extract all rows
    const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
    const rows = [...tableContent.matchAll(rowPattern)]
    
    // Find header row to determine column indices
    let gmpColumnIndex = -1
    let headerFound = false
    
    for (const row of rows) {
      const rowContent = row[1]
      
      // Check if this is a header row (contains th elements)
      if (/<th/i.test(rowContent)) {
        headerFound = true
        // Extract header cells
        const cellPattern = /<th[^>]*>([\s\S]*?)<\/th>/gi
        const cells = [...rowContent.matchAll(cellPattern)]
        
        console.log(`[GMP Scraper] Found ${cells.length} header cells`)
        
        for (let i = 0; i < cells.length; i++) {
          const cellText = cells[i][1].replace(/<[^>]*>/g, '').trim().toLowerCase()
          console.log(`[GMP Scraper] Header ${i}: "${cellText}"`)
          
          // Match ONLY the GMP column, NOT "GMP Date" or "Estimated Profit"
          // InvestorGain header is exactly "GMP"
          if (cellText === 'gmp') {
            gmpColumnIndex = i
            console.log(`[GMP Scraper] Found exact GMP column at index ${i}`)
            break
          }
        }
        
        if (gmpColumnIndex >= 0) break
      }
    }
    
    // If we didn't find an exact "GMP" header, try index 2 for InvestorGain tables
    // (GMP Date=0, IPO Price=1, GMP=2)
    if (gmpColumnIndex < 0 && headerFound) {
      gmpColumnIndex = 2
      console.log(`[GMP Scraper] Using default GMP column index 2`)
    }
    
    // Extract value from first data row
    if (gmpColumnIndex >= 0) {
      for (const row of rows) {
        const rowContent = row[1]
        
        // Skip header rows
        if (/<th/i.test(rowContent)) continue
        
        // Extract data cells
        const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/gi
        const cells = [...rowContent.matchAll(cellPattern)]
        
        // Need enough columns
        if (cells.length <= gmpColumnIndex) {
          console.log(`[GMP Scraper] Row has only ${cells.length} cells, need at least ${gmpColumnIndex + 1}`)
          continue
        }
        
        // First row should have the most recent GMP
        const gmpCellHtml = cells[gmpColumnIndex][1]
        console.log(`[GMP Scraper] GMP cell HTML: "${gmpCellHtml.substring(0, 100)}"`)
        
        const gmpValue = parseGMPValue(gmpCellHtml)
        
        if (gmpValue !== null) {
          console.log(`[GMP Scraper] Extracted GMP ${gmpValue} from column ${gmpColumnIndex}`)
          return gmpValue
        } else {
          // Log the raw text for debugging
          const rawText = gmpCellHtml.replace(/<[^>]*>/g, '').trim()
          console.log(`[GMP Scraper] Could not parse GMP from: "${rawText}"`)
        }
        
        // Only try the first data row for most recent GMP
        break
      }
    }
  }
  
  return null
}

/**
 * Fallback: Look for GMP in text patterns
 * Handles various formats from different sources
 */
function extractGMPFromText(html: string): number | null {
  // Remove HTML tags for cleaner matching
  const cleanHtml = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
  
  // Try multiple patterns in order of specificity
  const patterns = [
    // Pattern 1: "GMP: Rs 2.5" or "GMP Today: Rs 2.5" or "GMP is Rs 50"
    /GMP\s*(?:Today|is)?[\s:]+(?:Rs\.?|₹)?\s*([+-]?\d+(?:\.\d+)?)/i,
    // Pattern 2: "Current GMP: 2.5" or "Current GMP Rs. 50"
    /Current\s*GMP[\s:]+(?:Rs\.?|₹)?\s*([+-]?\d+(?:\.\d+)?)/i,
    // Pattern 3: "Latest GMP: 2.5"
    /Latest\s*GMP[\s:]+(?:Rs\.?|₹)?\s*([+-]?\d+(?:\.\d+)?)/i,
    // Pattern 4: "Grey Market Premium: Rs 2.5"
    /Grey\s*Market\s*Premium[\s:]+(?:Rs\.?|₹)?\s*([+-]?\d+(?:\.\d+)?)/i,
    // Pattern 5: "GMP Rs 50" or "GMP ₹50" (without colon)
    /GMP\s+(?:Rs\.?|₹)\s*([+-]?\d+(?:\.\d+)?)/i,
    // Pattern 6: Look for Rs value after GMP mention within 50 chars
    /GMP.{0,30}?(?:Rs\.?|₹)\s*([+-]?\d+(?:\.\d+)?)/i,
  ]
  
  for (const pattern of patterns) {
    const match = cleanHtml.match(pattern)
    if (match && match[1]) {
      const value = parseFloat(match[1])
      if (!isNaN(value) && value >= -500 && value <= 500) {
        console.log(`[GMP Scraper] Found GMP ${value} from text pattern`)
        return value
      }
    }
  }
  
  return null
}

/**
 * Scrape GMP from InvestorGain
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
      console.log(`[GMP Scraper] InvestorGain returned ${response.status} for ${url}`)
      return result
    }

    const html = await response.text()
    
    // Try table extraction first (most reliable)
    result.gmp = extractGMPFromTable(html)
    
    // Fallback to text patterns
    if (result.gmp === null) {
      result.gmp = extractGMPFromText(html)
    }
    
    // Extract GMP percentage if available
    const percentMatch = html.match(/\(\s*([+-]?\d+(?:\.\d+)?)\s*%\s*\)/i)
    if (percentMatch) {
      result.gmpPercent = parseFloat(percentMatch[1])
    }

    console.log(`[GMP Scraper] InvestorGain result for ${url}: GMP=${result.gmp}`)
    return result
  } catch (error) {
    console.error(`[GMP Scraper] Error scraping InvestorGain ${url}:`, error)
    return result
  }
}

/**
 * Scrape GMP from Chittorgarh (fallback)
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
    
    // Try table extraction first
    result.gmp = extractGMPFromTable(html)
    
    // Fallback to text patterns
    if (result.gmp === null) {
      result.gmp = extractGMPFromText(html)
    }
    
    // Extract percentage
    const percentMatch = html.match(/\(\s*([+-]?\d+(?:\.\d+)?)\s*%\s*\)/i)
    if (percentMatch) {
      result.gmpPercent = parseFloat(percentMatch[1])
    }

    console.log(`[GMP Scraper] Chittorgarh result for ${url}: GMP=${result.gmp}`)
    return result
  } catch (error) {
    console.error(`[GMP Scraper] Error scraping Chittorgarh ${url}:`, error)
    return result
  }
}

/**
 * Determine time slot based on current IST time
 */
function getTimeSlot(): 'morning' | 'evening' {
  const now = new Date()
  const utcHour = now.getUTCHours()
  const utcMinutes = now.getUTCMinutes()
  
  // IST is UTC + 5:30
  // 3 PM IST = 9:30 AM UTC
  const utcTime = utcHour + utcMinutes / 60
  return utcTime < 9.5 ? 'morning' : 'evening'
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (CRON_SECRET && authHeader && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
  }

  const timeSlot = getTimeSlot()
  const results: { name: string; gmp: number | null; updated: boolean; error?: string }[] = []

  try {
    // Get all active IPOs
    const { data: ipos, error: fetchError } = await supabase
      .from('ipos')
      .select('id, company_name, slug, price_max, investorgain_gmp_url, chittorgarh_url')
      .in('status', ['open', 'lastday', 'upcoming', 'allot', 'listing'])

    if (fetchError) {
      console.error('[GMP Scraper] Error fetching IPOs:', fetchError)
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

        // Upsert into GMP history (with time_slot for twice-daily tracking)
        const { error: historyError } = await supabase
          .from('gmp_history')
          .upsert({
            ipo_id: ipo.id,
            date: today,
            time_slot: timeSlot,
            gmp: gmpResult.gmp,
            gmp_percent: gmpPercent,
            source: gmpResult.source,
            recorded_at: now,
          }, {
            onConflict: 'ipo_id,date,time_slot',
            ignoreDuplicates: false,
          })

        // If upsert fails (constraint might not exist yet), try manual approach
        if (historyError) {
          const { data: existing } = await supabase
            .from('gmp_history')
            .select('id')
            .eq('ipo_id', ipo.id)
            .eq('date', today)
            .maybeSingle()

          if (existing) {
            await supabase
              .from('gmp_history')
              .update({
                gmp: gmpResult.gmp,
                gmp_percent: gmpPercent,
                source: gmpResult.source,
                recorded_at: now,
              })
              .eq('id', existing.id)
          } else {
            await supabase
              .from('gmp_history')
              .insert({
                ipo_id: ipo.id,
                date: today,
                gmp: gmpResult.gmp,
                gmp_percent: gmpPercent,
                source: gmpResult.source,
                recorded_at: now,
              })
          }
        }

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
      timeSlot,
      updatedAt: new Date().toISOString(),
      results,
      successCount: results.filter(r => r.updated).length,
      totalCount: results.length,
    })

  } catch (error) {
    console.error('[GMP Scraper] Cron error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Support POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
