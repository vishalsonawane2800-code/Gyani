import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseFinancials } from '@/lib/bulk-data-parsers'

// GET: Fetch financials for an IPO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ipo_financials')
    .select('*')
    .eq('ipo_id', id)
    .order('fiscal_year', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ financials: data })
}

// POST: Bulk insert/update financials from parsed text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text, clearExisting } = await request.json()
    
    // Parse the bulk text
    const parseResult = parseFinancials(text)
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Failed to parse financial data',
        details: parseResult.errors 
      }, { status: 400 })
    }

    // Verify IPO exists
    const { data: ipo, error: ipoError } = await supabase
      .from('ipos')
      .select('id')
      .eq('id', id)
      .single()

    if (ipoError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    // Clear existing financials if requested
    if (clearExisting) {
      await supabase
        .from('ipo_financials')
        .delete()
        .eq('ipo_id', id)
    }

    // Insert new financials
    const financialsToInsert = parseResult.data.map(f => ({
      ipo_id: id,
      fiscal_year: f.fiscal_year,
      revenue: f.revenue,
      pat: f.pat,
      ebitda: f.ebitda,
      net_worth: f.net_worth,
      assets: f.assets,
      liabilities: f.liabilities,
      roe: f.roe,
      roce: f.roce,
      debt_equity: f.debt_equity,
      eps: f.eps,
      book_value: f.book_value,
    }))

    // Upsert based on ipo_id + fiscal_year
    for (const financial of financialsToInsert) {
      const { error: upsertError } = await supabase
        .from('ipo_financials')
        .upsert(financial, {
          onConflict: 'ipo_id,fiscal_year',
          ignoreDuplicates: false,
        })
      
      if (upsertError) {
        // If upsert fails (no unique constraint), try delete + insert
        await supabase
          .from('ipo_financials')
          .delete()
          .eq('ipo_id', id)
          .eq('fiscal_year', financial.fiscal_year)
        
        await supabase
          .from('ipo_financials')
          .insert(financial)
      }
    }

    // Also update the IPO table with latest ratios (from most recent FY)
    const latestFY = parseResult.data[parseResult.data.length - 1]
    if (latestFY) {
      await supabase
        .from('ipos')
        .update({
          roe: latestFY.roe,
          roce: latestFY.roce,
          debt_equity: latestFY.debt_equity,
          eps: latestFY.eps,
          book_value: latestFY.book_value,
        })
        .eq('id', id)
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully imported ${parseResult.data.length} financial records`,
      count: parseResult.data.length,
      data: parseResult.data
    })

  } catch (error) {
    console.error('Financials bulk import error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
