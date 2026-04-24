/**
 * Migration script to move an IPO from "current" to "listed" status
 * and populate all historical data in the listed IPO CSV file.
 * 
 * Usage: npx ts-node scripts/migrate-ipo-to-listed.ts <ipo-id> <listing-date> <listing-price>
 * Example: npx ts-node scripts/migrate-ipo-to-listed.ts 5 2026-04-24 108
 */

import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[v0] ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

async function migrateIpoToListed(ipoId: number, listingDate: string, listingPrice: number) {
  try {
    // Fetch IPO data from current ipos table
    const { data: ipo, error: ipoError } = await supabase
      .from('ipos')
      .select('*')
      .eq('id', ipoId)
      .single()

    if (ipoError || !ipo) {
      console.error(`[v0] ERROR: IPO not found (ID: ${ipoId})`, ipoError)
      process.exit(1)
    }

    console.log(`[v0] Fetching data for IPO: ${ipo.name}`)

    // Fetch all related data
    const [
      { data: financials },
      { data: issueDetails },
      { data: gmpHistory },
      { data: subscriptionHistory },
    ] = await Promise.all([
      supabase.from('ipo_financials').select('*').eq('ipo_id', ipoId).single(),
      supabase.from('ipo_issue_details').select('*').eq('ipo_id', ipoId).single(),
      supabase.from('gmp_history').select('*').eq('ipo_id', ipoId).order('date', { ascending: false }),
      supabase
        .from('subscription_history')
        .select('*')
        .eq('ipo_id', ipoId)
        .order('date', { ascending: false })
        .limit(1),
    ])

    console.log('[v0] Fetched related data')

    // Extract year from listing date
    const year = new Date(listingDate).getFullYear()
    const csvPath = path.join(process.cwd(), 'data', 'listed-ipos', String(year), `${year}.csv`)
    const csvDir = path.dirname(csvPath)

    // Ensure directory exists
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true })
      console.log(`[v0] Created directory: ${csvDir}`)
    }

    // Calculate listing gain
    const issuePrice = ipo.price_max
    const listingGain = ((listingPrice - issuePrice) / issuePrice) * 100

    // Get final subscription data
    const finalSub = subscriptionHistory && subscriptionHistory.length > 0 ? subscriptionHistory[0] : null
    const totalSub = finalSub ? finalSub.total : ipo.subscription_total || null

    // Get GMP prediction (highest GMP from history)
    let gmpPredictionStr = '-'
    let gmpPredictionNum = 0
    if (gmpHistory && gmpHistory.length > 0) {
      const maxGmp = Math.max(...gmpHistory.map(g => g.gmp_percent))
      const minGmp = Math.min(...gmpHistory.map(g => g.gmp_percent))
      gmpPredictionStr = `${minGmp.toFixed(0)}-${maxGmp.toFixed(0)}%`
      gmpPredictionNum = maxGmp
    }

    // Calculate prediction accuracy (actual gain vs AI prediction)
    let predictionAccuracy = null
    if (ipo.ai_prediction && ipo.ai_prediction > 0) {
      predictionAccuracy = ((listingGain - ipo.ai_prediction) / Math.abs(ipo.ai_prediction)) * 100
    }

    // Prepare CSV row data
    const csvRow = {
      'IPO Name': ipo.name,
      'Listing Date': listingDate,
      'Sector': ipo.sector || '-',
      'Retail Quota (%)': issueDetails?.retail_quota_percent ?? '-',
      'Issue Price Upper': issuePrice.toFixed(2),
      'Listing Price (Rs)': listingPrice.toFixed(2),
      'Closing Price NSE': '-', // To be filled manually after market close
      'Listing Gain (%)': listingGain.toFixed(2),
      'Listing gains on closing Basis (%)': '-', // To be filled later
      'Day Change After Listing (%)': '-', // To be filled later
      'QIB Day3 Subscription': finalSub?.qib ?? '-',
      'HNI/NII Day3 Subscription': finalSub?.nii ?? '-',
      'Retail Day3 Subscription': finalSub?.retail ?? '-',
      'Day1 Subscription': '-', // From subscription history
      'Day2 Subscription': '-', // From subscription history
      'Day3 Subscription': finalSub?.total ?? '-',
      'GMP percentage D1': gmpHistory?.[gmpHistory.length - 1]?.gmp_percent ?? '-',
      'GMP percentage D2': gmpHistory?.[gmpHistory.length - 2]?.gmp_percent ?? '-',
      'GMP percentage D3': gmpHistory?.[gmpHistory.length - 3]?.gmp_percent ?? '-',
      'GMP percentage D4': gmpHistory?.[gmpHistory.length - 4]?.gmp_percent ?? '-',
      'GMP percentage D5': gmpHistory?.[gmpHistory.length - 5]?.gmp_percent ?? '-',
      'Peer PE': financials?.roce ?? '-',
      'Debt/Equity': financials?.debt_equity ?? '-',
      'IPO PE': ipo.pe_ratio ?? '-',
      'Latest EBIDTA': financials?.ebitda_fy25 ?? '-',
      'PE vs Sector Ratio': '-', // To be calculated
      'Nifty 3D Return (%)': '-', // Market data
      'Nifty 1W Return (%)': '-', // Market data
      'Nifty 1M Return (%)': '-', // Market data
      'Nifty During IPO Window (%)': '-', // Market data
      'Market Sentiment Score': ipo.sentiment_score ?? '-',
      'Issue Size (Rs Cr)': ipo.issue_size_cr?.toFixed(2) ?? '-',
      'Fresh Issue': ipo.fresh_issue ?? '-',
      'OFS': ipo.ofs ?? '-',
      'GMP Day-1': gmpHistory?.[gmpHistory.length - 1]?.gmp ?? '-',
      'GMP Day-2': gmpHistory?.[gmpHistory.length - 2]?.gmp ?? '-',
      'GMP Day-3': gmpHistory?.[gmpHistory.length - 3]?.gmp ?? '-',
      'GMP Day-4': gmpHistory?.[gmpHistory.length - 4]?.gmp ?? '-',
      'GMP Day-5': gmpHistory?.[gmpHistory.length - 5]?.gmp ?? '-',
      'GMP Prediction': gmpPredictionStr,
      'IPOGyani AI Prediction': ipo.ai_prediction?.toFixed(2) ?? '-',
      'Prediction Accuracy (%)': predictionAccuracy ? predictionAccuracy.toFixed(2) : '-',
    }

    // Read existing CSV or create new
    let csvContent = ''
    if (fs.existsSync(csvPath)) {
      csvContent = fs.readFileSync(csvPath, 'utf-8')
    } else {
      // Read template
      const templatePath = path.join(process.cwd(), 'data', 'listed-ipos', '_template.csv')
      const template = fs.readFileSync(templatePath, 'utf-8')
      csvContent = template + '\n'
    }

    // Build CSV row
    const headers = csvContent.split('\n')[0].split(',')
    const rowValues = headers.map(h => {
      const val = csvRow[h as keyof typeof csvRow] ?? ''
      // Escape quotes in CSV
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    })

    // Append row to CSV
    csvContent = csvContent.trim() + '\n' + rowValues.join(',') + '\n'

    // Write CSV
    fs.writeFileSync(csvPath, csvContent)
    console.log(`[v0] Successfully migrated ${ipo.name} to listed IPO CSV`)
    console.log(`[v0] CSV written to: ${csvPath}`)
    console.log('[v0] Listing data:', {
      name: ipo.name,
      listingDate,
      listingPrice: `Rs ${listingPrice}`,
      gain: `${listingGain.toFixed(2)}%`,
      totalSubscription: totalSub ? totalSub.toFixed(2) + 'x' : 'N/A',
    })
  } catch (error) {
    console.error('[v0] ERROR during migration:', error)
    process.exit(1)
  }
}

// Get arguments from command line
const args = process.argv.slice(2)
if (args.length < 3) {
  console.error('[v0] Usage: npx ts-node scripts/migrate-ipo-to-listed.ts <ipo-id> <listing-date> <listing-price>')
  console.error('[v0] Example: npx ts-node scripts/migrate-ipo-to-listed.ts 5 2026-04-24 108')
  process.exit(1)
}

const ipoId = parseInt(args[0], 10)
const listingDate = args[1]
const listingPrice = parseFloat(args[2])

if (!ipoId || !listingDate || !listingPrice) {
  console.error('[v0] Invalid arguments')
  process.exit(1)
}

migrateIpoToListed(ipoId, listingDate, listingPrice)
