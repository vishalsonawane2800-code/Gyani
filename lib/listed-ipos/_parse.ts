/**
 * Shared CSV parser for the Listed-IPO archive.
 *
 * Both the mainboard archive (`lib/listed-ipos/loader.ts` reading
 * `data/listed-ipos/**`) and the SME archive (`lib/listed-sme-ipos/loader.ts`
 * reading `data/listed-sme-ipos/**`) use the same CSV column layout, so the
 * pure parsing code lives here and is reused from both loaders.
 *
 * Only the filesystem directory differs between the two archives - that is
 * injected by the individual loader modules.
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

  gmpPrediction: string | null; // e.g., "50-60%"
  aiPrediction: number | null; // percentage
  predictionAccuracy: number | null; // percentage
};

/**
 * Parse an entire CSV text into rows of cells, correctly handling:
 *   - Quoted fields containing commas
 *   - Quoted fields containing embedded newlines
 *   - Escaped double quotes ("")
 *   - Both LF and CRLF line endings
 *
 * Within quoted headers we collapse internal newlines to spaces so that
 * headers like  "Nifty 3D\nReturn (%)"  become  "Nifty 3D Return (%)" .
 */
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  let rowHasContent = false;

  const pushCell = () => {
    // Collapse internal whitespace/newlines that came from multi-line quoted headers
    row.push(cur.replace(/\s+/g, ' ').trim());
    cur = '';
  };
  const pushRow = () => {
    pushCell();
    if (rowHasContent) rows.push(row);
    row = [];
    rowHasContent = false;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
        if (ch !== '\n' && ch !== '\r') rowHasContent = true;
      }
    } else {
      if (ch === ',') {
        pushCell();
      } else if (ch === '"') {
        inQuotes = true;
        rowHasContent = true;
      } else if (ch === '\r') {
        if (text[i + 1] === '\n') i++;
        pushRow();
      } else if (ch === '\n') {
        pushRow();
      } else {
        cur += ch;
        if (ch !== ' ' && ch !== '\t') rowHasContent = true;
      }
    }
  }
  if (cur.length > 0 || row.length > 0) pushRow();
  return rows;
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
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) {
    const [, d, mo, y] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
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

/**
 * Normalize a column header so small cosmetic differences don't break lookups.
 */
function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/₹/g, '')
    .replace(/\brs\.?\b/g, '')
    .replace(/[^a-z0-9%]+/g, '');
}

/** Column-name -> record-key resolver (flexible to small header variations). */
function getCol(row: Record<string, string>, ...names: string[]): string | undefined {
  for (const n of names) {
    if (n in row) return row[n];
    const lower = n.toLowerCase();
    const ciMatch = Object.keys(row).find((k) => k.toLowerCase() === lower);
    if (ciMatch) return row[ciMatch];
    const norm = normalizeHeader(n);
    const normMatch = Object.keys(row).find((k) => normalizeHeader(k) === norm);
    if (normMatch) return row[normMatch];
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

    gmpPrediction: (getCol(row, 'GMP Prediction') || '').trim() || null,
    aiPrediction: toNumber(getCol(row, 'IPOGyani AI Prediction')),
    predictionAccuracy: toNumber(getCol(row, 'Prediction Accuracy (%)', 'Prediction Accuracy %')),
  };
}

/**
 * Parse a single CSV file's text into ListedIpoRecord rows for the given year.
 * Handles slug uniqueness (appends `-2`, `-3`, ... on collision) and sorts
 * newest listing first.
 */
export function parseListedIpoCsv(text: string, year: number): ListedIpoRecord[] {
  const rows = parseCsvRows(text);
  if (rows.length < 2) return [];
  const header = rows[0];
  const records: ListedIpoRecord[] = [];
  const seen = new Map<string, number>();

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    const rec = rowToRecord(row, year);
    if (!rec) continue;

    const n = (seen.get(rec.slug) ?? 0) + 1;
    seen.set(rec.slug, n);
    if (n > 1) rec.slug = `${rec.slug}-${n}`;

    records.push(rec);
  }

  records.sort((a, b) => (a.listingDate < b.listingDate ? 1 : -1));
  return records;
}
