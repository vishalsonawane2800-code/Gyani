import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { migrateIpoToListed } from '@/app/api/admin/ipos/[id]/migrate-listed/route'

/**
 * Automated IPO Status Transition Logic (IST-aware).
 *
 * Status flow:
 *   upcoming -> open -> lastday -> closed -> allot -> listing -> listed
 *
 * Date gates (all using IST `YYYY-MM-DD`):
 *   - upcoming -> open:       today >= open_date
 *   - open -> lastday:        today === close_date (at any time during the day)
 *   - lastday -> closed:      today > close_date, OR today === close_date AND istHour >= 17
 *                             (5pm IST is when the exchange officially closes the bid window)
 *   - closed -> allot:        today >= allotment_date
 *   - allot -> listing:       today === listing_date
 *   - listing -> listed:      day AFTER listing_date AND listing_price is set.
 *                             If listing_price is missing, row stays `listing`
 *                             and is surfaced in the `pending` array for the admin.
 *
 * This module exports `runAutoStatusJob()` so the cron dispatcher can call it
 * directly without going through an HTTP round-trip. The GET handler is a
 * thin wrapper so admins can still curl the endpoint for a manual check.
 */

// 5pm IST — exchange bid cutoff.
const IST_CLOSE_HOUR = 17

type IstClock = {
  today: string // YYYY-MM-DD in IST
  hour: number // 0-23 in IST
}

function getIstClock(now: Date = new Date()): IstClock {
  // Intl is the only safe way to do this — never hand-roll TZ math.
  const dateParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const y = dateParts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = dateParts.find((p) => p.type === 'month')?.value ?? '01'
  const d = dateParts.find((p) => p.type === 'day')?.value ?? '01'

  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    hour12: false,
  }).format(now)
  // "en-GB" + hour12:false can return "24" at midnight; clamp to 0-23.
  const hourNum = parseInt(hourStr, 10) % 24

  return {
    today: `${y}-${m}-${d}`,
    hour: Number.isFinite(hourNum) ? hourNum : 0,
  }
}

type IpoRow = {
  id: number
  company_name: string
  slug: string
  status: string
  open_date: string | null
  close_date: string | null
  allotment_date: string | null
  listing_date: string | null
  listing_price: number | null
}

type Update = {
  id: number
  name: string
  slug: string
  oldStatus: string
  newStatus: string
}

type PendingMigration = {
  id: number
  name: string
  slug: string
  reason: string
}

type JobError = {
  id: number
  name: string
  error: string
}

export type AutoStatusJobResult = {
  ran_at: string
  ist_today: string
  ist_hour: number
  checked: number
  updated: Update[]
  migrated: Array<{ id: number; name: string; slug: string }>
  pending: PendingMigration[]
  errors: JobError[]
}

function computeTargetStatus(
  ipo: IpoRow,
  ist: IstClock
): 'upcoming' | 'open' | 'lastday' | 'closed' | 'allot' | 'listing' | 'post-listing' | null {
  const { today, hour } = ist
  const { open_date, close_date, allotment_date, listing_date } = ipo

  // If listing date has passed, caller must handle migration separately.
  if (listing_date && today > listing_date) return 'post-listing'
  if (listing_date && today === listing_date) return 'listing'

  if (allotment_date && today >= allotment_date) return 'allot'

  if (close_date) {
    if (today > close_date) return 'closed'
    if (today === close_date) {
      return hour >= IST_CLOSE_HOUR ? 'closed' : 'lastday'
    }
  }

  if (open_date && today >= open_date) return 'open'

  return 'upcoming'
}

export async function runAutoStatusJob(): Promise<AutoStatusJobResult> {
  const supabase = createAdminClient()
  const ran_at = new Date().toISOString()
  const ist = getIstClock()

  const updates: Update[] = []
  const migrated: AutoStatusJobResult['migrated'] = []
  const pending: PendingMigration[] = []
  const errors: JobError[] = []

  // Pull every row that hasn't already been finalized into `listed`.
  const { data: ipos, error } = await supabase
    .from('ipos')
    .select(
      'id, company_name, slug, status, open_date, close_date, allotment_date, listing_date, listing_price'
    )
    .neq('status', 'listed')
    .order('open_date', { ascending: true })

  if (error) {
    console.error('[auto-status] fetch error:', error)
    return {
      ran_at,
      ist_today: ist.today,
      ist_hour: ist.hour,
      checked: 0,
      updated: [],
      migrated: [],
      pending: [],
      errors: [{ id: -1, name: 'fetch', error: error.message }],
    }
  }

  const rows = (ipos ?? []) as IpoRow[]

  for (const ipo of rows) {
    const target = computeTargetStatus(ipo, ist)
    if (!target) continue

    if (target === 'post-listing') {
      // Day-after-listing branch: either migrate or park in pending.
      const result = await migrateIpoToListed(ipo.id)
      if (result.ok) {
        migrated.push({ id: ipo.id, name: ipo.company_name, slug: ipo.slug })
        // migrateIpoToListed already sets ipos.status='listed'.
        if (ipo.status !== 'listed') {
          updates.push({
            id: ipo.id,
            name: ipo.company_name,
            slug: ipo.slug,
            oldStatus: ipo.status,
            newStatus: 'listed',
          })
        }
      } else if (result.reason === 'no_list_price') {
        pending.push({
          id: ipo.id,
          name: ipo.company_name,
          slug: ipo.slug,
          reason: result.message,
        })
        // Make sure the row is at least in `listing` state so the UI shows it.
        if (ipo.status !== 'listing') {
          const { error: updErr } = await supabase
            .from('ipos')
            .update({ status: 'listing' })
            .eq('id', ipo.id)
          if (updErr) {
            errors.push({ id: ipo.id, name: ipo.company_name, error: updErr.message })
          } else {
            updates.push({
              id: ipo.id,
              name: ipo.company_name,
              slug: ipo.slug,
              oldStatus: ipo.status,
              newStatus: 'listing',
            })
          }
        }
      } else {
        errors.push({ id: ipo.id, name: ipo.company_name, error: result.message })
      }
      continue
    }

    // Plain status transition (no migration involved).
    if (target !== ipo.status) {
      const { error: updateError } = await supabase
        .from('ipos')
        .update({ status: target })
        .eq('id', ipo.id)

      if (updateError) {
        errors.push({
          id: ipo.id,
          name: ipo.company_name,
          error: updateError.message,
        })
      } else {
        updates.push({
          id: ipo.id,
          name: ipo.company_name,
          slug: ipo.slug,
          oldStatus: ipo.status,
          newStatus: target,
        })
      }
    }
  }

  return {
    ran_at,
    ist_today: ist.today,
    ist_hour: ist.hour,
    checked: rows.length,
    updated: updates,
    migrated,
    pending,
    errors,
  }
}

// GET /api/admin/auto-status — manual admin trigger / cron HTTP wrapper.
export async function GET() {
  try {
    const result = await runAutoStatusJob()
    return NextResponse.json({
      message: `Status check complete. Updated ${result.updated.length}, migrated ${result.migrated.length}, pending ${result.pending.length}.`,
      ...result,
    })
  } catch (error) {
    console.error('[auto-status] fatal:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST behaves the same as GET — it's just here for older clients / cron.
export async function POST() {
  return GET()
}
