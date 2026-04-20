import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseFAQs } from '@/lib/bulk-data-parsers'

// GET: list FAQs for an IPO
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('ipo_faqs')
    .select('*')
    .eq('ipo_id', id)
    .order('display_order', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ faqs: data ?? [] })
}

// POST: bulk-import FAQs from pasted text
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createAdminClient()

  try {
    const { text, clearExisting } = await request.json()

    const parseResult = parseFAQs(text)

    if (!parseResult.success || parseResult.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse FAQs',
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

    // Default behaviour: full replace (FAQs are typically edited as a block)
    const shouldClear = clearExisting !== false
    if (shouldClear) {
      await supabase.from('ipo_faqs').delete().eq('ipo_id', id)
    }

    const rows = parseResult.data.map((faq, index) => ({
      ipo_id: parseInt(id, 10),
      question: faq.question,
      answer: faq.answer,
      display_order: index,
    }))

    const { error: insertError } = await supabase.from('ipo_faqs').insert(rows)

    if (insertError) {
      return NextResponse.json(
        {
          error: 'Failed to save FAQs',
          details: insertError.message,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${rows.length} FAQs`,
      count: rows.length,
    })
  } catch (error) {
    console.error('FAQ bulk import error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
