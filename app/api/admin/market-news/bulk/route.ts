import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseMarketNews } from '@/lib/bulk-data-parsers'

// POST /api/admin/market-news/bulk
//
// Body: { text: string, skipDuplicates?: boolean }
//
// Parses pasted bulk-format text and inserts/updates market_news rows.
// The `url` column has a UNIQUE index, so we upsert on conflict(url):
//   - skipDuplicates: true  -> existing rows by URL are left untouched.
//   - skipDuplicates: false -> existing rows by URL are overwritten
//     (title/source/tag/impact/published_at/... replaced).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const text = typeof body?.text === 'string' ? body.text : ''
    const skipDuplicates = body?.skipDuplicates !== false // default true

    if (!text.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    const parsed = parseMarketNews(text)
    if (!parsed.success || parsed.data.length === 0) {
      return NextResponse.json(
        {
          error: 'Failed to parse bulk news',
          details: parsed.errors,
        },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Rows for insert/upsert — default published flag is true, published_at
    // defaults to now() when the admin did not supply a DATE.
    const now = new Date().toISOString()
    const rows = parsed.data.map(item => ({
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
    let skipped = 0
    let updated = 0

    if (skipDuplicates) {
      // Fetch existing URLs so we can report how many were skipped.
      const urls = rows.map(r => r.url)
      const { data: existingRows, error: selectError } = await supabase
        .from('market_news')
        .select('url')
        .in('url', urls)

      if (selectError) {
        console.error('[market-news/bulk] lookup error:', selectError)
        return NextResponse.json({ error: 'Failed to look up existing news' }, { status: 500 })
      }

      const existing = new Set((existingRows ?? []).map(r => r.url))
      const toInsert = rows.filter(r => !existing.has(r.url))
      skipped = rows.length - toInsert.length

      if (toInsert.length > 0) {
        const { data, error } = await supabase
          .from('market_news')
          .insert(toInsert)
          .select('id')

        if (error) {
          console.error('[market-news/bulk] insert error:', error)
          return NextResponse.json({ error: 'Failed to insert news' }, { status: 500 })
        }
        inserted = data?.length ?? toInsert.length
      }
    } else {
      // Overwrite existing rows on url conflict.
      const { data, error } = await supabase
        .from('market_news')
        .upsert(rows, { onConflict: 'url' })
        .select('id')

      if (error) {
        console.error('[market-news/bulk] upsert error:', error)
        return NextResponse.json({ error: 'Failed to import news' }, { status: 500 })
      }

      // We don't get an insert-vs-update breakdown from upsert, so just
      // report total rows written.
      inserted = data?.length ?? rows.length
      updated = 0
    }

    const message = skipDuplicates
      ? `Imported ${inserted} new item(s), skipped ${skipped} duplicate(s).`
      : `Imported ${inserted} item(s) (existing URLs were overwritten).`

    return NextResponse.json({
      message,
      inserted,
      skipped,
      updated,
      total: rows.length,
      warnings: parsed.errors,
    })
  } catch (err) {
    console.error('[market-news/bulk] server error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
