'use client';

import { useMemo, useState } from 'react';
import type { ListedIPO } from '@/lib/data';

type HydratedIPO = ListedIPO & { gmpPredGain: number; gmpErr: number };

interface PredictionLogProps {
  ipos: HydratedIPO[];
  pageSize?: number;
}

export function PredictionLog({ ipos, pageSize = 15 }: PredictionLogProps) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(ipos.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return ipos.slice(start, start + pageSize);
  }, [ipos, safePage, pageSize]);

  // Build a compact page list: 1 ... p-1 p p+1 ... N
  const pageNumbers = useMemo(() => {
    const pages: (number | 'ellipsis-l' | 'ellipsis-r')[] = [];
    const push = (n: number | 'ellipsis-l' | 'ellipsis-r') => pages.push(n);

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) push(i);
      return pages;
    }

    push(1);
    if (safePage > 3) push('ellipsis-l');
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) push(i);
    if (safePage < totalPages - 2) push('ellipsis-r');
    push(totalPages);
    return pages;
  }, [safePage, totalPages]);

  const rangeStart = (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, ipos.length);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Full Prediction Log</h2>
          <p className="text-[12px] text-ink3 mt-0.5">
            All {ipos.length} listed IPOs in our dataset, newest first. New listings are auto-ingested from our scraper pipeline.
          </p>
        </div>
        <div className="text-[11.5px] text-ink3 tabular-nums">
          Showing <span className="font-bold text-foreground">{rangeStart}&ndash;{rangeEnd}</span> of{' '}
          <span className="font-bold text-foreground">{ipos.length}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4 sticky left-0 bg-secondary z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO Name</th>
              <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">List Date</th>
              <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Exchange</th>
              <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Pred</th>
              <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Last-Day GMP %</th>
              <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Actual</th>
              <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Err</th>
              <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Accuracy</th>
              <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Result</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.map(ipo => {
              const pred = parseFloat(ipo.aiPred) || 0;
              const isHit = ipo.aiErr < 5;
              const accuracy = Math.max(0, 100 - ipo.aiErr * 10);

              return (
                <tr key={`full-${ipo.id}`} className="border-b border-border last:border-b-0 hover:bg-secondary/50 group/row">
                  <td className="py-3 px-4 sticky left-0 bg-card group-hover/row:bg-secondary/50 z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                        style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                      >
                        {ipo.abbr}
                      </div>
                      <span className="font-semibold">{ipo.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-ink3 whitespace-nowrap">{ipo.listDate}</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-xl bg-secondary text-ink3">
                      {ipo.exchange}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-bold tabular-nums ${pred >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                    {ipo.aiPred}
                  </td>
                  <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gmpPredGain >= 0 ? 'text-emerald-mid/80' : 'text-destructive/80'}`}>
                    {ipo.gmpPredGain >= 0 ? '+' : ''}{ipo.gmpPredGain.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gainPct >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                    {ipo.gainPct >= 0 ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                  </td>
                  <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                    {ipo.aiErr.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4">
                    <div className="h-1.5 bg-secondary rounded w-[80px] overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${accuracy}%`,
                          backgroundColor: ipo.aiErr < 2 ? 'var(--emerald-mid)' : ipo.aiErr < 5 ? 'var(--gold-mid)' : 'var(--destructive)',
                        }}
                      />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      isHit ? 'bg-emerald-bg text-emerald' : 'bg-gold-bg text-gold'
                    }`}>
                      {isHit ? 'Hit' : 'Miss'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav
          aria-label="Prediction log pagination"
          className="p-4 border-t border-border flex items-center justify-between gap-3 flex-wrap"
        >
          <div className="text-[11.5px] text-ink3 tabular-nums">
            Page <span className="font-bold text-foreground">{safePage}</span> of{' '}
            <span className="font-bold text-foreground">{totalPages}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-8 px-3 text-[12px] font-semibold rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              Prev
            </button>
            {pageNumbers.map((p, idx) => {
              if (p === 'ellipsis-l' || p === 'ellipsis-r') {
                return (
                  <span key={`${p}-${idx}`} className="h-8 w-6 flex items-center justify-center text-[12px] text-ink3">
                    &hellip;
                  </span>
                );
              }
              const active = p === safePage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  aria-current={active ? 'page' : undefined}
                  className={`h-8 min-w-8 px-2.5 text-[12px] font-bold rounded-lg border tabular-nums transition-colors ${
                    active
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-card text-foreground border-border hover:bg-secondary'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-8 px-3 text-[12px] font-semibold rounded-lg border border-border bg-card hover:bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
