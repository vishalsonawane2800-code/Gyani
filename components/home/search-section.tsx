'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

const quickTags = [
  'IPO GMP Today',
  'Upcoming IPO 2026',
  'SME IPO GMP',
  'IPO Listing Gain',
  'Allotment Status',
  'Best IPO to Apply',
];

export function SearchSection() {
  const [query, setQuery] = useState('');

  return (
    <div className="mb-7">
      {/* Search Bar */}
      <div className="flex bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(79,70,229,.1)] transition-all">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search IPO by name, GMP, sector... e.g. 'Fractal Analytics IPO GMP'"
          className="flex-1 border-none outline-none py-3 px-4 text-sm text-foreground placeholder:text-ink4 bg-transparent"
          maxLength={120}
          autoComplete="off"
          spellCheck="false"
        />
        <button className="bg-primary text-white text-[13px] font-bold px-6 shrink-0 flex items-center gap-2 transition-opacity hover:opacity-90">
          <Search className="w-4 h-4" />
          Search
        </button>
      </div>

      {/* Quick Tags */}
      <div className="flex gap-2 flex-wrap mt-2.5">
        {quickTags.map((tag) => (
          <button
            key={tag}
            onClick={() => setQuery(tag)}
            className="text-[11.5px] text-ink3 py-1 px-3 rounded-full border border-border cursor-pointer transition-all hover:border-primary hover:text-primary hover:bg-primary-bg"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
