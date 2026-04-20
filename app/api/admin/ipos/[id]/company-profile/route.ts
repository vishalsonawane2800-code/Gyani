import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseCompanyProfile } from '@/lib/bulk-data-parsers'

// GET: return current long-form copy for this IPO
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ipos')
    .select('about_company, company_details, ipo_details_long')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ profile: data })
}

// POST: bulk-import long-form company + IPO copy from pasted text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text } = await request.json()

    const parseResult = parseCompanyProfile(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse company profile',
          details: parseResult.errors,
        },
        { status: 400 }
      )
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

    const profile = parseResult.data[0]

    // Build update payload — only overwrite fields the admin actually provided
    const update: Record<string, string | null> = {}
    if (profile.about_company !== null) update.about_company = profile.about_company
    if (profile.company_details !== null) update.company_details = profile.company_details
    if (profile.ipo_details_long !== null) update.ipo_details_long = profile.ipo_details_long

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { error: updateError } = await supabase
      .from('ipos')
      .update(update)
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        {
          error: 'Failed to save company profile',
          details: updateError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${Object.keys(update).length} field(s)`,
      updated: Object.keys(update),
    })
  } catch (error) {
    console.error('Company profile bulk import error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
