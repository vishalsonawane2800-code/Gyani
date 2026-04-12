'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IPOCard } from '@/components/ipo-card';

type FilterType = 'all' | 'main' | 'sme';

// Priority order for IPO status
const statusPriority: Record<string, number> = {
  listing: 5,
  allot: 4,
  lastday: 3,
  open: 2,
  upcoming: 1,
  closed: 0,
};

// Only show open/active IPOs (not listed - they move to listed section)
const openStatuses: string[] = ['open', 'lastday', 'allot', 'listing'];

interface IPO {
  id: string;
  name: string;
  slug: string;
  status: string;
  price_band: string;
  lot_size: number;
  issue_size: string;
  exchange: string;
  open_date: string;
  close_date: string;
  latest_gmp?: number;
  gmp?: number;
}

interface CurrentIPOsProps {
  ipos: IPO[];
}

export function CurrentIPOs({ ipos }: CurrentIPOsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter only open IPOs and sort by priority
  const openIPOs = ipos.filter((ipo) =>
    openStatuses.includes(ipo.status)
  );

  const sortedIPOs = [...openIPOs].sort((a, b) => {
    return (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
  });

  const filteredIPOs = sortedIPOs.filter((ipo) => {
    if (filter === 'all') return true;
    if (filter === 'main')
      return ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT';
    if (filter === 'sme')
      return ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
    return true;
  });

  const activeCount = openIPOs.length;

  return (
    <section id="current" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">
            Current IPO
          </h2>
          <span className="text-xs font-extrabold py-1 px-3 rounded-full bg-emerald-bg text-emerald">
            {activeCount} Active
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter Toggle */}
          <div className="flex bg-secondary rounded-lg p-1 gap-1">
            {(['all', 'main', 'sme'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-xs sm:text-sm font-semibold py-1 px-3 rounded transition-all ${
                  filter === type
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-ink3 hover:text-foreground'
                }`}
              >
                {type === 'all'
                  ? 'All'
                  : type === 'main'
                  ? 'Mainboard'
                  : 'SME'}
              </button>
            ))}
          </div>

          <Link
            href="/listed"
            className="text-xs sm:text-sm font-semibold text-primary hover:opacity-75 transition-opacity"
          >
            View All
          </Link>
        </div>
      </div>

      {/* IPO Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIPOs.map((ipo) => (
          <IPOCard key={ipo.id} ipo={ipo} />
        ))}
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-4 mt-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald"></span>
          <span className="text-ink3">Listing Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="text-ink3">Allotment Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold"></span>
          <span className="text-ink3">Last Day</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cobalt"></span>
          <span className="text-ink3">Open</span>
        </div>
      </div>
    </section>
  );
}
