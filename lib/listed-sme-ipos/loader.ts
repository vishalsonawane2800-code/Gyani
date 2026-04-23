import fs from 'node:fs';
import path from 'node:path';

import {
  parseListedIpoCsv,
  slugify,
  type ListedIpoRecord,
} from '@/lib/listed-ipos/_parse';

/**
 * SME Listed-IPO archive loader.
 *
 * Mirror of `lib/listed-ipos/loader.ts` (the mainboard archive) but scoped
 * to `data/listed-sme-ipos/<year>/<year>.csv`. The CSV column layout is
 * intentionally identical to the mainboard archive so the same parser,
 * types, and downstream components can be reused.
 *
 * Drop new SME listings into `data/listed-sme-ipos/<year>/<year>.csv`
 * (copy `_template.csv` for the exact header row) and they will be picked
 * up by:
 *   - `getSmeAvailableYears()` - list of years that have data
 *   - `getListedSmeIposByYear(year)` - array of SME listings for a year
 *   - `getListedSmeIpo(year, slug)` - single IPO lookup
 *   - `getAllListedSmeIpoParams()` - for `generateStaticParams`
 *
 * Shares the parser with the mainboard loader via `lib/listed-ipos/_parse.ts`;
 * only the filesystem directory and module-scope caches differ.
 */

// Re-export for callers that want a single import surface for the SME lib.
export { slugify };
export type { ListedIpoRecord };

const DATA_DIR = path.join(process.cwd(), 'data', 'listed-sme-ipos');

const cache = new Map<number, ListedIpoRecord[]>();
let allYearsCache: number[] | null = null;

/**
 * Resolve the CSV file path for a given year.
 *
 * Supports two layouts (in order of preference):
 *   1. data/listed-sme-ipos/<year>/<year>.csv   (recommended)
 *   2. data/listed-sme-ipos/<year>.csv          (flat fallback)
 *
 * Also falls back to the first *.csv file found inside
 * data/listed-sme-ipos/<year>/ so adding a differently named CSV still works.
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

export function getSmeAvailableYears(): number[] {
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

export function getListedSmeIposByYear(year: number): ListedIpoRecord[] {
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

export function getListedSmeIpo(
  year: number,
  slug: string
): ListedIpoRecord | null {
  return getListedSmeIposByYear(year).find((r) => r.slug === slug) ?? null;
}

export function getAllListedSmeIpoParams(): Array<{ year: string; slug: string }> {
  const years = getSmeAvailableYears();
  const out: Array<{ year: string; slug: string }> = [];
  for (const y of years) {
    for (const rec of getListedSmeIposByYear(y)) {
      out.push({ year: String(y), slug: rec.slug });
    }
  }
  return out;
}
