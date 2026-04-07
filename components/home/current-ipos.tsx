'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { IPOCard } from '@/components/ipo-card';
import { supabase } from '@/lib/supabase';
import type { IPOStatus } from '@/lib/data';

type FilterType = 'all' | 'main' | 'sme';

// Priority order for IPO status
const statusPriority: Record<IPOStatus, number> = {
  listing: 5,
  allot: 4,
  lastday: 3,
  open: 2,
  upcoming: 1,
  closed: 0,
};

// Only show open IPOs
const openStatuses: IPOStatus[] = ['open', 'lastday', 'allot', 'listing'];

export function CurrentIPOs() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [currentIPOs, setCurrentIPOs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch IPOs from Supabase
  useEffect(() => {
    const fetchIPOs = async () => {
const { data, error } = await supabase
  .from("ipos")
  .select(`
    *,
    gmp_history (gmp, recorded_at)
  `);

if (error) {
  console.error("Error fetching IPOs:", error);
} else {
  const formattedData = (data || []).map((ipo: any) => {
    const gmpHistory = ipo.gmp_history || [];

    // Get latest GMP
    const latestGMP =
      gmpHistory.length > 0
        ? gmpHistory.sort(
            (a: any, b: any) =>
              new Date(b.recorded_at).getTime() -
              new Date(a.recorded_at).getTime()
          )[0].gmp
        : null;

    return {
      ...ipo,
      gmp: latestGMP,
    };
  });

  setCurrentIPOs(formattedData);
}
      }

      setLoading(false);
    };

    fetchIPOs();
  }, []);

  // Filter only open IPOs and sort by priority
  const openIPOs = currentIPOs.filter((ipo) =>
    openStatuses.includes(ipo.status)
  );

  const sortedIPOs = [...openIPOs].sort((a, b) => {
    return statusPriority[b.status] - statusPriority[a.status];
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

  // Loading state
  if (loading) {
    return <div className="mb-7">Loading IPOs...</div>;
  }

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
            className="text-[12.5px] font-semibold text-primary hover:opacity-75 transition-opacity"
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
