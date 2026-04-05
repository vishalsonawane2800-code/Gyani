'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IPOCard } from '@/components/ipo-card';
import { currentIPOs } from '@/lib/data';
import type { IPOStatus } from '@/lib/data';

type FilterType = 'all' | 'main' | 'sme';

// Priority order for IPO status (higher priority = more urgent)
const statusPriority: Record<IPOStatus, number> = {
  'listing': 5,
  'allot': 4,
  'lastday': 3,
  'open': 2,
  'upcoming': 1,
  'closed': 0,
};

// Only show open IPOs (open, lastday, allot, listing) - not closed or upcoming
const openStatuses: IPOStatus[] = ['open', 'lastday', 'allot', 'listing'];

export function CurrentIPOs() {
  const [filter, setFilter] = useState<FilterType>('all');

  // Filter only open IPOs and sort by status priority (most urgent first)
  const openIPOs = currentIPOs.filter(ipo => openStatuses.includes(ipo.status));
  const sortedIPOs = [...openIPOs].sort((a, b) => {
    return statusPriority[b.status] - statusPriority[a.status];
  });

  const filteredIPOs = sortedIPOs.filter((ipo) => {
    if (filter === 'all') return true;
    if (filter === 'main') return ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT';
    if (filter === 'sme') return ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
    return true;
  });

  const activeCount = openIPOs.length;

  return (
    <section id="current" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <h2 className="font-[family-name:var(--font-sora)] text-[17px] font-bold">
            Current IPO
          </h2>
          <span className="text-[10.5px] font-extrabold py-0.5 px-2.5 rounded-full bg-emerald-bg text-emerald">
            {activeCount} Active
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          {/* Filter Toggle */}
          <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5">
            {(['all', 'main', 'sme'] as FilterType[]).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`text-[11.5px] font-semibold py-1 px-3 rounded-md transition-all ${
                  filter === type
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-ink3 hover:text-foreground'
                }`}
              >
                {type === 'all' ? 'All' : type === 'main' ? 'Mainboard' : 'SME'}
              </button>
            ))}
          </div>
          <Link href="/listed" className="text-[12.5px] font-semibold text-primary-mid hover:opacity-75 transition-opacity">
            View All
          </Link>
        </div>
      </div>

      {/* IPO Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredIPOs.map((ipo) => (
          <IPOCard key={ipo.id} ipo={ipo} />
        ))}
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap gap-3 mt-3 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald"></span>
          <span className="text-ink3">Listing Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary"></span>
          <span className="text-ink3">Allotment Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gold"></span>
          <span className="text-ink3">Last Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cobalt"></span>
          <span className="text-ink3">Open</span>
        </div>
      </div>
    </section>
  );
}
