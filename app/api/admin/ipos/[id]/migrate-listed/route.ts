import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Migrate an IPO from the 'ipos' table to the 'listed_ipos' table
 * This is called after an IPO has successfully listed on the exchange
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { list_price, gain_pct } = body

    if (!list_price) {
      return NextResponse.json({ error: 'Listing price is required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Fetch the IPO data
    const { data: ipo, error: fetchError } = await supabase
      .from('ipos')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    // Calculate gain percentage if not provided
    const issuePrice = ipo.price_max
    const calculatedGainPct = gain_pct ?? ((list_price - issuePrice) / issuePrice * 100).toFixed(2)

    // Prepare data for listed_ipos table
    const listedIpoData = {
      company_name: ipo.company_name,
      slug: ipo.slug,
      abbr: ipo.abbr,
      bg_color: ipo.bg_color,
      fg_color: ipo.fg_color,
      logo_url: ipo.logo_url,
      exchange: ipo.exchange,
      sector: ipo.sector,
      listing_date: ipo.listing_date,
      issue_price: issuePrice,
      listing_price: list_price,
      listing_gain_pct: parseFloat(calculatedGainPct),
      sub_times: ipo.subscription_total || null,
      gmp_peak: ipo.gmp ? `₹${ipo.gmp}` : null,
      ai_pred: ipo.ai_prediction ? `${ipo.ai_prediction}%` : null,
      ai_err: null,
      year: ipo.listing_date ? new Date(ipo.listing_date).getFullYear().toString() : null,
    }

    // Insert into listed_ipos
    const { data: listedIpo, error: insertError } = await supabase
      .from('listed_ipos')
      .insert([listedIpoData])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting to listed_ipos:', insertError)
      // Check for duplicate
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'IPO already exists in listed directory' }, { status: 400 })
      }
      return NextResponse.json({ error: 'Failed to migrate IPO' }, { status: 500 })
    }

    // Update original IPO status to 'listed' instead of deleting
    // This preserves GMP history and other related data
    const { error: updateError } = await supabase
      .from('ipos')
      .update({ status: 'listed' })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating IPO status:', updateError)
    }

    return NextResponse.json({
      message: 'IPO successfully migrated to listed directory',
      data: listedIpo,
    })
  } catch (error) {
    console.error('Migrate error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
