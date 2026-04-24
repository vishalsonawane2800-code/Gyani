import fs from 'node:fs';
import path from 'node:path';

import { parseCsvRows } from '@/lib/listed-ipos/_parse';

/**
 * Expected-Soon IPO loader.
 *
 * Reads the DRHP-filed / SEBI-approved IPO pipeline from
 *   data/expected-soon-ipos/<year>.csv
 * and exposes a cached, normalized list for the Upcoming-IPOs page.
 *
 * The source CSV follows the SEBI-style pipeline layout with columns:
 *   Company, Offer Type, Sale Type, DRHP Filing Date, SEBI Approval Date,
 *   Estimated Issue Size, Exchange, Primary Lead Manager, Industry
 *
 * All rows are rendered in the "Expected Soon - Dates Not Announced"
 * section on /upcoming with server-side pagination.
 */

export type ExpectedSoonIpo = {
  /** Clean display name with trailing "Ltd." preserved. */
  company: string;
  industry: string;
  offerType: string;
  saleType: string;
  drhpFilingDate: string; // as provided (e.g. "23-Apr-2026")
  sebiApprovalDate: string; // may be empty
  estimatedIssueSize: string;
  exchange: string;
  primaryLeadManager: string;
  /** Human-readable status timeframe derived from SEBI approval / DRHP dates. */
  timeframe: string;
  /** Short note for the table: lead manager + offer mix. */
  note: string;
  /** Parsed sort key: more-recent activity first. */
  sortKey: number;
};

const DATA_DIR = path.join(process.cwd(), 'data', 'expected-soon-ipos');

let cache: ExpectedSoonIpo[] | null = null;

function parseDdMonYyyy(raw: string): number {
  const s = (raw || '').trim();
  if (!s) return 0;
  const parts = s.split('-');
  if (parts.length !== 3) return 0;
  const [dd, mon, yyyy] = parts;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mIdx = months.findIndex(
    (m) => m.toLowerCase() === mon.slice(0, 3).toLowerCase()
  );
  if (mIdx < 0) return 0;
  const y = parseInt(yyyy, 10);
  const d = parseInt(dd, 10);
  if (!Number.isFinite(y) || !Number.isFinite(d)) return 0;
  return Date.UTC(y, mIdx, d);
}

function deriveTimeframe(
  drhpDate: string,
  sebiDate: string,
): string {
  if (sebiDate) return `SEBI approved ${sebiDate}`;
  if (drhpDate) return `DRHP filed ${drhpDate}`;
  return 'Expected soon';
}

function deriveNote(row: {
  primaryLeadManager: string;
  offerType: string;
  saleType: string;
  sebiApprovalDate: string;
}): string {
  const bits: string[] = [];
  if (row.saleType) bits.push(row.saleType);
  else if (row.offerType) bits.push(row.offerType);
  if (row.primaryLeadManager) bits.push(`Lead: ${row.primaryLeadManager}`);
  return bits.filter(Boolean).join(' • ') || '-';
}

function rowToIpo(row: Record<string, string>): ExpectedSoonIpo | null {
  const company = (row['Company'] || '').trim();
  if (!company) return null;
  const drhp = (row['DRHP Filing Date'] || '').trim();
  const sebi = (row['SEBI Approval Date'] || '').trim();
  const ipo: ExpectedSoonIpo = {
    company,
    industry: (row['Industry'] || '').trim(),
    offerType: (row['Offer Type'] || '').trim(),
    saleType: (row['Sale Type'] || '').trim(),
    drhpFilingDate: drhp,
    sebiApprovalDate: sebi,
    estimatedIssueSize: (row['Estimated Issue Size'] || '').trim(),
    exchange: (row['Exchange'] || '').trim(),
    primaryLeadManager: (row['Primary Lead Manager'] || '').trim(),
    timeframe: deriveTimeframe(drhp, sebi),
    note: '',
    sortKey: Math.max(parseDdMonYyyy(sebi), parseDdMonYyyy(drhp)),
  };
  ipo.note = deriveNote(ipo);
  return ipo;
}

export function getExpectedSoonIpos(): ExpectedSoonIpo[] {
  if (cache) return cache;

  const file = path.join(DATA_DIR, '2026.csv');
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    cache = [];
    return cache;
  }

  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    cache = [];
    return cache;
  }

  const header = rows[0];
  const out: ExpectedSoonIpo[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = cells[idx] ?? '';
    });
    const ipo = rowToIpo(row);
    if (ipo) out.push(ipo);
  }

  // Newest SEBI approval / DRHP filing first.
  out.sort((a, b) => b.sortKey - a.sortKey);
  cache = out;
  return cache;
}

/** Normalize the exchange text to the table's Mainboard / SME chip. */
export function exchangeKind(
  exchange: string,
): 'Mainboard' | 'BSE SME' | 'NSE SME' {
  const lower = exchange.toLowerCase();
  if (lower.includes('sme')) {
    if (lower.includes('bse')) return 'BSE SME';
    if (lower.includes('nse')) return 'NSE SME';
    return 'BSE SME';
  }
  return 'Mainboard';
}

/**
 * Paginate an array and return the slice plus helpful metadata the page
 * component uses to render the pagination nav.
 */
export function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): {
  slice: T[];
  page: number;
  perPage: number;
  totalPages: number;
  total: number;
  start: number;
  end: number;
} {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);
  const start = (p - 1) * perPage;
  const end = Math.min(start + perPage, total);
  return {
    slice: items.slice(start, end),
    page: p,
    perPage,
    totalPages,
    total,
    start,
    end,
  };
}
