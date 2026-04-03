/**
 * Apsis Aerocom IPO - Listed March 2026
 * 
 * This is an example of a detailed listed IPO data file.
 * Copy this structure for other IPOs.
 */

import type { ListedIPODetail } from '../index';

export const apsisAerocomIPO: ListedIPODetail = {
  // Basic info (required)
  id: 1,
  name: 'Apsis Aerocom',
  slug: 'apsis-aerocom-ipo',
  abbr: 'AA',
  bgColor: '#f0fdf4',
  fgColor: '#14532d',
  exchange: 'NSE SME',
  sector: 'Aerospace',
  year: '2026',
  
  // Listing details (required)
  listDate: '2026-03-18',
  issuePrice: 110,
  listPrice: 153,
  gainPct: 39.1,
  subTimes: 129.41,
  gmpPeak: '+42',
  aiPred: '+36.4%',
  aiErr: 2.7,
  
  // Extended details (optional - fill as you gather data)
  aboutCompany: 'Apsis Aerocom is an aerospace components manufacturer specializing in precision-engineered parts for commercial and defense aircraft.',
  priceMin: 105,
  priceMax: 110,
  lotSize: 1200,
  issueSize: '24.5 Cr',
  freshIssue: '24.5 Cr (100%)',
  ofs: 'Nil',
  registrar: 'Link Intime India',
  leadManager: 'Hem Securities',
  marketCap: '~98 Cr',
  peRatio: 24.6,
  finalGmp: 42,
  
  // Final subscription data
  finalSubscription: {
    retail: '156.8x',
    nii: '112.4x',
    qib: '98.2x',
    total: 129.41,
  },
  
  // Financials (fill with actual data)
  financials: {
    revenue: { fy23: 18.2, fy24: 24.6, fy25: 32.1 },
    pat: { fy23: 2.4, fy24: 3.2, fy25: 4.1 },
    ebitda: { fy23: 3.6, fy24: 4.8, fy25: 6.2 },
    roe: 19.8,
    roce: 17.2,
    debtEquity: 0.38,
  },
  
  // Historical GMP data (from scraping)
  gmpHistory: [
    { date: '2026-03-18', gmp: 43, source: 'IPOWatch' },
    { date: '2026-03-17', gmp: 42, source: 'IPOWatch' },
    { date: '2026-03-16', gmp: 40, source: 'InvestorGain' },
    { date: '2026-03-15', gmp: 38, source: 'IPOWatch' },
    { date: '2026-03-14', gmp: 35, source: 'IPOWatch' },
  ],
  
  // Historical subscription data
  subscriptionHistory: [
    { date: '2026-03-15', retail: 156.8, nii: 112.4, qib: 98.2, total: 129.41 },
    { date: '2026-03-14', retail: 82.4, nii: 58.2, qib: 45.6, total: 65.8 },
    { date: '2026-03-13', retail: 35.2, nii: 24.1, qib: 18.4, total: 28.2 },
  ],
};

export default apsisAerocomIPO;
