'use client';

import { tickerData } from '@/lib/data';

export function Ticker() {
  // Duplicate for seamless loop
  const items = [...tickerData, ...tickerData];

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
