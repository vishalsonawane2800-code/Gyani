import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

/**
 * POST /api/admin/migrate-to-listed
 * Migrates an IPO from current to listed and populates CSV with historical data
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin auth (check for Authorization header with admin JWT)
    const authHeader = request.headers.get('Authorization')
    const expectedToken = process.env.ADMIN_JWT_TOKEN
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.slice(7) !== expectedToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ipoId, listingDate, listingPrice } = await request.json()

    if (!ipoId || !listingDate || typeof listingPrice !== 'number') {
      return NextResponse.json(
        { error: 'Missing required fields: ipoId, listingDate, listingPrice' },
        { status: 400 }
      )
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch IPO data
    const { data: ipo, error: ipoError } = await supabase
      .from('ipos')
      .select('*')
      .eq('id', ipoId)
      .single()

    if (ipoError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    // Fetch related data
    const [{ data: financials }, { data: issueDetails }, { data: gmpHistory }, { data: subscriptionHistory }] =
      await Promise.all([
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

    // Calculate listing gain
    const issuePrice = ipo.price_max
    const listingGain = ((listingPrice - issuePrice) / issuePrice) * 100

    // Get final subscription data
    const finalSub = subscriptionHistory && subscriptionHistory.length > 0 ? subscriptionHistory[0] : null
    const totalSub = finalSub ? finalSub.total : ipo.subscription_total || null

    // Get GMP prediction
    let gmpPredictionStr = '-'
    if (gmpHistory && gmpHistory.length > 0) {
      const maxGmp = Math.max(...gmpHistory.map(g => g.gmp_percent))
      const minGmp = Math.min(...gmpHistory.map(g => g.gmp_percent))
      gmpPredictionStr = `${minGmp.toFixed(0)}-${maxGmp.toFixed(0)}%`
    }

    // Calculate prediction accuracy
    let predictionAccuracy = null
    if (ipo.ai_prediction && ipo.ai_prediction > 0) {
      predictionAccuracy = ((listingGain - ipo.ai_prediction) / Math.abs(ipo.ai_prediction)) * 100
    }

    // Prepare CSV row
    const year = new Date(listingDate).getFullYear()
    
    // Determine CSV file name based on exchange type
    // SME exchanges: 'BSE SME', 'NSE SME'
    // Mainboard: 'Mainboard', 'REIT'
    const isSME = ipo.exchange?.includes('SME') ?? false
    const csvFileName = isSME ? 'SME.csv' : 'Mainboard.csv'
    
    const csvPath = path.join(process.cwd(), 'public', 'data', 'listed-ipos', String(year), csvFileName)
    const csvDir = path.dirname(csvPath)

    // Create directory if needed
    if (!fs.existsSync(csvDir)) {
      fs.mkdirSync(csvDir, { recursive: true })
    }

    // Read existing CSV or template
    let csvContent = ''
    const csvPublicPath = `/data/listed-ipos/${year}/${csvFileName}`
    
    if (fs.existsSync(csvPath)) {
      csvContent = fs.readFileSync(csvPath, 'utf-8')
    } else {
      const templatePath = path.join(process.cwd(), 'public', 'data', 'listed-ipos', '_template.csv')
      if (fs.existsSync(templatePath)) {
        csvContent = fs.readFileSync(templatePath, 'utf-8') + '\n'
      } else {
        return NextResponse.json({ error: 'CSV template not found' }, { status: 500 })
      }
    }

    const csvRow = {
      'IPO Name': ipo.name,
      'Listing Date': listingDate,
      'Sector': ipo.sector || '-',
      'Retail Quota (%)': issueDetails?.retail_quota_percent ?? '-',
      'Issue Price Upper': issuePrice.toFixed(2),
      'Listing Price (Rs)': listingPrice.toFixed(2),
      'Closing Price NSE': '-',
      'Listing Gain (%)': listingGain.toFixed(2),
      'Listing gains on closing Basis (%)': '-',
      'Day Change After Listing (%)': '-',
      'QIB Day3 Subscription': finalSub?.qib ?? '-',
      'HNI/NII Day3 Subscription': finalSub?.nii ?? '-',
      'Retail Day3 Subscription': finalSub?.retail ?? '-',
      'Day1 Subscription': '-',
      'Day2 Subscription': '-',
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
      'PE vs Sector Ratio': '-',
      'Nifty 3D Return (%)': '-',
      'Nifty 1W Return (%)': '-',
      'Nifty 1M Return (%)': '-',
      'Nifty During IPO Window (%)': '-',
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

    // Build row
    const headers = csvContent.split('\n')[0].split(',')
    const rowValues = headers.map(h => {
      const val = csvRow[h as keyof typeof csvRow] ?? ''
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    })

    // Append to CSV
    csvContent = csvContent.trim() + '\n' + rowValues.join(',') + '\n'
    fs.writeFileSync(csvPath, csvContent)

    // Update IPO status to 'listed' if it's not already
    if (ipo.status !== 'listed') {
      await supabase
        .from('ipos')
        .update({ status: 'listed' })
        .eq('id', ipoId)
    }

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${ipo.name} to listed IPOs`,
      data: {
        name: ipo.name,
        listingDate,
        listingPrice,
        listingGain: listingGain.toFixed(2),
        totalSubscription: totalSub ? totalSub.toFixed(2) : 'N/A',
        csvPath: csvPublicPath,
        exchange: ipo.exchange,
        isSME,
      },
    })
  } catch (error) {
    console.error('[v0] Migration error:', error)
    return NextResponse.json(
      { error: 'Migration failed', details: (error as Error).message },
      { status: 500 }
    )
  }
}
