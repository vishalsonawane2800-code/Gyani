'use client';

import { create } from 'zustand';

interface ListedFiltersState {
  year: string;
  exchange: string;
  gainFilter: string;
  search: string;
  sort: string;
  setYear: (year: string) => void;
  setExchange: (exchange: string) => void;
  setGainFilter: (filter: string) => void;
  setSearch: (search: string) => void;
  setSort: (sort: string) => void;
}

export const useListedFilters = create<ListedFiltersState>((set) => ({
  year: 'all',
  exchange: 'all',
  gainFilter: 'all',
  search: '',
  sort: 'date-desc',
  setYear: (year) => set({ year }),
  setExchange: (exchange) => set({ exchange }),
  setGainFilter: (gainFilter) => set({ gainFilter }),
  setSearch: (search) => set({ search }),
  setSort: (sort) => set({ sort }),
}));
