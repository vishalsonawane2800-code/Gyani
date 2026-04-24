/**
 * Display-override helpers for admin-typed "NA" / "-" values.
 *
 * Our numeric DB columns can't hold the strings admins sometimes type
 * to mean "not available". Migration 032 adds a `text_overrides` map
 * that captures those literals. These helpers pull the right string
 * out of `IPO.textOverrides` at render time so the UI can show the
 * exact text the admin typed instead of a misleading "0".
 *
 * Usage:
 *
 *   formatNumeric(ipo, 'financials.fy25.revenue', revenue.fy25, {
 *     format: (n) => `Rs ${n} Cr`,
 *   })
 *
 * If admin typed "NA" in the bulk form the returned string is "NA".
 * If admin typed "-" the returned string is "-". Otherwise the numeric
 * formatter runs as usual.
 */
import type { IPO } from '@/lib/data'

export function getOverride(
  ipo: Pick<IPO, 'textOverrides'> | null | undefined,
  key: string,
): string | undefined {
  const override = ipo?.textOverrides?.[key]
  if (typeof override === 'string' && override.trim() !== '') return override.trim()
  return undefined
}

export interface FormatNumericOptions {
  /** Formatter invoked when a finite numeric value is present. */
  format: (n: number) => string
  /** Returned when both the override and value are missing/invalid. */
  fallback?: string
  /**
   * When true (default), numeric `0` / `NaN` is treated as "missing"
   * and the fallback is shown instead. Set to false for fields where 0
   * is a real value (e.g. absolute rupee amounts that can legitimately
   * be zero).
   */
  treatZeroAsMissing?: boolean
}

export function formatNumeric(
  ipo: Pick<IPO, 'textOverrides'> | null | undefined,
  key: string,
  value: number | null | undefined,
  opts: FormatNumericOptions,
): string {
  const override = getOverride(ipo, key)
  if (override) return override
  const fallback = opts.fallback ?? 'NA'
  const treatZero = opts.treatZeroAsMissing ?? true
  if (value === null || value === undefined) return fallback
  if (!Number.isFinite(value)) return fallback
  if (treatZero && value === 0) return fallback
  return opts.format(value)
}
