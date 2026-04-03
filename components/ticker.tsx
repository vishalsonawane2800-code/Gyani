'use client';

import { tickerData } from '@/lib/data';

export function Ticker() {
  // Duplicate for seamless loop
  const items = [...tickerData, ...tickerData];

  return (
    <div className="bg-ink overflow-hidden whitespace-nowrap py-1.5 border-b border-white/5 relative z-[700]">
      <div className="inline-flex animate-ticker hover:[animation-play-state:paused]">
        {items.map((item, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-2 px-6 border-r border-white/10 text-[11.5px]"
          >
            <span className="text-white/50 font-medium">{item.name}</span>
            <span className="font-bold text-emerald-mid">+{item.gmp}</span>
            <span
              className="text-[9.5px] font-bold px-2 py-0.5 rounded-full"
              style={{ 
                backgroundColor: `${item.color}22`, 
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
