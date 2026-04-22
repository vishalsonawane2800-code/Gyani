import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseExpertReviews } from '@/lib/bulk-data-parsers'

// POST /api/admin/reviews/bulk
//
// Body: {
//   text: string,
//   mode?: 'append' | 'replace-per-ipo',
// }
//
// Modes:
//   - 'append'          (default) Insert all reviews as new rows. Existing
//                       reviews for the same IPO are left untouched.
//   - 'replace-per-ipo' For each IPO referenced in the pasted batch,
//                       delete all its existing expert_reviews rows first,
//                       then insert the new set. Other IPOs are untouched.
//                       Useful for "refresh this IPO's review panel".
//
// The pasted text identifies IPOs by IPO_SLUG or IPO_NAME. Both are
// resolved server-side against the `ipos` table (by `slug` first, falling
// back to `company_name` ILIKE).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''
    const mode: 'append' | 'replace-per-ipo' =
      body?.mode === 'replace-per-ipo' ? 'replace-per-ipo' : 'append'

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const parsed = parseExpertReviews(text)
    if (!parsed.success || parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse bulk reviews', details: parsed.errors },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Resolve every unique IPO reference in the batch up front — one query
    // per distinct slug / name rather than per review.
    const uniqueSlugs = Array.from(
      new Set(parsed.data.map(r => r.ipo_slug).filter((s): s is string => !!s)),
    )
    const uniqueNames = Array.from(
      new Set(
        parsed.data
          .filter(r => !r.ipo_slug && r.ipo_name)
          .map(r => r.ipo_name as string),
      ),
    )

    const slugToId = new Map<string, number>()
    const nameToId = new Map<string, number>()

    if (uniqueSlugs.length > 0) {
      const { data, error } = await supabase
        .from('ipos')
        .select('id, slug')
        .in('slug', uniqueSlugs)
      if (error) {
        return NextResponse.json(
          { error: 'Failed to look up IPOs by slug', details: error.message },
          { status: 500 },
        )
      }
      for (const row of data || []) {
        if (row.slug) slugToId.set(row.slug, row.id as number)
      }
    }

    if (uniqueNames.length > 0) {
      // Exact-ish match on company_name. Case-insensitive but not fuzzy —
      // we do not want to silently associate a review with the wrong IPO.
      const { data, error } = await supabase
        .from('ipos')
        .select('id, company_name')
        .in('company_name', uniqueNames)
      if (error) {
        return NextResponse.json(
          { error: 'Failed to look up IPOs by name', details: error.message },
          { status: 500 },
        )
      }
      for (const row of data || []) {
        if (row.company_name) {
          nameToId.set((row.company_name as string).toLowerCase(), row.id as number)
        }
      }
    }

    const rowsToInsert: Array<{
      ipo_id: number
      source: string
      source_type: string
      author: string
      summary: string
      sentiment: string
      url: string | null
      logo_url: string | null
      review_date: string | null
    }> = []
    const unresolved: string[] = []
    const affectedIpoIds = new Set<number>()

    for (const review of parsed.data) {
      let ipo_id: number | undefined
      if (review.ipo_slug) {
        ipo_id = slugToId.get(review.ipo_slug)
      }
      if (ipo_id == null && review.ipo_name) {
        ipo_id = nameToId.get(review.ipo_name.toLowerCase())
      }

      if (ipo_id == null) {
        unresolved.push(review.ipo_slug || review.ipo_name || '(unknown)')
        continue
      }

      affectedIpoIds.add(ipo_id)
      rowsToInsert.push({
        ipo_id,
        source: review.source,
        source_type: review.source_type,
        author: review.author,
        summary: review.summary,
        sentiment: review.sentiment,
        url: review.url,
        logo_url: review.logo_url,
        review_date: review.review_date,
      })
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json(
        {
          error: 'No reviews could be matched to an IPO',
          details: unresolved.length
            ? `Unknown IPO references: ${Array.from(new Set(unresolved)).join(', ')}`
            : parsed.errors.join('; '),
        },
        { status: 400 },
      )
    }

    let deleted = 0
    if (mode === 'replace-per-ipo' && affectedIpoIds.size > 0) {
      const { count, error: delError } = await supabase
        .from('expert_reviews')
        .delete({ count: 'exact' })
        .in('ipo_id', Array.from(affectedIpoIds))
      if (delError) {
        console.error('[reviews/bulk] delete error:', delError)
        return NextResponse.json(
          { error: 'Failed to clear existing reviews', details: delError.message },
          { status: 500 },
        )
      }
      deleted = count ?? 0
    }

    const { data: inserted, error: insertError } = await supabase
      .from('expert_reviews')
      .insert(rowsToInsert)
      .select('id')

    if (insertError) {
      console.error('[reviews/bulk] insert error:', insertError)
      return NextResponse.json(
        { error: 'Failed to insert reviews', details: insertError.message },
        { status: 500 },
      )
    }

    const insertedCount = inserted?.length ?? rowsToInsert.length
    const unresolvedUnique = Array.from(new Set(unresolved))

    const message =
      mode === 'replace-per-ipo'
        ? `Replaced reviews for ${affectedIpoIds.size} IPO(s): deleted ${deleted}, inserted ${insertedCount}.`
        : `Inserted ${insertedCount} review(s) across ${affectedIpoIds.size} IPO(s).`

    return NextResponse.json({
      message,
      mode,
      inserted: insertedCount,
      deleted,
      affected_ipos: affectedIpoIds.size,
      unresolved: unresolvedUnique,
      warnings: parsed.errors,
    })
  } catch (err) {
    console.error('[reviews/bulk] server error:', err)
    const detail = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json(
      { error: 'Server error', details: detail },
      { status: 500 },
    )
  }
}
