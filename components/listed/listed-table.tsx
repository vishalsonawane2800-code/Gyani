'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { listedIPOs } from '@/lib/data';
import { useListedFilters } from '@/hooks/use-listed-filters';

const PAGE_SIZE = 15;

// Generate abbreviation from company name
function generateAbbr(name: string | undefined | null): string {
  if (!name) return 'IP';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';
}

export function ListedTable() {
  const { year, exchange, gainFilter, search, sort } = useListedFilters();
  const [page, setPage] = useState(1);

  const filteredData = useMemo(() => {
    let data = [...listedIPOs];

    // Year filter
    if (year !== 'all') {
      data = data.filter(ipo => ipo.year === year);
    }

    // Exchange filter
    if (exchange !== 'all') {
      data = data.filter(ipo => ipo.exchange === exchange);
    }

    // Gain filter
    if (gainFilter !== 'all') {
      switch (gainFilter) {
        case 'above20':
          data = data.filter(ipo => ipo.gainPct >= 20);
          break;
        case 'above10':
          data = data.filter(ipo => ipo.gainPct >= 10);
          break;
        case 'positive':
          data = data.filter(ipo => ipo.gainPct > 0);
          break;
        case 'negative':
          data = data.filter(ipo => ipo.gainPct < 0);
          break;
      }
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(ipo => 
        ipo.name.toLowerCase().includes(q) || 
        ipo.sector.toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      switch (sort) {
        case 'date-desc':
          return new Date(b.listDate).getTime() - new Date(a.listDate).getTime();
        case 'date-asc':
          return new Date(a.listDate).getTime() - new Date(b.listDate).getTime();
        case 'gain-desc':
          return b.gainPct - a.gainPct;
        case 'gain-asc':
          return a.gainPct - b.gainPct;
        case 'sub-desc':
          return b.subTimes - a.subTimes;
        case 'alpha':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return data;
  }, [year, exchange, gainFilter, search, sort]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const paginatedData = filteredData.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getExchangeBadge = (ex: string) => {
    switch (ex) {
      case 'Mainboard': return 'bg-cobalt-bg text-cobalt';
      case 'BSE SME': return 'bg-secondary text-ink3';
      case 'NSE SME': return 'bg-[#fff0f6] text-[#9d174d]';
      default: return 'bg-secondary text-ink3';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Results Info */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <span className="text-xs sm:text-sm text-ink3">
          Showing <strong className="text-foreground">{(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredData.length)}</strong> of <strong className="text-foreground">{filteredData.length}</strong> IPOs
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap min-w-[180px]"># Company</th>
              <th className="text-left text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Exchange</th>
              <th className="text-left text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Sector</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Listing Date</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Issue Price</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Listing Price</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Listing Gain</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Subscription</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">AI Pred.</th>
              <th className="text-right text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">AI Error</th>
              <th className="text-center text-xs font-bold uppercase tracking-wide text-ink3 py-3 px-3 whitespace-nowrap">Details</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((ipo, index) => {
              const isPositive = ipo.gainPct > 0;
              const gainColor = ipo.gainPct > 10 ? 'text-emerald-mid' : ipo.gainPct > 0 ? 'text-emerald' : ipo.gainPct > -5 ? 'text-gold-mid' : 'text-destructive';
              const gainBg = ipo.gainPct > 10 ? 'bg-emerald-bg' : ipo.gainPct > 0 ? 'bg-emerald-bg' : ipo.gainPct > -5 ? 'bg-gold-bg' : 'bg-destructive-bg';
              const subColor = ipo.subTimes > 50 ? 'text-emerald-mid' : ipo.subTimes > 10 ? 'text-cobalt-mid' : ipo.subTimes > 1 ? 'text-foreground' : 'text-destructive';
              const errColor = ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 4 ? 'text-gold-mid' : 'text-destructive';

              return (
                <tr key={ipo.id} className="border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-xs font-black shrink-0"
                  style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                >
                  {generateAbbr(ipo.name)}
                </div>
                      <div>
                        <Link href={`/ipo/${ipo.slug}`} className="font-bold text-primary hover:underline">
                          {ipo.name}
                        </Link>
                        <div className="text-xs text-ink3">{ipo.sector}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getExchangeBadge(ipo.exchange)}`}>
                      {ipo.exchange}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-ink3">{ipo.sector}</td>
                  <td className="py-3 px-3 text-right text-xs text-ink2 whitespace-nowrap">{formatDate(ipo.listDate)}</td>
                  <td className="py-3 px-3 text-right font-bold">
                    Rs {ipo.issuePrice.toLocaleString()}
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${gainColor}`}>
                    Rs {ipo.listPrice.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-lg ${gainBg} ${gainColor}`}>
                      {isPositive ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`py-3 px-3 text-right font-bold ${subColor}`}>
                    {ipo.subTimes.toFixed(2)}x
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-primary">
                    {ipo.aiPred}
                  </td>
                  <td className={`py-3 px-3 text-right text-xs font-bold ${errColor}`}>
                    {ipo.aiErr}%
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Link 
                      href={`/ipo/${ipo.slug}`}
                      className="text-xs font-semibold text-cobalt-mid hover:underline whitespace-nowrap"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-ink3 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
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
                  page === pageNum
                    ? 'bg-primary text-white'
                    : 'border border-border bg-card text-ink3 hover:border-primary hover:text-primary'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
          
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-card text-ink3 disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary hover:text-primary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
