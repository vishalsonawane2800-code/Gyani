'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IPOCard } from '@/components/ipo-card';
import { currentIPOs } from '@/lib/data';

type FilterType = 'all' | 'main' | 'sme';

export function CurrentIPOs() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredIPOs = currentIPOs.filter((ipo) => {
    if (filter === 'all') return true;
    if (filter === 'main') return ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT';
    if (filter === 'sme') return ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
    return true;
  });

  const activeCount = currentIPOs.filter(ipo => ipo.status !== 'closed').length;

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

      {/* IPO Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-3.5">
        {filteredIPOs.map((ipo) => (
          <IPOCard key={ipo.id} ipo={ipo} />
        ))}
      </div>
    </section>
  );
}
