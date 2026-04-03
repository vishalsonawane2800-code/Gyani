'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function CurrentIPOs() {
  const [filter, setFilter] = useState<FilterType>('all');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Sort IPOs by status priority (most urgent first)
  const sortedIPOs = [...currentIPOs].sort((a, b) => {
    return statusPriority[b.status] - statusPriority[a.status];
  });

  const filteredIPOs = sortedIPOs.filter((ipo) => {
    if (filter === 'all') return true;
    if (filter === 'main') return ipo.exchange === 'Mainboard' || ipo.exchange === 'REIT';
    if (filter === 'sme') return ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
    return true;
  });

  const activeCount = currentIPOs.filter(ipo => ipo.status !== 'closed').length;

  const checkScrollButtons = () => {
    const container = scrollContainerRef.current;
    if (container) {
      setCanScrollLeft(container.scrollLeft > 0);
      setCanScrollRight(
        container.scrollLeft < container.scrollWidth - container.clientWidth - 10
      );
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollButtons);
      checkScrollButtons();
      return () => container.removeEventListener('scroll', checkScrollButtons);
    }
  }, [filteredIPOs]);

  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (container) {
      const scrollAmount = 340; // Card width + gap
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

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

      {/* Scrollable IPO Cards - Auto scrolls with most urgent on top */}
      <div className="relative">
        {/* Left Scroll Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card border border-border rounded-full shadow-md flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3.5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {filteredIPOs.map((ipo) => (
            <div key={ipo.id} className="min-w-[320px] max-w-[320px]">
              <IPOCard ipo={ipo} />
            </div>
          ))}
        </div>

        {/* Right Scroll Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-card border border-border rounded-full shadow-md flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
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
