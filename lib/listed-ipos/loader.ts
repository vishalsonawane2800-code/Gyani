import fs from 'node:fs';
import path from 'node:path';

import {
  parseListedIpoCsv,
  slugify,
  type ListedIpoRecord,
} from './_parse';

/**
 * Mainboard Listed-IPO archive loader.
 *
 * Reads CSVs from /data/listed-ipos/<year>/<year>.csv at request/build time
 * and caches parsed results in module scope. Because pages using this loader
 * are statically generated via `generateStaticParams`, CSVs are parsed
 * exactly once per deploy - no runtime DB cost.
 *
 * The pure parsing logic lives in `./_parse` and is shared with the SME
 * archive (`lib/listed-sme-ipos/loader.ts`). Only the filesystem directory
 * and caches differ between the two loaders.
 */

// Re-export the record type + slug helper for backwards compatibility with
// modules that import them from this file (e.g. `lib/listed-ipos/db.ts` and
// several components/pages).
export { slugify };
export type { ListedIpoRecord };

const DATA_DIR = path.join(process.cwd(), 'data', 'listed-ipos');

const cache = new Map<number, ListedIpoRecord[]>();
let allYearsCache: number[] | null = null;

/**
 * Resolve the CSV file path for a given year.
 *
 * Supports two layouts (in order of preference):
 *   1. data/listed-ipos/<year>/<year>.csv   (current repo layout)
 *   2. data/listed-ipos/<year>.csv          (legacy flat layout)
 *
 * Also falls back to the first *.csv file found inside
 * data/listed-ipos/<year>/ so adding a differently named CSV still works.
 */
function resolveYearCsvPath(year: number): string | null {
  const candidates = [
    path.join(DATA_DIR, String(year), `${year}.csv`),
    path.join(DATA_DIR, `${year}.csv`),
  ];
  for (const c of candidates) {
    try {
      if (fs.statSync(c).isFile()) return c;
    } catch {
      // not found, try next
    }
  }
  const yearDir = path.join(DATA_DIR, String(year));
  try {
    const files = fs.readdirSync(yearDir).filter((f) => f.toLowerCase().endsWith('.csv'));
    if (files.length > 0) return path.join(yearDir, files[0]);
  } catch {
    // no year dir
  }
  return null;
}

export function getAvailableYears(): number[] {
  if (allYearsCache) return allYearsCache;
  const years = new Set<number>();
  try {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}$/.test(entry.name)) {
        const y = parseInt(entry.name, 10);
        if (resolveYearCsvPath(y)) years.add(y);
        continue;
      }
      if (entry.isFile() && /^\d{4}\.csv$/.test(entry.name)) {
        years.add(parseInt(entry.name.slice(0, 4), 10));
      }
    }
  } catch {
    // DATA_DIR missing - leave years empty
  }
  const sorted = Array.from(years).sort((a, b) => b - a);
  allYearsCache = sorted;
  return sorted;
}

export function getListedIposByYear(year: number): ListedIpoRecord[] {
  if (cache.has(year)) return cache.get(year)!;
  const file = resolveYearCsvPath(year);
  if (!file) {
    cache.set(year, []);
    return [];
  }
  try {
    const text = fs.readFileSync(file, 'utf8');
    const parsed = parseListedIpoCsv(text, year);
    cache.set(year, parsed);
    return parsed;
  } catch {
    cache.set(year, []);
    return [];
  }
}

export function getListedIpo(year: number, slug: string): ListedIpoRecord | null {
  return getListedIposByYear(year).find((r) => r.slug === slug) ?? null;
}

export function getAllListedIpoParams(): Array<{ year: string; slug: string }> {
  const years = getAvailableYears();
  const out: Array<{ year: string; slug: string }> = [];
  for (const y of years) {
    for (const rec of getListedIposByYear(y)) {
      out.push({ year: String(y), slug: rec.slug });
    }
  }
  return out;
}

// -----------------------------------------------------------------------------
// Async merged loaders (CSV + DB)
// These fetch from both CSV files and the `listed_ipos` DB table, merging
// results. CSV records win on slug conflict since they have richer data.
// Use these in pages that need to show DB-sourced rows without a CSV commit.
// -----------------------------------------------------------------------------

import {
  getListedIposFromDbByYear,
  getListedIpoFromDb,
  getAvailableYearsFromDb,
} from './db';

/**
 * Merge CSV and DB records for a year. CSV wins on slug conflict.
 */
export async function getMergedListedIposByYear(
  year: number
): Promise<ListedIpoRecord[]> {
  const csvRows = getListedIposByYear(year);
  const dbRows = await getListedIposFromDbByYear(year);

  const bySlug = new Map<string, ListedIpoRecord>();
  for (const r of csvRows) {
    bySlug.set(r.slug, r);
  }
  for (const r of dbRows) {
    if (!bySlug.has(r.slug)) {
      bySlug.set(r.slug, r);
    }
  }

  const merged = Array.from(bySlug.values());
  merged.sort((a, b) => (a.listingDate < b.listingDate ? 1 : -1));
  return merged;
}

/**
 * Get a single IPO by year + slug, checking CSV first then DB.
 */
export async function getMergedListedIpo(
  year: number,
  slug: string
): Promise<ListedIpoRecord | null> {
  const csvMatch = getListedIpo(year, slug);
  if (csvMatch) return csvMatch;
  return getListedIpoFromDb(year, slug);
}

/**
 * Get all available years from both CSV and DB, deduplicated and sorted desc.
 */
export async function getMergedAvailableYears(): Promise<number[]> {
  const csvYears = getAvailableYears();
  const dbYears = await getAvailableYearsFromDb();
  const all = new Set([...csvYears, ...dbYears]);
  return Array.from(all).sort((a, b) => b - a);
}

// ============================================================================
// SME IPO integration - merge SME IPOs with mainboard results
// ============================================================================

import {
  getListedSmeIposByYear,
  getSmeAvailableYears,
} from '@/lib/listed-sme-ipos/loader';

/**
 * Get merged listed IPOs (mainboard + SME) for a year from CSVs.
 * Merges both archives and sorts by listing date descending.
 * 
 * Marks SME records with an '__isSme: true' property so they can be
 * identified downstream (e.g. in toListedIpoCard).
 */
export function getMergedListedIposCsv(year: number): (ListedIpoRecord & { __isSme?: boolean })[] {
  const mainboard = getListedIposByYear(year);
  const sme = getListedSmeIposByYear(year).map(r => ({ ...r, __isSme: true }));
  const merged = [...mainboard, ...sme];
  merged.sort((a, b) => (a.listingDate > b.listingDate ? -1 : 1));
  return merged;
}

/**
 * Get all available years that have either mainboard or SME listed IPO data.
 */
export function getAllMergedAvailableYears(): number[] {
  const mainboardYears = getAvailableYears();
  const smeYears = getSmeAvailableYears();
  const all = new Set([...mainboardYears, ...smeYears]);
  return Array.from(all).sort((a, b) => b - a);
}

/**
 * Get merged listed IPOs from both CSV and DB sources (mainboard + SME).
 * CSV records take precedence over DB on slug conflict.
 * 
 * Preserves the '__isSme' flag from CSV records so downstream code
 * (e.g. toListedIpoCard) can properly identify SME IPOs.
 */
export async function getMergedListedIposByYearWithSme(
  year: number
): Promise<(ListedIpoRecord & { __isSme?: boolean })[]> {
  const csvRows = getMergedListedIposCsv(year);
  const dbRows = await getListedIposFromDbByYear(year);

  const bySlug = new Map<string, ListedIpoRecord & { __isSme?: boolean }>();
  for (const r of csvRows) {
    bySlug.set(r.slug, r);
  }
  for (const r of dbRows) {
    if (!bySlug.has(r.slug)) {
      bySlug.set(r.slug, r);
    }
  }

  const merged = Array.from(bySlug.values());
  merged.sort((a, b) => (a.listingDate < b.listingDate ? 1 : -1));
  return merged;
}

/**
 * Get all available years from mainboard CSV, SME CSV, and DB.
 */
export async function getMergedAvailableYearsWithSme(): Promise<number[]> {
  const csvYears = getAllMergedAvailableYears();
  const dbYears = await getAvailableYearsFromDb();
  const all = new Set([...csvYears, ...dbYears]);
  return Array.from(all).sort((a, b) => b - a);
}
