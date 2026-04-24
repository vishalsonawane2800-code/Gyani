'use client';

import { useEffect, useState } from 'react';
import type { IPO } from '@/lib/data';

interface TickerItem {
  name: string;
  gmp: string;
  tag: string;
  color: string;
  isZero: boolean;
}

function formatGMP(gmp: number): string {
  if (gmp === 0) return 'Rs 0';
  if (gmp > 0) {
    return gmp >= 1000 ? `+Rs ${(gmp / 1000).toFixed(1)}K` : `+Rs ${gmp}`;
  }
  return gmp >= 1000 ? `-Rs ${Math.abs(gmp / 1000).toFixed(1)}K` : `-Rs ${Math.abs(gmp)}`;
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open': return 'Open';
    case 'lastday': return 'Last Day';
    case 'closed': return 'Awaiting Allot';
    case 'allot': return 'Awaiting Listing';
    case 'listing': return 'Listing';
    case 'upcoming': return 'Upcoming';
    default: return status;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return '#1d4ed8';
    case 'lastday': return '#f59e0b';
    case 'listing': return '#00b377';
    case 'upcoming': return '#7c84a8';
    case 'allot': return '#7c3aed';
    default: return '#666';
  }
}

export function Ticker() {
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Fetch current and upcoming IPOs from Supabase
    const fetchIPOs = async () => {
      try {
        const response = await fetch('/api/public/ipos-for-ticker');
        if (!response.ok) throw new Error('Failed to fetch IPOs');
        
        const { currentIPOs, upcomingIPOs } = await response.json() as {
          currentIPOs: IPO[];
          upcomingIPOs: IPO[];
        };

        // Combine current and upcoming IPOs
        const allIPOs = [...currentIPOs, ...upcomingIPOs];

        // Convert to ticker format
        const items: TickerItem[] = allIPOs.map((ipo) => ({
          name: ipo.name,
          gmp: formatGMP(ipo.gmp),
          tag: getStatusLabel(ipo.status),
          color: getStatusColor(ipo.status),
          isZero: ipo.gmp === 0,
        }));

        setTickerItems(items.length > 0 ? items : getFallbackItems());
      } catch (error) {
        console.error('[v0] Failed to fetch ticker data:', error);
        // Fall back to empty state - pages still render, just no ticker items
        setTickerItems([]);
      }
    };

    fetchIPOs();
  }, []);

  if (!mounted || tickerItems.length === 0) {
    // Still render the container but empty, so layout doesn't shift
    return (
      <div className="bg-card border-b border-border overflow-hidden whitespace-nowrap py-2 relative z-[700]">
        <div className="inline-flex animate-ticker hover:[animation-play-state:paused]">
          <span className="inline-flex items-center gap-2 px-6 border-r border-border text-[11.5px] text-ink3">
            Loading market data...
          </span>
        </div>
      </div>
    );
  }

  // Duplicate for seamless loop
  const items = [...tickerItems, ...tickerItems];

  return (
    <div className="bg-card border-b border-border overflow-hidden whitespace-nowrap py-2 relative z-[700]">
      <div className="inline-flex animate-ticker hover:[animation-play-state:paused]">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 px-6 border-r border-border text-[11.5px]"
          >
            <span className="text-ink3 font-medium">{item.name}</span>
            <span className={`font-bold ${item.isZero ? 'text-ink4' : 'text-emerald-mid'}`}>{item.gmp}</span>
            <span
              className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${item.color}15`, 
                color: item.color 
              }}
            >
              {item.tag}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// Fallback data if API is unavailable (for graceful degradation)
function getFallbackItems(): TickerItem[] {
  return [];
}
