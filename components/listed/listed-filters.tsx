'use client';

import { Search } from 'lucide-react';
import { useListedFilters } from '@/hooks/use-listed-filters';

export function ListedFilters() {
  const { 
    year, setYear, 
    exchange, setExchange, 
    gainFilter, setGainFilter,
    search, setSearch,
    sort, setSort 
  } = useListedFilters();

  const years = ['all', '2026', '2025', '2024', '2023', '2022', '2021'];
  const exchanges = ['all', 'BSE SME', 'NSE SME', 'Mainboard'];
  const gains = [
    { value: 'all', label: 'All' },
    { value: 'above20', label: '+20%+' },
    { value: 'above10', label: '+10%+' },
    { value: 'positive', label: 'Positive' },
    { value: 'negative', label: 'Negative' },
  ];

  return (
    <div className="mb-6">
      {/* Year Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink4">Year:</span>
        <div className="flex gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-all ${
                year === y
                  ? 'bg-primary text-white'
                  : 'bg-secondary text-ink3 hover:bg-border'
              }`}
            >
              {y === 'all' ? 'All Years' : y}
            </button>
          ))}
        </div>
        

      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-3 py-3 px-4 bg-card border border-border rounded-xl">
        {/* Exchange */}
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink4">Exchange:</span>
        <div className="flex gap-1">
          {exchanges.map((ex) => (
            <button
              key={ex}
              onClick={() => setExchange(ex)}
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                exchange === ex
                  ? 'bg-primary-bg text-primary'
                  : 'text-ink3 hover:bg-secondary'
              }`}
            >
              {ex === 'all' ? 'All' : ex}
            </button>
          ))}
        </div>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Gain */}
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink4">Gain:</span>
        <div className="flex gap-1">
          {gains.map((g) => (
            <button
              key={g.value}
              onClick={() => setGainFilter(g.value)}
              className={`text-[11.5px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                gainFilter === g.value
                  ? 'bg-primary-bg text-primary'
                  : 'text-ink3 hover:bg-secondary'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-secondary border border-border rounded-lg px-3 py-1.5 flex-1 min-w-[180px] max-w-[280px] ml-auto">
          <Search className="w-3.5 h-3.5 text-ink4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, sector..."
            className="flex-1 bg-transparent border-none outline-none text-[12.5px] text-foreground placeholder:text-ink4"
          />
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-border bg-card text-ink2 outline-none cursor-pointer"
        >
          <option value="date-desc">Newest First</option>
          <option value="date-asc">Oldest First</option>
          <option value="gain-desc">Highest Gain</option>
          <option value="gain-asc">Lowest Gain</option>
          <option value="sub-desc">Most Subscribed</option>
          <option value="alpha">A-Z</option>
        </select>
      </div>
    </div>
  );
}
