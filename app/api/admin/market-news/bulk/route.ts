import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMarketNews } from '@/lib/bulk-data-parsers'

// POST /api/admin/market-news/bulk
//
// Body: {
//   text: string,
//   mode?: 'skip' | 'overwrite' | 'replace',
//   // Back-compat with the old client:
//   skipDuplicates?: boolean,
// }
//
// Modes:
//   - 'skip'      (default) Insert new items, silently ignore rows whose URL
//                 already exists. Uses upsert(ignoreDuplicates) so there is
//                 no separate pre-select that can fail.
//   - 'overwrite' Upsert on conflict(url): existing rows are updated in place
//                 with the pasted fields.
//   - 'replace'   Delete ALL existing market_news rows, then insert the new
//                 set. Destructive — the client should gate this behind a
//                 confirmation dialog.
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''

    // Back-compat: old client sent { skipDuplicates: boolean }.
    const mode: 'skip' | 'overwrite' | 'replace' =
      body?.mode === 'overwrite' || body?.mode === 'replace' || body?.mode === 'skip'
        ? body.mode
        : body?.skipDuplicates === false
          ? 'overwrite'
          : 'skip'

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const parsed = parseMarketNews(text)
    if (!parsed.success || parsed.data.length === 0) {
      return NextResponse.json(
        { error: 'Failed to parse bulk news', details: parsed.errors },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    // Drop exact URL duplicates *within the pasted batch* so the upsert never
    // has to resolve two identical conflict targets in one statement (Postgres
    // rejects that with "ON CONFLICT DO UPDATE command cannot affect row a
    // second time", which used to surface as a cryptic 500).
    const seen = new Set<string>()
    const now = new Date().toISOString()
    const rows = parsed.data
      .filter(item => {
        if (seen.has(item.url)) return false
        seen.add(item.url)
        return true
      })
      .map(item => ({
        title: item.title,
        url: item.url,
        source: item.source,
        tag: item.tag || 'IPO',
        impact: item.impact,
        sentiment: item.sentiment,
        image_url: item.image_url,
        summary: item.summary,
        published_at: item.published_at ?? now,
        is_published: true,
        display_order: item.display_order || 0,
      }))

    let inserted = 0
    let deleted = 0

    if (mode === 'replace') {
      // Wipe the table first. We use a where-clause that matches every row
      // (created_at is NOT NULL for all rows) because PostgREST refuses an
      // unqualified delete().
      const { count, error: delError } = await supabase
        .from('market_news')
        .delete({ count: 'exact' })
        .not('created_at', 'is', null)

      if (delError) {
        console.error('[market-news/bulk] delete error:', delError)
        return NextResponse.json(
          { error: 'Failed to clear existing news', details: delError.message },
          { status: 500 },
        )
      }
      deleted = count ?? 0

      const { data, error } = await supabase
        .from('market_news')
        .insert(rows)
        .select('id')

      if (error) {
        console.error('[market-news/bulk] replace insert error:', error)
        return NextResponse.json(
          { error: 'Failed to insert news', details: error.message },
          { status: 500 },
        )
      }
      inserted = data?.length ?? rows.length
    } else {
      // skip + overwrite both use upsert — the only difference is whether
      // duplicate URLs should win. ignoreDuplicates=true means "keep the
      // existing row", false means "replace it with the pasted fields".
      const { data, error } = await supabase
        .from('market_news')
        .upsert(rows, {
          onConflict: 'url',
          ignoreDuplicates: mode === 'skip',
        })
        .select('id')

      if (error) {
        console.error('[market-news/bulk] upsert error:', error)
        return NextResponse.json(
          { error: 'Failed to import news', details: error.message },
          { status: 500 },
        )
      }

      // With ignoreDuplicates=true, only newly-inserted rows come back in
      // `data`; skipped ones are absent. We derive skipped from the diff.
      inserted = data?.length ?? 0
    }

    const skipped = mode === 'skip' ? rows.length - inserted : 0
    const message =
      mode === 'replace'
        ? `Replaced ${deleted} existing item(s) with ${inserted} new one(s).`
        : mode === 'overwrite'
          ? `Imported ${inserted} item(s). Existing URLs were overwritten.`
          : `Imported ${inserted} new item(s), skipped ${skipped} duplicate(s).`

    return NextResponse.json({
      message,
      mode,
      inserted,
      skipped,
      deleted,
      total: rows.length,
      warnings: parsed.errors,
    })
  } catch (err) {
    console.error('[market-news/bulk] server error:', err)
    const detail = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ error: 'Server error', details: detail }, { status: 500 })
  }
}
