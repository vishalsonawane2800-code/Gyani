import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Migrate an IPO row from `ipos` to `listed_ipos`.
 *
 * Called by:
 *   - POST /api/admin/ipos/[id]/migrate-listed (manual admin trigger)
 *   - runAutoStatusJob() in /api/admin/auto-status (scheduled, day-after-listing)
 *
 * Behaviour:
 *   - Requires ipos.listing_price to be set (that's our proxy for "the IPO
 *     actually listed"). If missing, returns ok:false with reason 'no_list_price'.
 *   - Maps the columns and upserts into listed_ipos by slug (so re-running is
 *     idempotent).
 *   - Marks the original ipos row status='listed' on success so the scheduler
 *     doesn't try to migrate it again.
 */

export type MigrateResult =
  | {
      ok: true
      alreadyListed: boolean
      data: unknown
    }
  | {
      ok: false
      reason: 'not_found' | 'no_list_price' | 'db_error'
      message: string
    }

function buildAbbr(name: string | null | undefined): string {
  if (!name) return 'IP'
  return (
    name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IP'
  )
}

export async function migrateIpoToListed(
  id: number | string
): Promise<MigrateResult> {
  const supabase = createAdminClient()

  const { data: ipo, error: fetchError } = await supabase
    .from('ipos')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (fetchError || !ipo) {
    return {
      ok: false,
      reason: 'not_found',
      message: fetchError?.message || 'IPO not found',
    }
  }

  // listing_price is the gate: if admin hasn't filled the listing day price,
  // we cannot migrate yet. Caller should keep the row in `listing` status.
  if (ipo.listing_price == null) {
    return {
      ok: false,
      reason: 'no_list_price',
      message:
        'Listing price not set yet. Fill Listing Day Data in the admin form before migrating.',
    }
  }

  const issuePrice = ipo.price_max
  const listPrice = ipo.listing_price
  const closePrice = ipo.list_day_close ?? null
  const gainPct =
    ipo.list_day_change_pct ??
    ipo.listing_gain_percent ??
    (issuePrice && issuePrice > 0
      ? Math.round(((listPrice - issuePrice) / issuePrice) * 10000) / 100
      : null)

  const listedIpoData = {
    original_ipo_id: typeof ipo.id === 'string' ? parseInt(ipo.id, 10) : ipo.id,
    company_name: ipo.company_name,
    name: ipo.company_name,
    slug: ipo.slug,
    abbr: buildAbbr(ipo.company_name),
    bg_color: ipo.bg_color ?? '#f0f9ff',
    fg_color: ipo.fg_color ?? '#0369a1',
    exchange: ipo.exchange ?? 'Mainboard',
    sector: ipo.sector ?? null,
    list_date: ipo.listing_date ?? null,
    issue_price: issuePrice,
    list_price: listPrice,
    listing_price: listPrice,
    current_price: closePrice,
    gain_pct: gainPct,
    listing_gain_percent: gainPct,
    sub_times: ipo.subscription_total ?? null,
    gmp_peak: ipo.gmp != null ? `Rs ${ipo.gmp}` : null,
    ai_pred: ipo.ai_prediction != null ? `${ipo.ai_prediction}%` : null,
    ai_err:
      gainPct != null && ipo.ai_prediction != null
        ? Math.round(Math.abs(ipo.ai_prediction - gainPct) * 100) / 100
        : null,
    year: ipo.listing_date
      ? new Date(ipo.listing_date).getFullYear().toString()
      : null,
    nse_symbol: ipo.nse_symbol ?? null,
    bse_scrip_code: ipo.bse_scrip_code ?? null,
    logo_url: ipo.logo_url ?? null,
  }

  // Upsert by slug so repeated runs don't create duplicates.
  const { data: listedIpo, error: upsertError } = await supabase
    .from('listed_ipos')
    .upsert(listedIpoData, { onConflict: 'slug' })
    .select()
    .single()

  if (upsertError) {
    console.error('[migrate-listed] upsert error:', upsertError)
    return {
      ok: false,
      reason: 'db_error',
      message: upsertError.message,
    }
  }

  // Flip the source ipos row so auto-status stops processing it. We keep
  // the row around (not deleted) to preserve GMP / subscription history
  // for per-slug detail pages.
  const alreadyListed = ipo.status === 'listed'
  if (!alreadyListed) {
    const { error: updateError } = await supabase
      .from('ipos')
      .update({ status: 'listed' })
      .eq('id', id)
    if (updateError) {
      console.error('[migrate-listed] status update error:', updateError)
      // Not fatal — the listed_ipos row exists; a later run will retry.
    }
  }

  // Revalidate archive pages so the newly migrated IPO appears immediately
  // without waiting for the ISR window or a redeploy.
  try {
    const year = listedIpoData.year
    revalidatePath('/listed')
    if (year) {
      revalidatePath(`/listed/${year}`)
      revalidatePath(`/listed/${year}/${listedIpoData.slug}`)
    }
  } catch (revalidateError) {
    // revalidatePath throws if called outside a server request (e.g. from a
    // cron). That's fine — ISR will still pick up the change within the
    // revalidate window. Don't fail the migration over it.
    console.warn('[migrate-listed] revalidate skipped:', revalidateError)
  }

  return {
    ok: true,
    alreadyListed,
    data: listedIpo,
  }
}

// POST /api/admin/ipos/[id]/migrate-listed
// Manual admin trigger. Body is optional; we ignore `list_price` in the body
// now because the source of truth is ipos.listing_price filled in the admin form.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const result = await migrateIpoToListed(id)

    if (!result.ok) {
      const status =
        result.reason === 'not_found'
          ? 404
          : result.reason === 'no_list_price'
            ? 400
            : 500
      return NextResponse.json(
        { error: result.message, reason: result.reason },
        { status }
      )
    }

    return NextResponse.json({
      message: result.alreadyListed
        ? 'IPO listed directory entry refreshed'
        : 'IPO successfully migrated to listed directory',
      data: result.data,
    })
  } catch (error) {
    console.error('Migrate error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
