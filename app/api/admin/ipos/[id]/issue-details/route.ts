import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseIssueDetails } from '@/lib/bulk-data-parsers'

// GET: Fetch issue details for an IPO
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ipo_issue_details')
    .select('*')
    .eq('ipo_id', id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ issueDetails: data })
}

// POST: Insert/update issue details from parsed text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text, clearExisting } = await request.json()
    
    // Parse the bulk text
    const parseResult = parseIssueDetails(text)
    
    if (!parseResult.success || parseResult.data.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to parse issue details data',
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

    const issueDetails = parseResult.data[0]

    // Clear existing issue details if requested (or always since it's a single record)
    if (clearExisting) {
      await supabase
        .from('ipo_issue_details')
        .delete()
        .eq('ipo_id', id)
    }

    // Upsert the issue details (single record per IPO)
    const { error: upsertError } = await supabase
      .from('ipo_issue_details')
      .upsert({
        ipo_id: parseInt(id),
        total_issue_size_cr: issueDetails.total_issue_size_cr,
        fresh_issue_cr: issueDetails.fresh_issue_cr,
        fresh_issue_percent: issueDetails.fresh_issue_percent,
        ofs_cr: issueDetails.ofs_cr,
        ofs_percent: issueDetails.ofs_percent,
        retail_quota_percent: issueDetails.retail_quota_percent,
        nii_quota_percent: issueDetails.nii_quota_percent,
        qib_quota_percent: issueDetails.qib_quota_percent,
        employee_quota_percent: issueDetails.employee_quota_percent,
        shareholder_quota_percent: issueDetails.shareholder_quota_percent,
        ipo_objectives: issueDetails.ipo_objectives,
      }, {
        onConflict: 'ipo_id',
      })

    if (upsertError) {
      // If upsert fails due to no unique constraint, try delete + insert
      await supabase
        .from('ipo_issue_details')
        .delete()
        .eq('ipo_id', id)
      
      const { error: insertError } = await supabase
        .from('ipo_issue_details')
        .insert({
          ipo_id: parseInt(id),
          total_issue_size_cr: issueDetails.total_issue_size_cr,
          fresh_issue_cr: issueDetails.fresh_issue_cr,
          fresh_issue_percent: issueDetails.fresh_issue_percent,
          ofs_cr: issueDetails.ofs_cr,
          ofs_percent: issueDetails.ofs_percent,
          retail_quota_percent: issueDetails.retail_quota_percent,
          nii_quota_percent: issueDetails.nii_quota_percent,
          qib_quota_percent: issueDetails.qib_quota_percent,
          employee_quota_percent: issueDetails.employee_quota_percent,
          shareholder_quota_percent: issueDetails.shareholder_quota_percent,
          ipo_objectives: issueDetails.ipo_objectives,
        })

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to save issue details',
          details: insertError.message
        }, { status: 500 })
      }
    }

    // Also update the main IPO table with fresh issue and OFS values (as text)
    const freshIssueText = issueDetails.fresh_issue_cr 
      ? `${issueDetails.fresh_issue_cr} Cr (${issueDetails.fresh_issue_percent?.toFixed(0) || 0}%)`
      : null
    const ofsText = issueDetails.ofs_cr && issueDetails.ofs_cr > 0
      ? `${issueDetails.ofs_cr} Cr (${issueDetails.ofs_percent?.toFixed(0) || 0}%)`
      : 'Nil'
    const issueSizeText = issueDetails.total_issue_size_cr 
      ? `${issueDetails.total_issue_size_cr} Cr`
      : null

    await supabase
      .from('ipos')
      .update({
        issue_size: issueSizeText,
        fresh_issue: freshIssueText,
        ofs: ofsText,
      })
      .eq('id', id)

    return NextResponse.json({ 
      success: true,
      message: 'Successfully imported issue details',
      data: issueDetails
    })

  } catch (error) {
    console.error('Issue details bulk import error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
