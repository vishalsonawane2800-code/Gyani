'use client';

import { useState, useEffect } from 'react';
import { currentIPOs } from '@/lib/data';

const statusNodes = [
  { id: 'open', label: 'Open Soon', sub: 'Next 3 days', dotClass: 'bg-cobalt-mid shadow-[0_0_0_3px_rgba(59,130,246,.2)]' },
  { id: 'lastday', label: 'Last Day', sub: 'Closes today', dotClass: 'bg-gold-mid shadow-[0_0_0_3px_rgba(245,158,11,.2)] animate-pulse' },
  { id: 'allot', label: 'Allotment', sub: 'Today', dotClass: 'bg-primary-mid shadow-[0_0_0_3px_rgba(124,58,237,.2)]' },
  { id: 'listing', label: 'Listing', sub: 'Today', dotClass: 'bg-emerald-mid shadow-[0_0_0_3px_rgba(0,179,119,.2)] animate-pulse' },
];

export function StatusBar() {
  const [gmpTimer, setGmpTimer] = useState(900); // 15 minutes

  useEffect(() => {
    const interval = setInterval(() => {
      setGmpTimer((prev) => (prev > 0 ? prev - 1 : 900));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Count IPOs by status
  const getCounts = () => {
    const counts: Record<string, number> = { open: 0, lastday: 0, allot: 0, listing: 0 };
    currentIPOs.forEach((ipo) => {
      if (ipo.status === 'upcoming') counts.open++;
      else if (counts[ipo.status] !== undefined) counts[ipo.status]++;
    });
    return counts;
  };

  const counts = getCounts();

  return (
    <div className="bg-card border-b-2 border-border px-5">
      <div className="max-w-[1440px] mx-auto flex items-center h-14">
        {/* Label */}
        <span className="text-[10.5px] font-extrabold tracking-wider uppercase text-ink4 whitespace-nowrap pr-5 border-r-[1.5px] border-border shrink-0 hidden sm:block">
          IPO Status
        </span>

        {/* Status Track */}
        <div className="flex items-stretch flex-1 overflow-x-auto">
          {statusNodes.map((node) => (
            <button
              key={node.id}
              className="flex flex-col items-center justify-center px-4 md:px-6 cursor-pointer transition-colors border-r border-border last:border-r-0 hover:bg-background shrink-0 gap-0.5"
            >
              <div className={`w-2.5 h-2.5 rounded-full mb-0.5 ${node.dotClass}`} />
              <div className="font-[family-name:var(--font-sora)] text-lg font-extrabold leading-none">
                {counts[node.id] || 0}
              </div>
              <div className="text-[10px] font-semibold text-ink3 tracking-tight">{node.label}</div>
              <div className="text-[9px] text-ink4 font-medium">{node.sub}</div>
            </button>
          ))}
        </div>

        {/* Right Stats */}
        <div className="hidden md:flex items-center gap-4 pl-5 border-l-[1.5px] border-border shrink-0">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink4">GMP In</div>
            <div className="font-[family-name:var(--font-sora)] text-base font-extrabold text-primary-mid">
              {formatTimer(gmpTimer)}
            </div>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-ink4">AI Accuracy</div>
            <div className="font-[family-name:var(--font-sora)] text-base font-extrabold text-emerald">
              94%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
