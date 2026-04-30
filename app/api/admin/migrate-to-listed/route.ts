import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { appendToListedCsv } from '@/lib/csv-append'
import type { ListedIPORow } from '@/lib/csv-append'

/**
 * POST /api/admin/migrate-to-listed
 * Migrates an IPO from current to listed and populates CSV with historical data
 * Routes to correct CSV file based on exchange (SME or Mainboard)
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

    // Determine if SME or Mainboard
    const isSME = ipo.exchange?.includes('SME') ?? false
    const year = new Date(listingDate).getFullYear()

    // Build the ListedIPORow for CSV append
    const csvRow: ListedIPORow = {
      ipoName: ipo.name,
      listingDate: listingDate,
      sector: ipo.sector || null,
      retailQuotaPct: issueDetails?.retail_quota_percent ?? null,
      issuePriceUpper: issuePrice,
      listingPrice: listingPrice,
      closingPrice: null,
      listingGainPct: listingGain,
      listingGainClosingPct: null,
      dayChangeAfterListingPct: null,
      qibDay3Sub: finalSub?.qib ?? null,
      niiDay3Sub: finalSub?.nii ?? null,
      retailDay3Sub: finalSub?.retail ?? null,
      day1Sub: null,
      day2Sub: null,
      day3Sub: finalSub?.total ?? null,
      gmpPctD1: gmpHistory?.[gmpHistory.length - 1]?.gmp_percent ?? null,
      gmpPctD2: gmpHistory?.[gmpHistory.length - 2]?.gmp_percent ?? null,
      gmpPctD3: gmpHistory?.[gmpHistory.length - 3]?.gmp_percent ?? null,
      gmpPctD4: gmpHistory?.[gmpHistory.length - 4]?.gmp_percent ?? null,
      gmpPctD5: gmpHistory?.[gmpHistory.length - 5]?.gmp_percent ?? null,
      peerPE: financials?.roce ?? null,
      debtEquity: financials?.debt_equity ?? null,
      ipoPE: ipo.pe_ratio ?? null,
      latestEbitda: financials?.ebitda_fy25 ?? null,
      peVsSectorRatio: null,
      nifty3DReturn: null,
      nifty1WReturn: null,
      nifty1MReturn: null,
      niftyDuringIpoWindow: null,
      marketSentimentScore: ipo.sentiment_score ?? null,
      issueSize: ipo.issue_size_cr ?? null,
      freshIssue: ipo.fresh_issue ?? null,
      ofs: ipo.ofs ?? null,
      gmpDay1: gmpHistory?.[gmpHistory.length - 1]?.gmp ?? null,
      gmpDay2: gmpHistory?.[gmpHistory.length - 2]?.gmp ?? null,
      gmpDay3: gmpHistory?.[gmpHistory.length - 3]?.gmp ?? null,
      gmpDay4: gmpHistory?.[gmpHistory.length - 4]?.gmp ?? null,
      gmpDay5: gmpHistory?.[gmpHistory.length - 5]?.gmp ?? null,
      gmpPrediction: gmpPredictionStr,
      aiPrediction: ipo.ai_prediction ?? null,
      predictionAccuracy: predictionAccuracy,
      slug: ipo.slug,
    }

    // Append to CSV file (routes based on SME or Mainboard)
    const csvAppendResult = await appendToListedCsv(year, isSME, csvRow)

    if (!csvAppendResult.success) {
      return NextResponse.json(
        { error: 'CSV append failed', details: csvAppendResult.message },
        { status: 500 }
      )
    }

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
        csvPath: csvAppendResult.filePath,
        exchange: ipo.exchange,
        isSME,
        message: csvAppendResult.message,
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
