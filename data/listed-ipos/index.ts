/**
 * Listed IPOs Data Folder
 * 
 * This folder contains data for all previously listed IPOs.
 * You can add individual IPO data files here and import them.
 * 
 * Structure:
 * - data/listed-ipos/index.ts (this file - exports all listed IPOs)
 * - data/listed-ipos/2026/*.ts (IPOs listed in 2026)
 * - data/listed-ipos/2025/*.ts (IPOs listed in 2025)
 * - data/listed-ipos/2024/*.ts (IPOs listed in 2024)
 * 
 * Each IPO file should export an object matching the ListedIPODetail interface.
 */

import type { ListedIPO } from '@/lib/data';

// Re-export all listed IPOs from main data file for now
// As you add individual IPO detail files, you can import and merge them here
export { listedIPOs } from '@/lib/data';

// Type for detailed IPO pages (extends basic ListedIPO)
export interface ListedIPODetail extends ListedIPO {
  // Additional fields for detailed pages
  aboutCompany?: string;
  priceMin?: number;
  priceMax?: number;
  lotSize?: number;
  issueSize?: string;
  freshIssue?: string;
  ofs?: string;
  registrar?: string;
  leadManager?: string;
  marketCap?: string;
  peRatio?: number;
  finalGmp?: number;
  finalSubscription?: {
    retail: string;
    nii: string;
    qib: string;
    total: number;
  };
  financials?: {
    revenue: { fy23: number; fy24: number; fy25: number };
    pat: { fy23: number; fy24: number; fy25: number };
    ebitda: { fy23: number; fy24: number; fy25: number };
    roe: number;
    roce: number;
    debtEquity: number;
  };
  gmpHistory?: Array<{
    date: string;
    gmp: number;
    source: string;
  }>;
  subscriptionHistory?: Array<{
    date: string;
    retail: number;
    nii: number;
    qib: number;
    total: number;
  }>;
}

// Example: How to add a new listed IPO detail
/*
// Create file: data/listed-ipos/2026/apsis-aerocom.ts

import type { ListedIPODetail } from '../index';

export const apsisAerocomIPO: ListedIPODetail = {
  id: 1,
  name: 'Apsis Aerocom',
  slug: 'apsis-aerocom-ipo',
  abbr: 'AA',
  bgColor: '#f0fdf4',
  fgColor: '#14532d',
  exchange: 'NSE SME',
  sector: 'Aerospace',
  listDate: '2026-03-18',
  issuePrice: 110,
  listPrice: 153,
  gainPct: 39.1,
  subTimes: 129.41,
  gmpPeak: '+42',
  aiPred: '+36.4%',
  aiErr: 2.7,
  year: '2026',
  // ... additional detail fields
};
*/
