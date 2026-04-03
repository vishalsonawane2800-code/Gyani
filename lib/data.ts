// IPO Data Types and Mock Data for IPOGyani

export type IPOStatus = 'open' | 'lastday' | 'allot' | 'listing' | 'upcoming' | 'closed';
export type ExchangeType = 'BSE SME' | 'NSE SME' | 'Mainboard' | 'REIT';
export type SentimentLabel = 'Bullish' | 'Neutral' | 'Bearish';

export interface GMPHistoryEntry {
  date: string;
  gmp: number;
  gmpPercent: number;
  source: string;
}

export interface SubscriptionHistoryEntry {
  date: string;
  time: string;
  retail: number;
  nii: number;
  qib: number;
  total: number;
}

export interface ExpertReview {
  id: string;
  source: string;
  sourceType: 'youtube' | 'analyst' | 'news' | 'firm';
  author: string;
  summary: string; // 2 line summary
  sentiment: 'positive' | 'neutral' | 'negative';
  url?: string;
  logoUrl?: string;
  createdAt: string;
}

export interface PeerCompany {
  name: string;
  marketCap: number; // in Cr
  revenue: number; // in Cr
  pat: number; // in Cr
  peRatio: number;
  pbRatio: number;
  roe: number;
}

export interface IPO {
  id: number;
  name: string;
  slug: string;
  abbr: string;
  bgColor: string;
  fgColor: string;
  exchange: ExchangeType;
  sector: string;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listDate: string;
  priceMin: number;
  priceMax: number;
  lotSize: number;
  issueSize: string;
  issueSizeCr: number;
  freshIssue: string;
  ofs: string;
  gmp: number;
  gmpPercent: number;
  gmpLastUpdated: string;
  estListPrice: number;
  subscription: {
    total: number;
    retail: string;
    nii: string;
    qib: string;
    day: number;
    isFinal: boolean;
  };
  aiPrediction: number;
  aiConfidence: number;
  sentimentScore: number;
  sentimentLabel: SentimentLabel;
  status: IPOStatus;
  registrar: string;
  leadManager: string;
  marketCap: string;
  peRatio: number;
  aboutCompany: string;
  financials?: {
    revenue: { fy23: number; fy24: number; fy25: number };
    pat: { fy23: number; fy24: number; fy25: number };
    ebitda: { fy23: number; fy24: number; fy25: number };
    roe: number;
    roce: number;
    debtEquity: number;
  };
  // New fields for scraped data storage
  gmpHistory?: GMPHistoryEntry[];
  subscriptionHistory?: SubscriptionHistoryEntry[];
  expertReviews?: ExpertReview[];
  peerCompanies?: PeerCompany[];
}

export interface ListedIPO {
  id: number;
  name: string;
  slug: string;
  abbr: string;
  bgColor: string;
  fgColor: string;
  exchange: ExchangeType;
  sector: string;
  listDate: string;
  issuePrice: number;
  listPrice: number;
  gainPct: number;
  subTimes: number;
  gmpPeak: string;
  aiPred: string;
  aiErr: number;
  year: string;
}

// Current/Upcoming IPOs
export const currentIPOs: IPO[] = [
  {
    id: 1,
    name: 'Emiac Technologies',
    slug: 'emiac-technologies-ipo',
    abbr: 'ET',
    bgColor: '#f0f9ff',
    fgColor: '#0369a1',
    exchange: 'BSE SME',
    sector: 'Electronics / Semiconductor',
    openDate: '2026-03-27',
    closeDate: '2026-04-08',
    allotmentDate: '2026-04-09',
    listDate: '2026-04-11',
    priceMin: 93,
    priceMax: 98,
    lotSize: 1200,
    issueSize: '31.75 Cr',
    issueSizeCr: 31.75,
    freshIssue: '31.75 Cr (100%)',
    ofs: 'Nil',
    gmp: 12,
    gmpPercent: 12.2,
    gmpLastUpdated: '2026-04-03T14:30:00',
    estListPrice: 110,
    subscription: { total: 0.21, retail: '0.18x', nii: '0.24x', qib: '0.22x', day: 3, isFinal: false },
    aiPrediction: 14.2,
    aiConfidence: 68,
    sentimentScore: 62,
    sentimentLabel: 'Neutral',
    status: 'lastday',
    registrar: 'Link Intime India',
    leadManager: 'Ekadrisht Capital',
    marketCap: '~127 Cr',
    peRatio: 22.4,
    aboutCompany: 'Emiac Technologies Ltd manufactures electronic components, PCB assemblies, and microcontroller-based systems for industrial automation and IoT sectors. Founded in 2015 and headquartered in Pune, the company has grown its revenue from Rs 12 Cr (FY22) to Rs 38 Cr (FY25).',
    financials: {
      revenue: { fy23: 22.4, fy24: 30.1, fy25: 38.2 },
      pat: { fy23: 2.1, fy24: 3.4, fy25: 4.3 },
      ebitda: { fy23: 3.2, fy24: 4.8, fy25: 6.1 },
      roe: 21.4,
      roce: 18.9,
      debtEquity: 0.42,
    },
    gmpHistory: [
      { date: '2026-04-03', gmp: 12, gmpPercent: 12.2, source: 'IPOWatch' },
      { date: '2026-04-02', gmp: 10, gmpPercent: 10.2, source: 'IPOWatch' },
      { date: '2026-04-01', gmp: 8, gmpPercent: 8.2, source: 'InvestorGain' },
      { date: '2026-03-31', gmp: 6, gmpPercent: 6.1, source: 'IPOWatch' },
      { date: '2026-03-30', gmp: 5, gmpPercent: 5.1, source: 'IPOWatch' },
    ],
    subscriptionHistory: [
      { date: '2026-04-03', time: '17:00', retail: 0.18, nii: 0.24, qib: 0.22, total: 0.21 },
      { date: '2026-04-02', time: '17:00', retail: 0.12, nii: 0.15, qib: 0.10, total: 0.12 },
      { date: '2026-04-01', time: '17:00', retail: 0.05, nii: 0.08, qib: 0.04, total: 0.05 },
    ],
    expertReviews: [
      { id: '1', source: 'PR Sundar', sourceType: 'youtube', author: 'PR Sundar', summary: 'Good IPO with decent valuations. Company has strong fundamentals in semiconductor space with growing revenue trajectory.', sentiment: 'positive', createdAt: '2026-04-02' },
      { id: '2', source: 'CA Rachana Ranade', sourceType: 'youtube', author: 'CA Rachana Ranade', summary: 'Moderately priced IPO. Recommend subscribing for long-term investors. Short-term gains may be limited.', sentiment: 'neutral', createdAt: '2026-04-01' },
      { id: '3', source: 'Moneycontrol', sourceType: 'news', author: 'Moneycontrol Research', summary: 'Emiac shows promise in IoT sector but faces stiff competition. Valuations are fair for the sector.', sentiment: 'neutral', createdAt: '2026-04-02' },
      { id: '4', source: 'ICICI Direct', sourceType: 'firm', author: 'ICICI Direct Research', summary: 'Subscribe rating. Company has shown consistent growth. P/E is reasonable compared to peers.', sentiment: 'positive', createdAt: '2026-04-01' },
    ],
    peerCompanies: [
      { name: 'Dixon Technologies', marketCap: 48500, revenue: 12400, pat: 320, peRatio: 85.2, pbRatio: 12.4, roe: 18.2 },
      { name: 'Kaynes Technology', marketCap: 32200, revenue: 2100, pat: 145, peRatio: 112.5, pbRatio: 18.6, roe: 22.4 },
      { name: 'Amber Enterprises', marketCap: 18500, revenue: 8200, pat: 180, peRatio: 68.4, pbRatio: 8.2, roe: 14.6 },
    ],
  },
  {
    id: 2,
    name: 'PropShare Celestia REIT',
    slug: 'propshare-celestia-reit-ipo',
    abbr: 'PS',
    bgColor: '#fdf4ff',
    fgColor: '#7c3aed',
    exchange: 'Mainboard',
    sector: 'Real Estate / REIT',
    openDate: '2026-04-10',
    closeDate: '2026-04-16',
    allotmentDate: '2026-04-18',
    listDate: '2026-04-21',
    priceMin: 1000000,
    priceMax: 1050000,
    lotSize: 1,
    issueSize: '245 Cr',
    issueSizeCr: 245,
    freshIssue: '245 Cr',
    ofs: 'Nil',
    gmp: 8200,
    gmpPercent: 0.9,
    gmpLastUpdated: '2026-04-03T10:00:00',
    estListPrice: 1058200,
    subscription: { total: 0, retail: '-', nii: '-', qib: '-', day: 0, isFinal: false },
    aiPrediction: 0.9,
    aiConfidence: 52,
    sentimentScore: 58,
    sentimentLabel: 'Neutral',
    status: 'upcoming',
    registrar: 'KFin Technologies',
    leadManager: 'ICICI Securities',
    marketCap: '~850 Cr',
    peRatio: 0,
    aboutCompany: 'PropShare Celestia is a Real Estate Investment Trust focused on commercial office spaces in Tier-1 cities.',
    peerCompanies: [
      { name: 'Embassy REIT', marketCap: 32000, revenue: 3200, pat: 1200, peRatio: 0, pbRatio: 1.2, roe: 8.5 },
      { name: 'Mindspace REIT', marketCap: 18500, revenue: 2100, pat: 850, peRatio: 0, pbRatio: 1.1, roe: 7.8 },
      { name: 'Brookfield REIT', marketCap: 12200, revenue: 1450, pat: 580, peRatio: 0, pbRatio: 0.95, roe: 6.2 },
    ],
  },
  {
    id: 3,
    name: 'Highness Microelectronics',
    slug: 'highness-microelectronics-ipo',
    abbr: 'HM',
    bgColor: '#fffbeb',
    fgColor: '#92400e',
    exchange: 'BSE SME',
    sector: 'Semiconductors',
    openDate: '2026-03-24',
    closeDate: '2026-03-27',
    allotmentDate: '2026-03-28',
    listDate: '2026-03-31',
    priceMin: 114,
    priceMax: 120,
    lotSize: 1200,
    issueSize: '21.67 Cr',
    issueSizeCr: 21.67,
    freshIssue: '21.67 Cr (100%)',
    ofs: 'Nil',
    gmp: 17,
    gmpPercent: 14.2,
    gmpLastUpdated: '2026-04-03T12:00:00',
    estListPrice: 137,
    subscription: { total: 193.99, retail: '245.2x', nii: '186.4x', qib: '142.8x', day: 4, isFinal: true },
    aiPrediction: 16.8,
    aiConfidence: 79,
    sentimentScore: 74,
    sentimentLabel: 'Bullish',
    status: 'allot',
    registrar: 'Link Intime India',
    leadManager: 'Beeline Capital',
    marketCap: '~86 Cr',
    peRatio: 18.6,
    aboutCompany: 'Highness Microelectronics designs and manufactures semiconductor components for consumer electronics.',
    gmpHistory: [
      { date: '2026-04-03', gmp: 17, gmpPercent: 14.2, source: 'IPOWatch' },
      { date: '2026-04-02', gmp: 18, gmpPercent: 15.0, source: 'IPOWatch' },
      { date: '2026-04-01', gmp: 20, gmpPercent: 16.7, source: 'InvestorGain' },
      { date: '2026-03-31', gmp: 22, gmpPercent: 18.3, source: 'IPOWatch' },
      { date: '2026-03-30', gmp: 19, gmpPercent: 15.8, source: 'IPOWatch' },
    ],
    subscriptionHistory: [
      { date: '2026-03-27', time: '17:00', retail: 245.2, nii: 186.4, qib: 142.8, total: 193.99 },
      { date: '2026-03-26', time: '17:00', retail: 120.5, nii: 95.2, qib: 72.4, total: 98.2 },
      { date: '2026-03-25', time: '17:00', retail: 45.2, nii: 32.1, qib: 28.5, total: 35.8 },
      { date: '2026-03-24', time: '17:00', retail: 12.4, nii: 8.5, qib: 6.2, total: 9.2 },
    ],
    expertReviews: [
      { id: '1', source: 'Akshat Shrivastava', sourceType: 'youtube', author: 'Akshat Shrivastava', summary: 'Excellent growth potential in semiconductor space. Subscribe for long term. High subscription expected.', sentiment: 'positive', createdAt: '2026-03-25' },
      { id: '2', source: 'Economic Times', sourceType: 'news', author: 'ET Markets', summary: 'Strong retail interest expected. Company benefits from Make in India semiconductor push.', sentiment: 'positive', createdAt: '2026-03-24' },
    ],
    peerCompanies: [
      { name: 'Vedanta Semiconductors', marketCap: 85000, revenue: 12000, pat: 2400, peRatio: 35.4, pbRatio: 4.2, roe: 12.8 },
      { name: 'SPEL Semiconductor', marketCap: 2800, revenue: 180, pat: 25, peRatio: 112, pbRatio: 8.5, roe: 8.2 },
    ],
  },
  {
    id: 4,
    name: 'Powerica Limited',
    slug: 'powerica-limited-ipo',
    abbr: 'PW',
    bgColor: '#eff6ff',
    fgColor: '#1e40af',
    exchange: 'Mainboard',
    sector: 'Power / Energy',
    openDate: '2026-03-24',
    closeDate: '2026-03-27',
    allotmentDate: '2026-03-28',
    listDate: '2026-04-01',
    priceMin: 375,
    priceMax: 395,
    lotSize: 37,
    issueSize: '1,100 Cr',
    issueSizeCr: 1100,
    freshIssue: '800 Cr',
    ofs: '300 Cr',
    gmp: 4,
    gmpPercent: 1.0,
    gmpLastUpdated: '2026-04-03T16:00:00',
    estListPrice: 399,
    subscription: { total: 1.53, retail: '1.82x', nii: '1.24x', qib: '1.48x', day: 4, isFinal: true },
    aiPrediction: 2.1,
    aiConfidence: 58,
    sentimentScore: 54,
    sentimentLabel: 'Neutral',
    status: 'listing',
    registrar: 'KFin Technologies',
    leadManager: 'Axis Capital',
    marketCap: '~4,200 Cr',
    peRatio: 28.4,
    aboutCompany: 'Powerica Limited is a leading power generation company with operations across thermal and renewable energy.',
    gmpHistory: [
      { date: '2026-04-03', gmp: 4, gmpPercent: 1.0, source: 'IPOWatch' },
      { date: '2026-04-02', gmp: 6, gmpPercent: 1.5, source: 'IPOWatch' },
      { date: '2026-04-01', gmp: 8, gmpPercent: 2.0, source: 'InvestorGain' },
      { date: '2026-03-31', gmp: 10, gmpPercent: 2.5, source: 'IPOWatch' },
      { date: '2026-03-30', gmp: 12, gmpPercent: 3.0, source: 'IPOWatch' },
    ],
    subscriptionHistory: [
      { date: '2026-03-27', time: '17:00', retail: 1.82, nii: 1.24, qib: 1.48, total: 1.53 },
      { date: '2026-03-26', time: '17:00', retail: 0.95, nii: 0.65, qib: 0.82, total: 0.81 },
      { date: '2026-03-25', time: '17:00', retail: 0.42, nii: 0.28, qib: 0.35, total: 0.35 },
      { date: '2026-03-24', time: '17:00', retail: 0.15, nii: 0.10, qib: 0.12, total: 0.12 },
    ],
    expertReviews: [
      { id: '1', source: 'CNBC TV18', sourceType: 'news', author: 'CNBC Markets', summary: 'Fairly valued power sector IPO. Moderate returns expected. Good for conservative investors.', sentiment: 'neutral', createdAt: '2026-03-26' },
      { id: '2', source: 'Motilal Oswal', sourceType: 'firm', author: 'MOSL Research', summary: 'Neutral rating. Power sector facing headwinds. Subscribe only for long term portfolio.', sentiment: 'neutral', createdAt: '2026-03-25' },
    ],
    peerCompanies: [
      { name: 'NTPC Ltd', marketCap: 385000, revenue: 175000, pat: 18500, peRatio: 12.4, pbRatio: 1.8, roe: 14.2 },
      { name: 'Power Grid Corp', marketCap: 295000, revenue: 46000, pat: 15800, peRatio: 11.2, pbRatio: 2.1, roe: 18.5 },
      { name: 'Tata Power', marketCap: 142000, revenue: 58000, pat: 3200, peRatio: 28.6, pbRatio: 3.4, roe: 10.8 },
    ],
  },
];

// Upcoming IPOs (filtered from currentIPOs - mainboard and SME upcoming)
export const upcomingIPOs = currentIPOs.filter(ipo => ipo.status === 'upcoming' || ipo.status === 'open' || ipo.status === 'lastday');

// Shareholder Quota IPOs
export interface ShareholderQuotaIPO {
  id: number;
  name: string;
  slug: string;
  abbr: string;
  bgColor: string;
  fgColor: string;
  exchange: ExchangeType;
  sector: string;
  openDate: string;
  closeDate: string;
  allotmentDate: string;
  listDate: string;
  priceMin: number;
  priceMax: number;
  lotSize: number;
  issueSize: string;
  issueSizeCr: number;
  gmp?: number;
  gmpPercent?: number;
  status: IPOStatus;
  registrar: string;
  leadManager: string;
  aboutCompany: string;
}

export const shareholderQuotaIPOs: ShareholderQuotaIPO[] = [
  {
    id: 101,
    name: 'TechVision Solutions',
    slug: 'techvision-solutions-sq-ipo',
    abbr: 'TV',
    bgColor: '#f0f9ff',
    fgColor: '#0369a1',
    exchange: 'Mainboard',
    sector: 'Technology / IT Services',
    openDate: '2026-04-15',
    closeDate: '2026-04-20',
    allotmentDate: '2026-04-22',
    listDate: '2026-04-25',
    priceMin: 450,
    priceMax: 475,
    lotSize: 30,
    issueSize: '850 Cr',
    issueSizeCr: 850,
    status: 'upcoming',
    registrar: 'KFin Technologies',
    leadManager: 'Goldman Sachs India',
    aboutCompany: 'TechVision Solutions is a leading IT services company specializing in digital transformation and enterprise solutions for financial institutions.',
  },
  {
    id: 102,
    name: 'Global Logistics Ltd',
    slug: 'global-logistics-sq-ipo',
    abbr: 'GL',
    bgColor: '#fef2f2',
    fgColor: '#7c2d12',
    exchange: 'Mainboard',
    sector: 'Logistics / Supply Chain',
    openDate: '2026-05-10',
    closeDate: '2026-05-15',
    allotmentDate: '2026-05-17',
    listDate: '2026-05-20',
    priceMin: 280,
    priceMax: 310,
    lotSize: 48,
    issueSize: '620 Cr',
    issueSizeCr: 620,
    status: 'upcoming',
    registrar: 'Link Intime India',
    leadManager: 'Morgan Stanley',
    aboutCompany: 'Global Logistics Ltd operates a comprehensive supply chain network across India with focus on cold chain and specialized logistics.',
  },
  {
    id: 103,
    name: 'Heritage Financial Services',
    slug: 'heritage-financial-sq-ipo',
    abbr: 'HF',
    bgColor: '#fffbeb',
    fgColor: '#92400e',
    exchange: 'Mainboard',
    sector: 'Financial Services / NBFC',
    openDate: '2026-05-25',
    closeDate: '2026-05-30',
    allotmentDate: '2026-06-01',
    listDate: '2026-06-04',
    priceMin: 195,
    priceMax: 215,
    lotSize: 68,
    issueSize: '480 Cr',
    issueSizeCr: 480,
    status: 'upcoming',
    registrar: 'KFIN Technologies',
    leadManager: 'ICICI Securities',
    aboutCompany: 'Heritage Financial Services is a prominent NBFC providing retail lending, asset financing, and investment products to individual and corporate customers.',
  },
];

// Listed IPOs (historical data)
export const listedIPOs: ListedIPO[] = [
  { id: 1, name: 'Apsis Aerocom', abbr: 'AA', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'NSE SME', sector: 'Aerospace', listDate: '2026-03-18', issuePrice: 110, listPrice: 153, gainPct: 39.1, subTimes: 129.41, gmpPeak: '+42', aiPred: '+36.4%', aiErr: 2.7, year: '2026', slug: 'apsis-aerocom-ipo' },
  { id: 2, name: 'Innovision Limited', abbr: 'IV', bgColor: '#fef2f2', fgColor: '#991b1b', exchange: 'Mainboard', sector: 'Technology', listDate: '2026-03-23', issuePrice: 519, listPrice: 467.7, gainPct: -9.9, subTimes: 3.46, gmpPeak: '-52', aiPred: '-8.2%', aiErr: 1.7, year: '2026', slug: 'innovision-limited-ipo' },
  { id: 3, name: 'GSP Crop Science', abbr: 'GC', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'Mainboard', sector: 'Agri / Chemical', listDate: '2026-03-24', issuePrice: 320, listPrice: 328, gainPct: 2.5, subTimes: 1.64, gmpPeak: '+12', aiPred: '+3.1%', aiErr: 0.6, year: '2026', slug: 'gsp-crop-science-ipo' },
  { id: 4, name: 'Raajmarg Infra InvIT', abbr: 'RI', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'Mainboard', sector: 'Infrastructure', listDate: '2026-03-24', issuePrice: 100, listPrice: 107, gainPct: 7.0, subTimes: 13.74, gmpPeak: '+9', aiPred: '+6.8%', aiErr: 0.2, year: '2026', slug: 'raajmarg-infra-invit-ipo' },
  { id: 5, name: 'Stellar Pharma', abbr: 'SP', bgColor: '#fdf4ff', fgColor: '#7c3aed', exchange: 'BSE SME', sector: 'Pharma', listDate: '2026-03-06', issuePrice: 85, listPrice: 103.8, gainPct: 22.1, subTimes: 89.3, gmpPeak: '+21', aiPred: '+18.4%', aiErr: 3.7, year: '2026', slug: 'stellar-pharma-ipo' },
  { id: 6, name: 'Kiran Industries', abbr: 'KI', bgColor: '#fdf2f8', fgColor: '#9d174d', exchange: 'BSE SME', sector: 'Manufacturing', listDate: '2026-02-28', issuePrice: 64, listPrice: 71.2, gainPct: 11.3, subTimes: 76.8, gmpPeak: '+8', aiPred: '+9.7%', aiErr: 1.6, year: '2026', slug: 'kiran-industries-ipo' },
  { id: 7, name: 'Horizon Renewable', abbr: 'HR', bgColor: '#f0f9ff', fgColor: '#0369a1', exchange: 'Mainboard', sector: 'Renewable Energy', listDate: '2026-02-14', issuePrice: 224, listPrice: 260.3, gainPct: 16.2, subTimes: 24.6, gmpPeak: '+38', aiPred: '+14.9%', aiErr: 1.3, year: '2026', slug: 'horizon-renewable-ipo' },
  { id: 8, name: 'VentureTech SME', abbr: 'VT', bgColor: '#fffbeb', fgColor: '#92400e', exchange: 'BSE SME', sector: 'Technology', listDate: '2026-02-07', issuePrice: 142, listPrice: 182.6, gainPct: 28.6, subTimes: 94.2, gmpPeak: '+44', aiPred: '+31.2%', aiErr: 2.6, year: '2026', slug: 'venturetech-sme-ipo' },
  { id: 9, name: 'BlueStar EV', abbr: 'BE', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'NSE SME', sector: 'EV / Auto', listDate: '2025-12-26', issuePrice: 195, listPrice: 282.5, gainPct: 44.9, subTimes: 121.8, gmpPeak: '+88', aiPred: '+41.3%', aiErr: 3.5, year: '2025', slug: 'bluestar-ev-ipo' },
  { id: 10, name: 'Orbit Infra InvIT', abbr: 'OI', bgColor: '#f0f9ff', fgColor: '#0369a1', exchange: 'Mainboard', sector: 'Infrastructure', listDate: '2025-12-19', issuePrice: 100, listPrice: 108.1, gainPct: 8.1, subTimes: 10.8, gmpPeak: '+8', aiPred: '+7.6%', aiErr: 0.5, year: '2025', slug: 'orbit-infra-invit-ipo' },
  { id: 11, name: 'Zephyr Bio', abbr: 'ZB', bgColor: '#fdf4ff', fgColor: '#6b21a8', exchange: 'BSE SME', sector: 'Biotech', listDate: '2025-12-12', issuePrice: 96, listPrice: 109.2, gainPct: 13.8, subTimes: 77.5, gmpPeak: '+18', aiPred: '+16.2%', aiErr: 2.5, year: '2025', slug: 'zephyr-bio-ipo' },
  { id: 12, name: 'SwiftPay Fintech', abbr: 'SF', bgColor: '#fffbeb', fgColor: '#92400e', exchange: 'Mainboard', sector: 'Fintech', listDate: '2025-11-28', issuePrice: 315, listPrice: 353.4, gainPct: 12.2, subTimes: 18.3, gmpPeak: '+42', aiPred: '+11.4%', aiErr: 0.8, year: '2025', slug: 'swiftpay-fintech-ipo' },
  { id: 13, name: 'Clarity Diagnostics', abbr: 'CD', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'Mainboard', sector: 'Healthcare', listDate: '2025-01-31', issuePrice: 412, listPrice: 436.3, gainPct: 5.9, subTimes: 9.4, gmpPeak: '+28', aiPred: '+5.4%', aiErr: 0.5, year: '2025', slug: 'clarity-diagnostics-ipo' },
  { id: 14, name: 'Indra Solar', abbr: 'IS', bgColor: '#fef3c7', fgColor: '#92400e', exchange: 'NSE SME', sector: 'Solar Energy', listDate: '2025-01-24', issuePrice: 138, listPrice: 164.9, gainPct: 19.5, subTimes: 88.7, gmpPeak: '+34', aiPred: '+22.8%', aiErr: 3.3, year: '2025', slug: 'indra-solar-ipo' },
  { id: 15, name: 'BrightPath NBFC', abbr: 'BP', bgColor: '#fef2f2', fgColor: '#991b1b', exchange: 'Mainboard', sector: 'NBFC', listDate: '2025-01-17', issuePrice: 392, listPrice: 373.6, gainPct: -4.7, subTimes: 2.3, gmpPeak: '-18', aiPred: '-5.1%', aiErr: 0.4, year: '2025', slug: 'brightpath-nbfc-ipo' },
  { id: 16, name: 'KarmaEdge Fintech', abbr: 'KE', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'BSE SME', sector: 'Fintech', listDate: '2025-01-10', issuePrice: 58, listPrice: 64.1, gainPct: 10.5, subTimes: 84.2, gmpPeak: '+7', aiPred: '+8.9%', aiErr: 1.6, year: '2025', slug: 'karmaedge-fintech-ipo' },
  { id: 17, name: 'Maxima Agritech', abbr: 'MA', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'NSE SME', sector: 'Agritech', listDate: '2024-12-05', issuePrice: 76, listPrice: 71.1, gainPct: -6.4, subTimes: 22.6, gmpPeak: '-5', aiPred: '-1.8%', aiErr: 4.6, year: '2024', slug: 'maxima-agritech-ipo' },
  { id: 18, name: 'Navoday Cement', abbr: 'NC', bgColor: '#f5f3ff', fgColor: '#5b21b6', exchange: 'Mainboard', sector: 'Cement', listDate: '2024-01-03', issuePrice: 284, listPrice: 304.2, gainPct: 7.1, subTimes: 5.9, gmpPeak: '+22', aiPred: '+2.4%', aiErr: 4.7, year: '2024', slug: 'navoday-cement-ipo' },
  { id: 19, name: 'Sanjivani Agro', abbr: 'SA', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'NSE SME', sector: 'Agriculture', listDate: '2024-02-19', issuePrice: 96, listPrice: 98.7, gainPct: 2.8, subTimes: 62.1, gmpPeak: '+4', aiPred: '-3.2%', aiErr: 6.0, year: '2024', slug: 'sanjivani-agro-ipo' },
  { id: 20, name: 'Paramount Cables', abbr: 'PC', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'BSE SME', sector: 'Infrastructure', listDate: '2024-03-14', issuePrice: 118, listPrice: 148.6, gainPct: 25.9, subTimes: 142.3, gmpPeak: '+32', aiPred: '+22.1%', aiErr: 3.8, year: '2024', slug: 'paramount-cables-ipo' },
];

// Ticker data
export const tickerData = [
  { name: 'Emiac Tech', gmp: '+12', tag: 'Last Day', color: '#f59e0b' },
  { name: 'Highness Micro', gmp: '+17', tag: 'Allotment', color: '#7c3aed' },
  { name: 'Powerica Ltd', gmp: '+4', tag: 'Listing', color: '#00b377' },
  { name: 'PropShare REIT', gmp: '+8.2K', tag: 'Opening', color: '#3b82f6' },
  { name: 'Fractal Analytics', gmp: '+65', tag: 'Upcoming', color: '#7c84a8' },
  { name: 'Zaggle Prepaid', gmp: '+14', tag: 'Upcoming', color: '#7c84a8' },
];

// News data
export const newsData = [
  {
    id: 1,
    title: 'SEBI approves faster IPO listing - T+3 now T+2 from May 2026',
    source: 'Economic Times',
    time: '2 hours ago',
    tag: 'SEBI',
    tagColor: { bg: '#e6f6f0', text: '#00875a' },
    impact: 'Bullish',
    impactColor: { bg: '#e6f6f0', text: '#00875a' },
  },
  {
    id: 2,
    title: 'RBI keeps repo rate at 6.25%; IPO market to benefit from stable liquidity',
    source: 'Moneycontrol',
    time: '4 hours ago',
    tag: 'MARKET',
    tagColor: { bg: '#eff6ff', text: '#1d4ed8' },
    impact: 'Positive',
    impactColor: { bg: '#e6f6f0', text: '#00875a' },
  },
  {
    id: 3,
    title: 'PhonePe files DRHP with SEBI; Rs 15,000 Cr mega IPO expected Q3 2026',
    source: 'CNBC TV18',
    time: '6 hours ago',
    tag: 'IPO',
    tagColor: { bg: '#f5f3ff', text: '#7c3aed' },
    impact: 'Watch',
    impactColor: { bg: '#f5f3ff', text: '#7c3aed' },
  },
  {
    id: 4,
    title: 'SME IPO listing gains cooling off - analyst caution on high P/E valuations',
    source: 'Business Standard',
    time: '8 hours ago',
    tag: 'ALERT',
    tagColor: { bg: '#fdeaec', text: '#d1293d' },
    impact: 'Caution',
    impactColor: { bg: '#fdeaec', text: '#d1293d' },
  },
];

// Upcoming events
export const upcomingEvents = [
  { date: '8', month: 'APR', title: 'Emiac Technologies IPO', desc: 'Last day to apply', tag: 'Last Day', tagColor: { bg: '#fef3c7', text: '#b45309' }, dateColor: { bg: '#fef3c7', text: '#b45309' } },
  { date: '9', month: 'APR', title: 'Highness Micro Allotment', desc: 'Allotment finalization', tag: 'Allotment', tagColor: { bg: '#f5f3ff', text: '#7c3aed' }, dateColor: { bg: '#f5f3ff', text: '#7c3aed' } },
  { date: '10', month: 'APR', title: 'PropShare REIT Opens', desc: 'Subscription opens', tag: 'Opening', tagColor: { bg: '#eff6ff', text: '#1d4ed8' }, dateColor: { bg: '#eff6ff', text: '#1d4ed8' } },
  { date: '11', month: 'APR', title: 'Emiac Listing', desc: 'BSE SME listing', tag: 'Listing', tagColor: { bg: '#e6f6f0', text: '#00875a' }, dateColor: { bg: '#e6f6f0', text: '#00875a' } },
];

// Helper functions
export function formatPrice(price: number): string {
  if (price >= 100000) {
    return `Rs ${(price / 100000).toFixed(2)}L`;
  }
  return `Rs ${price.toLocaleString('en-IN')}`;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateRange(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}, ${endDate.getFullYear()}`;
}

export function getStatusBadge(status: IPOStatus): { label: string; className: string } {
  switch (status) {
    case 'open':
      return { label: 'Open', className: 'bg-cobalt-bg text-cobalt' };
    case 'lastday':
      return { label: 'Last Day', className: 'bg-gold-bg text-gold' };
    case 'allot':
      return { label: 'Allotment Today', className: 'bg-primary-bg text-primary' };
    case 'listing':
      return { label: 'Listing Today', className: 'bg-emerald-bg text-emerald' };
    case 'upcoming':
      return { label: 'Opening Soon', className: 'bg-cobalt-bg text-cobalt' };
    case 'closed':
      return { label: 'Closed', className: 'bg-muted text-muted-foreground' };
    default:
      return { label: status, className: 'bg-muted text-muted-foreground' };
  }
}

export function getIPOBySlug(slug: string): IPO | undefined {
  return currentIPOs.find(ipo => ipo.slug === slug);
}

export function getListedIPOBySlug(slug: string): ListedIPO | undefined {
  return listedIPOs.find(ipo => ipo.slug === slug);
}
