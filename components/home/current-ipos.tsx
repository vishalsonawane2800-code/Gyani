'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IPOCard } from '@/components/ipo-card';

type FilterType = 'all' | 'main' | 'sme';

// Priority order for IPO status within each group
const statusPriority: Record<string, number> = {
  listing: 5,
  allot: 4,
  lastday: 3,
  open: 2,
  closed: 1,
  upcoming: 0,
};

// Live / applicable IPOs — investors can still place bids
const liveStatuses: string[] = ['open', 'lastday'];
// Closed for bidding but not yet listed — awaiting allotment / listing
// (IPOs stay here until the day after listing when the cron migrates them
// into the listed_ipos table.)
const awaitingStatuses: string[] = ['closed', 'allot', 'listing'];
// All IPOs currently in an active cycle
const currentStatuses: string[] = [...liveStatuses, ...awaitingStatuses];
// When nothing is in an active cycle, fall back to upcoming so the section
// is never blank between IPO cycles.
const upcomingStatuses: string[] = ['upcoming'];

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

function sortByStatus(list: IPO[]): IPO[] {
  return [...list].sort(
    (a, b) => (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0)
  );
}

function applyExchangeFilter(list: IPO[], filter: FilterType): IPO[] {
  return list.filter((ipo) => {
    if (filter === 'all') return true;
    if (filter === 'main')
      return ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT';
    if (filter === 'sme')
      return ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
    return true;
  });
}

export function CurrentIPOs({ ipos }: CurrentIPOsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  // Partition by lifecycle stage
  const currentIPOs = ipos.filter((ipo) => currentStatuses.includes(ipo.status));
  const upcomingIPOs = ipos.filter((ipo) =>
    upcomingStatuses.includes(ipo.status)
  );

  const hasCurrent = currentIPOs.length > 0;

  // Live group: applicable IPOs always on top
  const liveIPOs = sortByStatus(
    currentIPOs.filter((ipo) => liveStatuses.includes(ipo.status))
  );
  // Awaiting group: closed bidding → allot → listing, shown below live
  const awaitingIPOs = sortByStatus(
    currentIPOs.filter((ipo) => awaitingStatuses.includes(ipo.status))
  );

  // Apply Mainboard / SME filter per group
  const filteredLive = applyExchangeFilter(liveIPOs, filter);
  const filteredAwaiting = applyExchangeFilter(awaitingIPOs, filter);
  const filteredUpcoming = applyExchangeFilter(
    sortByStatus(upcomingIPOs),
    filter
  );

  const totalFiltered = hasCurrent
    ? filteredLive.length + filteredAwaiting.length + filteredUpcoming.length
    : filteredUpcoming.length;

  const activeCount = hasCurrent ? currentIPOs.length : upcomingIPOs.length;
  const headingLabel = hasCurrent ? 'Current IPO' : 'Upcoming IPOs';
  const countPillLabel = hasCurrent ? 'Active' : 'Upcoming';
  const countPillClass = hasCurrent
    ? 'bg-emerald-bg text-emerald'
    : 'bg-primary-bg text-primary';

  return (
    <section id="current" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold">{headingLabel}</h2>
          <span
            className={`text-xs font-extrabold py-1 px-3 rounded-full ${countPillClass}`}
          >
            {activeCount} {countPillLabel}
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
      {totalFiltered > 0 ? (
        hasCurrent ? (
          <div className="flex flex-col gap-6">
            {/* Live / applicable IPOs */}
            {filteredLive.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald" />
                  <h3 className="text-sm font-bold text-ink">
                    Live &amp; Applicable
                  </h3>
                  <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-emerald-bg text-emerald">
                    {filteredLive.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredLive.map((ipo) => (
                    <IPOCard key={ipo.id} ipo={ipo} />
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting allotment / listing */}
            {filteredAwaiting.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-sm font-bold text-ink">
                    Awaiting Allotment &amp; Listing
                  </h3>
                  <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-primary-bg text-primary">
                    {filteredAwaiting.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAwaiting.map((ipo) => (
                    <IPOCard key={ipo.id} ipo={ipo} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming IPOs — shown below the active cycle so investors
                can still see what's coming next without leaving the home
                page. */}
            {filteredUpcoming.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-gold" />
                  <h3 className="text-sm font-bold text-ink">Upcoming IPOs</h3>
                  <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-gold-bg text-gold">
                    {filteredUpcoming.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredUpcoming.map((ipo) => (
                    <IPOCard key={ipo.id} ipo={ipo} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredUpcoming.map((ipo) => (
              <IPOCard key={ipo.id} ipo={ipo} />
            ))}
          </div>
        )
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-ink2">
            No {hasCurrent ? 'active' : 'upcoming'} IPOs right now.
          </p>
          <p className="text-[12.5px] text-ink3 mt-1">
            Add IPOs from the admin panel and they will appear here.
          </p>
        </div>
      )}

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
