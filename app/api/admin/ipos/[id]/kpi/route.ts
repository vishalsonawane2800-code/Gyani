import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseKPI } from '@/lib/bulk-data-parsers'

// GET: Fetch KPI data for an IPO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ipo_kpi')
    .select('*')
    .eq('ipo_id', id)
    .order('date_label', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ kpi: data })
}

// POST: Save KPI data for an IPO
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text, clearExisting } = await request.json()
    
    // Parse the bulk text
    const parseResult = parseKPI(text)
    
    if (!parseResult.success) {
      return NextResponse.json({ 
        error: 'Failed to parse KPI data',
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

    // Clear existing KPI data if requested
    if (clearExisting) {
      await supabase
        .from('ipo_kpi')
        .delete()
        .eq('ipo_id', id)
    }

    // Build KPI records with ipo_id. `text_override` preserves admin-
    // typed "NA" / "-" for numeric KPIs (e.g. PE, ROE) — see migration
    // 032. The IPO detail page prefers this string over the numeric
    // `value` column so the UI shows the exact literal the admin typed.
    const kpiRecords = parseResult.data.map(entry => ({
      ipo_id: id,
      kpi_type: entry.kpi_type,
      metric: entry.metric,
      date_label: entry.date_label,
      value: entry.value,
      text_value: entry.text_value,
      text_override: entry.text_override,
    }))

    // Insert all KPI records
    if (kpiRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('ipo_kpi')
        .insert(kpiRecords)

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to insert KPI data',
          details: insertError.message 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Successfully saved ${kpiRecords.length} KPI records`,
      count: kpiRecords.length,
      data: parseResult.data
    })

  } catch (error) {
    console.error('KPI save error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: Remove all KPI data for an IPO
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('ipo_kpi')
    .delete()
    .eq('ipo_id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
