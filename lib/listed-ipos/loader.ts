import fs from 'node:fs';
import path from 'node:path';

/**
 * Listed IPO archive loader.
 *
 * Reads CSVs from /data/listed-ipos/<year>.csv at request/build time and
 * caches parsed results in module scope. Because pages using this loader
 * are statically generated via `generateStaticParams`, CSVs are parsed
 * exactly once per deploy - no runtime DB cost.
 */

export type ListedIpoRecord = {
  slug: string;
  year: number;
  name: string;
  listingDate: string; // normalized YYYY-MM-DD when possible, else raw
  listingDateRaw: string;
  sector: string;

  retailQuotaPct: number | null;
  issuePriceUpper: number | null;
  listingPrice: number | null;
  closingPriceNse: number | null;
  listingGainPct: number | null;
  listingGainClosingPct: number | null;
  dayChangeAfterListingPct: number | null;

  qibDay3: number | null;
  hniDay3: number | null;
  retailDay3: number | null;
  day1Sub: number | null;
  day2Sub: number | null;
  day3Sub: number | null;

  gmpPctD1: number | null;
  gmpPctD2: number | null;
  gmpPctD3: number | null;
  gmpPctD4: number | null;
  gmpPctD5: number | null;

  peerPe: number | null;
  debtEquity: number | null;
  ipoPe: number | null;
  latestEbitda: number | null;
  peVsSectorRatio: number | null;

  nifty3dPct: number | null;
  nifty1wPct: number | null;
  nifty1mPct: number | null;
  niftyDuringWindowPct: number | null;

  sentimentScore: number | null;
  issueSizeCr: number | null;
  freshIssueCr: number | null;
  ofsCr: number | null;

  gmpD1: number | null;
  gmpD2: number | null;
  gmpD3: number | null;
  gmpD4: number | null;
  gmpD5: number | null;
};

const DATA_DIR = path.join(process.cwd(), 'data', 'listed-ipos');

const cache = new Map<number, ListedIpoRecord[]>();
let allYearsCache: number[] | null = null;

/** Parse a single CSV line respecting double-quoted fields. */
function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === ',') {
        out.push(cur);
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function toNumber(raw: string | undefined): number | null {
  if (raw == null) return null;
  const s = raw.replace(/[,₹%]/g, '').replace(/\s+/g, '').trim();
  if (!s || s === '-' || s.toLowerCase() === 'na' || s.toLowerCase() === 'n/a') {
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Normalize a date string to YYYY-MM-DD when possible. */
function normalizeDate(raw: string): string {
  const s = raw.trim();
  if (!s) return '';
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD-MM-YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Try Date.parse fallback
  const t = Date.parse(s);
  if (!Number.isNaN(t)) {
    const d = new Date(t);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${mo}-${da}`;
  }
  return s;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

/** Column-name -> record-key resolver (flexible to small header variations). */
function getCol(row: Record<string, string>, ...names: string[]): string | undefined {
  for (const n of names) {
    if (n in row) return row[n];
    const lower = n.toLowerCase();
    const match = Object.keys(row).find((k) => k.toLowerCase() === lower);
    if (match) return row[match];
  }
  return undefined;
}

function rowToRecord(
  row: Record<string, string>,
  year: number
): ListedIpoRecord | null {
  const name = (getCol(row, 'IPO Name') || '').trim();
  if (!name) return null;
  const listingDateRaw = (getCol(row, 'Listing Date') || '').trim();
  const listingDate = normalizeDate(listingDateRaw);

  return {
    slug: slugify(name),
    year,
    name,
    listingDate,
    listingDateRaw,
    sector: (getCol(row, 'Sector') || '').trim(),

    retailQuotaPct: toNumber(getCol(row, 'Retail Quota (%)', 'Retail Quota %')),
    issuePriceUpper: toNumber(getCol(row, 'Issue Price Upper')),
    listingPrice: toNumber(getCol(row, 'Listing Price (Rs)', 'Listing Price')),
    closingPriceNse: toNumber(getCol(row, 'Closing Price NSE')),
    listingGainPct: toNumber(getCol(row, 'Listing Gain (%)', 'Listing Gain %')),
    listingGainClosingPct: toNumber(
      getCol(row, 'Listing gains on closing Basis (%)', 'Listing Gain Closing (%)')
    ),
    dayChangeAfterListingPct: toNumber(
      getCol(row, 'Day Change After Listing (%)', 'Day Change After Listing %')
    ),

    qibDay3: toNumber(getCol(row, 'QIB Day3 Subscription', 'QIB Day 3 Subscription')),
    hniDay3: toNumber(
      getCol(row, 'HNI/NII Day3 Subscription', 'HNI Day3 Subscription', 'NII Day3 Subscription')
    ),
    retailDay3: toNumber(getCol(row, 'Retail Day3 Subscription')),
    day1Sub: toNumber(getCol(row, 'Day1 Subscription', 'Day 1 Subscription')),
    day2Sub: toNumber(getCol(row, 'Day2 Subscription', 'Day 2 Subscription')),
    day3Sub: toNumber(getCol(row, 'Day3 Subscription', 'Day 3 Subscription')),

    gmpPctD1: toNumber(getCol(row, 'GMP percentage D1')),
    gmpPctD2: toNumber(getCol(row, 'GMP percentage D2')),
    gmpPctD3: toNumber(getCol(row, 'GMP percentage D3')),
    gmpPctD4: toNumber(getCol(row, 'GMP percentage D4')),
    gmpPctD5: toNumber(getCol(row, 'GMP percentage D5')),

    peerPe: toNumber(getCol(row, 'Peer PE')),
    debtEquity: toNumber(getCol(row, 'Debt/Equity', 'Debt Equity')),
    ipoPe: toNumber(getCol(row, 'IPO PE')),
    latestEbitda: toNumber(getCol(row, 'Latest EBIDTA', 'Latest EBITDA')),
    peVsSectorRatio: toNumber(getCol(row, 'PE vs Sector Ratio')),

    nifty3dPct: toNumber(getCol(row, 'Nifty 3D Return (%)', 'Nifty 3D Return %')),
    nifty1wPct: toNumber(getCol(row, 'Nifty 1W Return (%)', 'Nifty 1W Return %')),
    nifty1mPct: toNumber(getCol(row, 'Nifty 1M Return (%)', 'Nifty 1M Return %')),
    niftyDuringWindowPct: toNumber(
      getCol(row, 'Nifty During IPO Window (%)', 'Nifty During IPO Window %')
    ),

    sentimentScore: toNumber(getCol(row, 'Market Sentiment Score')),
    issueSizeCr: toNumber(getCol(row, 'Issue Size (Rs Cr)', 'Issue Size')),
    freshIssueCr: toNumber(getCol(row, 'Fresh Issue')),
    ofsCr: toNumber(getCol(row, 'OFS')),

    gmpD1: toNumber(getCol(row, 'GMP Day-1', 'GMP Day 1')),
    gmpD2: toNumber(getCol(row, 'GMP Day-2', 'GMP Day 2')),
    gmpD3: toNumber(getCol(row, 'GMP Day-3', 'GMP Day 3')),
    gmpD4: toNumber(getCol(row, 'GMP Day-4', 'GMP Day 4')),
    gmpD5: toNumber(getCol(row, 'GMP Day-5', 'GMP Day 5')),
  };
}

function parseCsv(text: string, year: number): ListedIpoRecord[] {
  const lines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const header = parseLine(lines[0]);
  const records: ListedIpoRecord[] = [];
  const seen = new Map<string, number>();

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    const rec = rowToRecord(row, year);
    if (!rec) continue;

    // Ensure slug uniqueness within a year
    const n = (seen.get(rec.slug) ?? 0) + 1;
    seen.set(rec.slug, n);
    if (n > 1) rec.slug = `${rec.slug}-${n}`;

    records.push(rec);
  }

  // Sort newest listing first
  records.sort((a, b) => (a.listingDate < b.listingDate ? 1 : -1));
  return records;
}

export function getAvailableYears(): number[] {
  if (allYearsCache) return allYearsCache;
  try {
    const files = fs.readdirSync(DATA_DIR);
    const years = files
      .filter((f) => /^\d{4}\.csv$/.test(f))
      .map((f) => parseInt(f.slice(0, 4), 10))
      .sort((a, b) => b - a);
    allYearsCache = years;
    return years;
  } catch {
    allYearsCache = [];
    return [];
  }
}

export function getListedIposByYear(year: number): ListedIpoRecord[] {
  if (cache.has(year)) return cache.get(year)!;
  const file = path.join(DATA_DIR, `${year}.csv`);
  try {
    const text = fs.readFileSync(file, 'utf8');
    const parsed = parseCsv(text, year);
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
