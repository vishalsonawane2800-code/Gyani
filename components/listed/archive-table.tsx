'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import type { ListedIpoRecord } from '@/lib/listed-ipos/loader';

type SortKey =
  | 'date-desc'
  | 'date-asc'
  | 'gain-desc'
  | 'gain-asc'
  | 'sub-desc'
  | 'alpha';

const PAGE_SIZE = 25;

function formatDate(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
}

function fmtPct(v: number | null, decimals = 1) {
  if (v == null) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtNum(v: number | null, decimals = 2, suffix = '') {
  if (v == null) return '-';
  return `${v.toFixed(decimals)}${suffix}`;
}

function gainClasses(v: number | null) {
  if (v == null) return 'text-ink3 bg-secondary';
  if (v > 10) return 'text-emerald-mid bg-emerald-bg';
  if (v > 0) return 'text-emerald bg-emerald-bg';
  if (v > -5) return 'text-gold-mid bg-gold-bg';
  return 'text-destructive bg-destructive-bg';
}

function generateAbbr(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'IP'
  );
}

export function ArchiveTable({
  year,
  rows,
}: {
  year: number;
  rows: ListedIpoRecord[];
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('date-desc');
  const [gainFilter, setGainFilter] = useState<
    'all' | 'positive' | 'negative' | 'above10' | 'above20'
  >('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let data = [...rows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.sector.toLowerCase().includes(q)
      );
    }
    if (gainFilter !== 'all') {
      data = data.filter((r) => {
        const g = r.listingGainPct;
        if (g == null) return false;
        if (gainFilter === 'positive') return g > 0;
        if (gainFilter === 'negative') return g < 0;
        if (gainFilter === 'above10') return g >= 10;
        if (gainFilter === 'above20') return g >= 20;
        return true;
      });
    }
    data.sort((a, b) => {
      switch (sort) {
        case 'date-desc':
          return a.listingDate < b.listingDate ? 1 : -1;
        case 'date-asc':
          return a.listingDate > b.listingDate ? 1 : -1;
        case 'gain-desc':
          return (b.listingGainPct ?? -Infinity) - (a.listingGainPct ?? -Infinity);
        case 'gain-asc':
          return (a.listingGainPct ?? Infinity) - (b.listingGainPct ?? Infinity);
        case 'sub-desc':
          return (b.day3Sub ?? -Infinity) - (a.day3Sub ?? -Infinity);
        case 'alpha':
          return a.name.localeCompare(b.name);
      }
    });
    return data;
  }, [rows, search, sort, gainFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink3" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={`Search ${year} IPOs by name or sector...`}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground placeholder:text-ink3 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={gainFilter}
          onChange={(e) => {
            setGainFilter(e.target.value as typeof gainFilter);
            setPage(1);
          }}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary"
        >
          <option value="all">All gains</option>
          <option value="positive">Positive listing</option>
          <option value="negative">Negative listing</option>
          <option value="above10">10%+ gain</option>
          <option value="above20">20%+ gain</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-3 py-2 text-sm rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-primary"
        >
          <option value="date-desc">Newest listing</option>
          <option value="date-asc">Oldest listing</option>
          <option value="gain-desc">Highest listing gain</option>
          <option value="gain-asc">Lowest listing gain</option>
          <option value="sub-desc">Highest subscription</option>
          <option value="alpha">A - Z</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
          <span className="text-xs sm:text-sm text-ink3">
            Showing{' '}
            <strong className="text-foreground">
              {filtered.length === 0
                ? 0
                : (safePage - 1) * PAGE_SIZE + 1}
              -{Math.min(safePage * PAGE_SIZE, filtered.length)}
            </strong>{' '}
            of <strong className="text-foreground">{filtered.length}</strong> IPOs listed in{' '}
            {year}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left font-bold uppercase tracking-wide text-ink3 py-3 px-3 min-w-[200px]">
                  Company
                </th>
                <th className="text-left font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Sector
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Listing
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Issue Price
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Listing Price
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Listing Gain
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Close Gain
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Sub (x)
                </th>
                <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Size (Cr)
                </th>
                <th className="text-center font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-ink3 text-sm">
                    No IPOs found for these filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => {
                  const href = `/listed/${year}/${r.slug}`;
                  return (
                    <tr
                      key={r.slug}
                      className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-black shrink-0 bg-primary-bg text-primary">
                            {generateAbbr(r.name)}
                          </div>
                          <div>
                            <Link
                              href={href}
                              className="font-bold text-primary hover:underline"
                            >
                              {r.name}
                            </Link>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-ink2 whitespace-nowrap">
                        {r.sector || '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-ink2 whitespace-nowrap">
                        {formatDate(r.listingDate)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {r.issuePriceUpper != null
                          ? `Rs ${r.issuePriceUpper.toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {r.listingPrice != null
                          ? `Rs ${r.listingPrice.toLocaleString('en-IN')}`
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg ${gainClasses(
                            r.listingGainPct
                          )}`}
                        >
                          {fmtPct(r.listingGainPct)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span
                          className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg ${gainClasses(
                            r.listingGainClosingPct
                          )}`}
                        >
                          {fmtPct(r.listingGainClosingPct)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        {fmtNum(r.day3Sub, 2, 'x')}
                      </td>
                      <td className="py-3 px-3 text-right text-ink2 whitespace-nowrap">
                        {r.issueSizeCr != null
                          ? r.issueSizeCr.toLocaleString('en-IN')
                          : '-'}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Link
                          href={href}
                          className="text-xs font-semibold text-cobalt-mid hover:underline whitespace-nowrap inline-flex items-center gap-1"
                        >
                          View <ArrowUpDown className="w-3 h-3 rotate-90" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-ink3 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-[12.5px] font-semibold transition-colors ${
                    safePage === pageNum
                      ? 'bg-primary text-white'
                      : 'border border-border bg-card text-ink3 hover:border-primary hover:text-primary'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-ink3 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
