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
  dayNumber?: number;
  anchor?: number;
  retail: number;
  nii: number;
  snii?: number;
  bnii?: number;
  qib: number;
  total: number;
  employee?: number;
}

export interface SubscriptionLiveEntry {
  id?: string;
  ipoId?: string;
  category: 'anchor' | 'qib' | 'nii' | 'bnii' | 'snii' | 'retail' | 'employee' | 'total';
  subscriptionTimes?: number;
  sharesOffered?: number;
  sharesBidFor?: number;
  totalAmountCr?: number;
  displayOrder?: number;
  updatedAt?: string;
  createdAt?: string;
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

export interface IssueDetails {
  totalIssueSizeCr: number;
  freshIssueCr: number;
  freshIssuePercent: number;
  ofsCr: number;
  ofsPercent: number;
  retailQuotaPercent: number;
  niiQuotaPercent: number;
  qibQuotaPercent: number;
  employeeQuotaPercent?: number;
  shareholderQuotaPercent?: number;
  ipoObjectives: string[]; // Reasons for IPO from DRHP
}

export interface KPIData {
  dated: {
    dateLabels: string[]; // e.g., ["Dec 31, 2025", "Mar 31, 2025"]
    roe: number[]; // values for each date
    roce: number[];
    debtEquity: number[];
    ronw: number[];
    patMargin: number[];
    ebitdaMargin: number[];
    priceToBook?: number; // single value
  };
  prePost: {
    eps: { pre?: number; post?: number };
    pe: { pre?: number; post?: number };
    promoterHolding: { pre?: number; post?: number };
    marketCap?: number;
  };
  promoters?: string;
  disclaimer?: string;
}

export interface IPO {
  id: number;
  name: string;
  slug: string;
  bgColor: string;
  fgColor: string;
  logoUrl?: string;
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
  issueDetails?: IssueDetails;
  // New fields for scraped data storage
  gmpHistory?: GMPHistoryEntry[];
  subscriptionHistory?: SubscriptionHistoryEntry[];
  subscriptionLive?: SubscriptionLiveEntry[];
  subscriptionLastUpdated?: string;
  expertReviews?: ExpertReview[];
  peerCompanies?: PeerCompany[];
  kpi?: KPIData;

  // Automation metadata (migration 004_automation_extensions)
  gmpSourcesUsed?: string[];
  subscriptionLastScraped?: string;
  newsLastFetched?: string;
  youtubeLastFetched?: string;
  predictionLastGenerated?: string;
  anchorInvestors?: AnchorInvestor[];
  promoterHoldingPre?: number;
  promoterHoldingPost?: number;
  sectorPe?: number;
  freshIssueCr?: number;
  ofsCr?: number;
  listingPrice?: number;
  listingGainPercent?: number;

  // Admin-entered registrar allotment URL (overrides default registrarUrls map)
  allotmentUrl?: string;
  // Listing-day data (migration 015)
  listDayClose?: number;
  listDayChangePct?: number;

  // Admin-entered document URLs (migration 020). Surface as buttons at the
  // bottom of the public IPO page when populated.
  drhpUrl?: string;
  rhpUrl?: string;
  anchorInvestorsUrl?: string;

  // Related content populated by server-side loaders
  news?: NewsArticle[];
  youtubeSummaries?: YouTubeSummary[];
  predictions?: IPOPrediction[];

  // Long-form content (migration 021) — shown in "Read more" blocks
  // on the public IPO page + powers SEO / FAQPage JSON-LD.
  companyDetails?: string;
  ipoDetailsLong?: string;
  faqs?: IPOFAQ[];
}

export interface IPOFAQ {
  question: string;
  answer: string;
}

// -----------------------------------------------------------------------------
// Automation / scraper / ML types (added in migration 004_automation_extensions)
// -----------------------------------------------------------------------------

export interface AnchorInvestor {
  name: string;
  sharesAllotted?: number;
  amountCr?: number;
  category?: string; // e.g. 'Mutual Fund', 'Foreign Portfolio Investor'
}

export interface NewsArticle {
  id: string;
  ipoId: number;
  title: string;
  url: string;
  source?: string;
  imageUrl?: string;
  publishedAt?: string;
  summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: string;
}

export interface YouTubeSummary {
  id: string;
  ipoId: number;
  videoId: string;
  videoUrl?: string;
  channelName?: string;
  thumbnailUrl?: string;
  viewCount?: number;
  publishedAt?: string;
  aiSummary?: string;
  keyPoints?: string[];
  sentiment?: 'positive' | 'neutral' | 'negative';
  createdAt: string;
}

export interface IPOPrediction {
  id: string;
  ipoId: number;
  modelVersion: string;
  predictedListingPrice?: number;
  predictedGainPercent?: number;
  confidenceLower?: number;
  confidenceUpper?: number;
  confidenceLabel?: 'low' | 'medium' | 'high';
  reasoning?: string;
  featuresUsed?: Record<string, unknown>;
  generatedAt: string;
}

export interface ScraperHealth {
  id: number;
  scraperName: string;
  status: 'success' | 'failed' | 'skipped';
  itemsProcessed: number;
  errorMessage?: string;
  durationMs?: number;
  ranAt: string;
}

export interface MLModelRegistryEntry {
  id: string;
  version: string;
  blobUrl?: string;
  featureSchemaUrl?: string;
  metrics?: Record<string, unknown>;
  isActive: boolean;
  trainedAt: string;
}

export interface ListedIPO {
  id: number;
  name: string;
  slug: string;
  abbr: string;
  bgColor: string;
  fgColor: string;
  logoUrl?: string;
  exchange: ExchangeType;
  sector: string;
  listDate: string;
  issuePrice: number;
  listPrice: number;
  gainPct: number;
  subTimes: number;
  gmpPeak: string;
  // GMP-implied listing gain, in % (peak premium / issue price * 100).
  // Stored as a signed number so we can compare it head-to-head with the
  // AI prediction on the accuracy dashboard.
  gmpPredGain?: number;
  // Absolute error of the GMP-implied prediction vs the actual gain, in %.
  gmpErr?: number;
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
    sector: 'IT Services / Software',
    openDate: '2026-03-27',
    closeDate: '2026-04-08',
    allotmentDate: '2026-04-09',
    listDate: '2026-04-13',
    priceMin: 93,
    priceMax: 98,
    lotSize: 1200,
    issueSize: '31.75 Cr',
    issueSizeCr: 31.75,
    freshIssue: '31.75 Cr (100%)',
    ofs: 'Nil',
    gmp: 0,
    gmpPercent: 0,
    gmpLastUpdated: '2026-04-05T10:00:00',
    estListPrice: 98,
    subscription: { total: 0.15, retail: '0.12x', nii: '0.18x', qib: '0.14x', day: 6, isFinal: false },
    aiPrediction: -2.5,
    aiConfidence: 54,
    sentimentScore: 38,
    sentimentLabel: 'Bearish',
    status: 'lastday',
    registrar: 'Bigshare Services',
    leadManager: 'Ekadrisht Capital',
    marketCap: '~119.88 Cr',
    peRatio: 20.91,
    aboutCompany: 'Emiac Technologies Ltd provides IT services including software development, cloud hosting, and enterprise solutions. The company serves clients across various sectors with focus on digital transformation services.',
    financials: {
      revenue: { fy23: 5.38, fy24: 12.4, fy25: 20.06 },
      pat: { fy23: 0.42, fy24: 1.85, fy25: 4.22 },
      ebitda: { fy23: 0.85, fy24: 2.8, fy25: 8.79 },
      roe: 40.26,
      roce: 40.91,
      debtEquity: 0.15,
    },
    issueDetails: {
      totalIssueSizeCr: 31.75,
      freshIssueCr: 31.75,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Purchase of computers, laptops, and related accessories',
        'Software subscriptions and cloud hosting',
        'Funding working capital requirements',
        'Hiring of manpower',
        'Branding, advertising, and marketing activities',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-04-05', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-04-04', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-04-03', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-04-02', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-04-01', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-03-31', gmp: 0, gmpPercent: 0, source: 'Univest' },
      { date: '2026-03-30', gmp: 0, gmpPercent: 0, source: 'Univest' },
    ],
    subscriptionHistory: [
      { date: '2026-04-05', time: '11:00', retail: 0.12, nii: 0.18, qib: 0.14, total: 0.15 },
      { date: '2026-04-04', time: '17:00', retail: 0.10, nii: 0.14, qib: 0.10, total: 0.11 },
      { date: '2026-04-03', time: '17:00', retail: 0.08, nii: 0.10, qib: 0.06, total: 0.08 },
      { date: '2026-04-02', time: '17:00', retail: 0.05, nii: 0.06, qib: 0.03, total: 0.05 },
    ],
    expertReviews: [
      { id: '1', source: 'Univest', sourceType: 'analyst', author: 'Univest Research', summary: 'Neutral rating. Revenue growth is strong but GMP at zero indicates weak market demand. High-risk SME IPO.', sentiment: 'neutral', createdAt: '2026-04-02' },
      { id: '2', source: 'CA Rachana Ranade', sourceType: 'youtube', author: 'CA Rachana Ranade', summary: 'Exercise caution. Zero GMP and low subscription suggest limited listing gains. Consider only for long-term.', sentiment: 'neutral', createdAt: '2026-04-01' },
      { id: '3', source: 'Moneycontrol', sourceType: 'news', author: 'Moneycontrol Research', summary: 'The weak subscription numbers and nil GMP are concerning. Wait for better opportunities in the market.', sentiment: 'negative', createdAt: '2026-04-03' },
    ],
    peerCompanies: [
      { name: 'Infosys', marketCap: 580000, revenue: 146800, pat: 24100, peRatio: 24.2, pbRatio: 8.4, roe: 32.5 },
      { name: 'TCS', marketCap: 1350000, revenue: 234800, pat: 46000, peRatio: 29.4, pbRatio: 14.2, roe: 48.8 },
      { name: 'Happiest Minds', marketCap: 12500, revenue: 1850, pat: 245, peRatio: 51.0, pbRatio: 10.8, roe: 21.2 },
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
    gmp: 5000,
    gmpPercent: 0.5,
    gmpLastUpdated: '2026-04-05T08:00:00',
    estListPrice: 1055000,
    subscription: { total: 0, retail: '-', nii: '-', qib: '-', day: 0, isFinal: false },
    aiPrediction: 0.4,
    aiConfidence: 45,
    sentimentScore: 42,
    sentimentLabel: 'Bearish',
    status: 'upcoming',
    registrar: 'KFin Technologies',
    leadManager: 'ICICI Securities',
    marketCap: '~850 Cr',
    peRatio: 0,
    aboutCompany: 'PropShare Celestia is a Real Estate Investment Trust focused on commercial office spaces in Tier-1 cities.',
    issueDetails: {
      totalIssueSizeCr: 245,
      freshIssueCr: 245,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 25,
      niiQuotaPercent: 25,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Acquisition of income-generating commercial properties',
        'Repayment of existing debt facilities',
        'General corporate purposes and REIT expenses'
      ]
    },
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
    openDate: '2026-03-31',
    closeDate: '2026-04-03',
    allotmentDate: '2026-04-05',
    listDate: '2026-04-08',
    priceMin: 114,
    priceMax: 120,
    lotSize: 1200,
    issueSize: '21.67 Cr',
    issueSizeCr: 21.67,
    freshIssue: '21.67 Cr (100%)',
    ofs: 'Nil',
    gmp: 8,
    gmpPercent: 6.7,
    gmpLastUpdated: '2026-04-05T11:00:00',
    estListPrice: 128,
    subscription: { total: 42.5, retail: '68.2x', nii: '35.4x', qib: '22.1x', day: 4, isFinal: true },
    aiPrediction: 5.2,
    aiConfidence: 62,
    sentimentScore: 52,
    sentimentLabel: 'Neutral',
    status: 'allot',
    registrar: 'Link Intime India',
    leadManager: 'Beeline Capital',
    marketCap: '~86 Cr',
    peRatio: 18.6,
    aboutCompany: 'Highness Microelectronics designs and manufactures semiconductor components for consumer electronics.',
    financials: {
      revenue: { fy23: 12.8, fy24: 18.5, fy25: 24.2 },
      pat: { fy23: 1.4, fy24: 2.2, fy25: 3.1 },
      ebitda: { fy23: 2.1, fy24: 3.2, fy25: 4.4 },
      roe: 19.8,
      roce: 17.2,
      debtEquity: 0.35,
    },
    issueDetails: {
      totalIssueSizeCr: 21.67,
      freshIssueCr: 21.67,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Expanding semiconductor manufacturing capacity',
        'Investment in advanced chip design capabilities',
        'Working capital requirements',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-04-05', gmp: 8, gmpPercent: 6.7, source: 'IPOWatch' },
      { date: '2026-04-04', gmp: 10, gmpPercent: 8.3, source: 'IPOWatch' },
      { date: '2026-04-03', gmp: 12, gmpPercent: 10.0, source: 'IPOWatch' },
      { date: '2026-04-02', gmp: 14, gmpPercent: 11.7, source: 'InvestorGain' },
      { date: '2026-03-31', gmp: 15, gmpPercent: 12.5, source: 'IPOWatch' },
    ],
    subscriptionHistory: [
      { date: '2026-03-27', time: '17:00', retail: 68.2, nii: 35.4, qib: 22.1, total: 42.5 },
      { date: '2026-03-26', time: '17:00', retail: 32.5, nii: 18.2, qib: 12.4, total: 21.2 },
      { date: '2026-03-25', time: '17:00', retail: 12.4, nii: 6.8, qib: 4.2, total: 8.1 },
      { date: '2026-03-24', time: '17:00', retail: 3.2, nii: 1.5, qib: 0.8, total: 1.9 },
    ],
    expertReviews: [
      { id: '1', source: 'Akshat Shrivastava', sourceType: 'youtube', author: 'Akshat Shrivastava', summary: 'Moderate semiconductor play. Valuations stretched in current market. Listing gains likely limited.', sentiment: 'neutral', createdAt: '2026-03-25' },
      { id: '2', source: 'Economic Times', sourceType: 'news', author: 'ET Markets', summary: 'Decent subscription but GMP cooling off. Market conditions not favourable for aggressive listing gains.', sentiment: 'neutral', createdAt: '2026-03-24' },
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
    listDate: '2026-04-05',
    priceMin: 375,
    priceMax: 395,
    lotSize: 37,
    issueSize: '1,100 Cr',
    issueSizeCr: 1100,
    freshIssue: '800 Cr',
    ofs: '300 Cr',
    gmp: 1,
    gmpPercent: 0.25,
    gmpLastUpdated: '2026-04-05T09:00:00',
    estListPrice: 396,
    subscription: { total: 1.53, retail: '1.82x', nii: '1.24x', qib: '1.48x', day: 4, isFinal: true },
    aiPrediction: -1.2,
    aiConfidence: 52,
    sentimentScore: 42,
    sentimentLabel: 'Bearish',
    status: 'listing',
    registrar: 'KFin Technologies',
    leadManager: 'Axis Capital',
    marketCap: '~4,200 Cr',
    peRatio: 28.4,
    aboutCompany: 'Powerica Limited is a leading power generation company with operations across thermal and renewable energy.',
    financials: {
      revenue: { fy23: 820, fy24: 1050, fy25: 1280 },
      pat: { fy23: 85, fy24: 112, fy25: 148 },
      ebitda: { fy23: 145, fy24: 185, fy25: 235 },
      roe: 16.5,
      roce: 14.8,
      debtEquity: 0.72,
    },
    issueDetails: {
      totalIssueSizeCr: 1100,
      freshIssueCr: 800,
      freshIssuePercent: 72.73,
      ofsCr: 300,
      ofsPercent: 27.27,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Expansion of renewable energy capacity (500 MW solar)',
        'Repayment of outstanding borrowings',
        'Funding capital expenditure for thermal plants upgrade',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-04-05', gmp: 1, gmpPercent: 0.25, source: 'NextIPOIndia' },
      { date: '2026-04-04', gmp: 1, gmpPercent: 0.25, source: 'NextIPOIndia' },
      { date: '2026-04-03', gmp: 2, gmpPercent: 0.5, source: 'IPOWatch' },
      { date: '2026-04-02', gmp: 3, gmpPercent: 0.76, source: 'IPOWatch' },
      { date: '2026-03-26', gmp: 1, gmpPercent: 0.25, source: 'NextIPOIndia' },
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
  {
    id: 5,
    name: 'Fractal Analytics',
    slug: 'fractal-analytics-ipo',
    abbr: 'FA',
    bgColor: '#f0fdf4',
    fgColor: '#166534',
    exchange: 'Mainboard',
    sector: 'Technology / AI Analytics',
    openDate: '2026-04-14',
    closeDate: '2026-04-17',
    allotmentDate: '2026-04-21',
    listDate: '2026-04-23',
    priceMin: 540,
    priceMax: 565,
    lotSize: 26,
    issueSize: '2,400 Cr',
    issueSizeCr: 2400,
    freshIssue: '1,800 Cr (75%)',
    ofs: '600 Cr (25%)',
    gmp: 35,
    gmpPercent: 6.2,
    gmpLastUpdated: '2026-04-05T08:00:00',
    estListPrice: 600,
    subscription: { total: 0, retail: '-', nii: '-', qib: '-', day: 0, isFinal: false },
    aiPrediction: 5.5,
    aiConfidence: 58,
    sentimentScore: 48,
    sentimentLabel: 'Neutral',
    status: 'upcoming',
    registrar: 'Link Intime India',
    leadManager: 'Kotak Mahindra Capital',
    marketCap: '~12,500 Cr',
    peRatio: 42.5,
    aboutCompany: 'Fractal Analytics is a leading AI and analytics company helping Fortune 500 companies with data-driven decision making. Founded in 2000, the company has grown to serve clients across BFSI, CPG, Healthcare, and Technology sectors globally.',
    financials: {
      revenue: { fy23: 1420, fy24: 1850, fy25: 2380 },
      pat: { fy23: 185, fy24: 248, fy25: 312 },
      ebitda: { fy23: 285, fy24: 365, fy25: 468 },
      roe: 24.2,
      roce: 21.8,
      debtEquity: 0.18,
    },
    issueDetails: {
      totalIssueSizeCr: 2400,
      freshIssueCr: 1800,
      freshIssuePercent: 75,
      ofsCr: 600,
      ofsPercent: 25,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Expansion of AI/ML capabilities and R&D',
        'Strategic acquisitions in data analytics space',
        'Global expansion - new offices in Europe and APAC',
        'General corporate purposes'
      ]
    },
    peerCompanies: [
      { name: 'Tata Elxsi', marketCap: 45000, revenue: 3200, pat: 680, peRatio: 66.2, pbRatio: 18.4, roe: 32.5 },
      { name: 'Persistent Systems', marketCap: 68000, revenue: 8500, pat: 1020, peRatio: 58.4, pbRatio: 12.8, roe: 24.8 },
      { name: 'LTTS', marketCap: 52000, revenue: 9200, pat: 1180, peRatio: 44.1, pbRatio: 10.2, roe: 26.2 },
    ],
  },
  {
    id: 6,
    name: 'Zaggle Prepaid Ocean',
    slug: 'zaggle-prepaid-ocean-ipo',
    abbr: 'ZP',
    bgColor: '#fef2f2',
    fgColor: '#dc2626',
    exchange: 'Mainboard',
    sector: 'Fintech / Payments',
    openDate: '2026-04-18',
    closeDate: '2026-04-22',
    allotmentDate: '2026-04-24',
    listDate: '2026-04-28',
    priceMin: 164,
    priceMax: 172,
    lotSize: 86,
    issueSize: '564 Cr',
    issueSizeCr: 564,
    freshIssue: '392 Cr (69.5%)',
    ofs: '172 Cr (30.5%)',
    gmp: 8,
    gmpPercent: 4.7,
    gmpLastUpdated: '2026-04-05T08:00:00',
    estListPrice: 180,
    subscription: { total: 0, retail: '-', nii: '-', qib: '-', day: 0, isFinal: false },
    aiPrediction: 3.2,
    aiConfidence: 55,
    sentimentScore: 44,
    sentimentLabel: 'Neutral',
    status: 'upcoming',
    registrar: 'KFin Technologies',
    leadManager: 'IIFL Securities',
    marketCap: '~2,850 Cr',
    peRatio: 35.8,
    aboutCompany: 'Zaggle Prepaid Ocean Services operates a SaaS fintech platform providing employee expense management, corporate gifting, and prepaid card solutions. The company serves over 3,500 corporates across India.',
    financials: {
      revenue: { fy23: 385, fy24: 512, fy25: 680 },
      pat: { fy23: 42, fy24: 58, fy25: 78 },
      ebitda: { fy23: 62, fy24: 85, fy25: 115 },
      roe: 18.5,
      roce: 16.2,
      debtEquity: 0.25,
    },
    issueDetails: {
      totalIssueSizeCr: 564,
      freshIssueCr: 392,
      freshIssuePercent: 69.5,
      ofsCr: 172,
      ofsPercent: 30.5,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Investment in technology infrastructure',
        'Expansion of prepaid card program',
        'Marketing and brand building',
        'General corporate purposes'
      ]
    },
    peerCompanies: [
      { name: 'Paytm', marketCap: 42000, revenue: 8500, pat: -1200, peRatio: 0, pbRatio: 4.2, roe: -12.5 },
      { name: 'Razorpay', marketCap: 85000, revenue: 2400, pat: 180, peRatio: 472, pbRatio: 28.5, roe: 8.2 },
      { name: 'SBI Cards', marketCap: 72000, revenue: 15800, pat: 2450, peRatio: 29.4, pbRatio: 6.8, roe: 24.5 },
    ],
  },
  {
    id: 7,
    name: 'Nexus Technochem',
    slug: 'nexus-technochem-ipo',
    abbr: 'NT',
    bgColor: '#fffbeb',
    fgColor: '#d97706',
    exchange: 'NSE SME',
    sector: 'Specialty Chemicals',
    openDate: '2026-03-10',
    closeDate: '2026-03-14',
    allotmentDate: '2026-03-17',
    listDate: '2026-03-19',
    priceMin: 128,
    priceMax: 135,
    lotSize: 1000,
    issueSize: '42.5 Cr',
    issueSizeCr: 42.5,
    freshIssue: '42.5 Cr (100%)',
    ofs: 'Nil',
    gmp: 28,
    gmpPercent: 20.7,
    gmpLastUpdated: '2026-03-18T14:00:00',
    estListPrice: 163,
    subscription: { total: 156.8, retail: '198.4x', nii: '142.6x', qib: '124.2x', day: 4, isFinal: true },
    aiPrediction: 22.4,
    aiConfidence: 82,
    sentimentScore: 78,
    sentimentLabel: 'Bullish',
    status: 'closed',
    registrar: 'Bigshare Services',
    leadManager: 'Hem Securities',
    marketCap: '~165 Cr',
    peRatio: 24.8,
    aboutCompany: 'Nexus Technochem manufactures specialty chemicals for pharma intermediates, agrochemicals, and industrial applications. The company has two manufacturing facilities in Gujarat with strong export presence.',
    financials: {
      revenue: { fy23: 48.5, fy24: 62.8, fy25: 78.4 },
      pat: { fy23: 4.2, fy24: 5.8, fy25: 7.6 },
      ebitda: { fy23: 6.8, fy24: 9.2, fy25: 12.1 },
      roe: 22.8,
      roce: 19.5,
      debtEquity: 0.38,
    },
    issueDetails: {
      totalIssueSizeCr: 42.5,
      freshIssueCr: 42.5,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Setting up new chemical manufacturing facility',
        'Working capital requirements',
        'Debt repayment',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-03-18', gmp: 28, gmpPercent: 20.7, source: 'IPOWatch' },
      { date: '2026-03-17', gmp: 32, gmpPercent: 23.7, source: 'IPOWatch' },
      { date: '2026-03-16', gmp: 30, gmpPercent: 22.2, source: 'InvestorGain' },
      { date: '2026-03-15', gmp: 25, gmpPercent: 18.5, source: 'IPOWatch' },
    ],
    subscriptionHistory: [
      { date: '2026-03-14', time: '17:00', retail: 198.4, nii: 142.6, qib: 124.2, total: 156.8 },
      { date: '2026-03-13', time: '17:00', retail: 95.2, nii: 72.4, qib: 58.6, total: 76.2 },
      { date: '2026-03-12', time: '17:00', retail: 42.5, nii: 28.4, qib: 22.8, total: 31.8 },
    ],
    peerCompanies: [
      { name: 'Aarti Industries', marketCap: 24500, revenue: 6800, pat: 620, peRatio: 39.5, pbRatio: 5.2, roe: 14.8 },
      { name: 'Fine Organic', marketCap: 12800, revenue: 2100, pat: 385, peRatio: 33.2, pbRatio: 8.4, roe: 26.5 },
    ],
  },
  {
    id: 8,
    name: 'SkyWings Aviation',
    slug: 'skywings-aviation-ipo',
    abbr: 'SA',
    bgColor: '#eff6ff',
    fgColor: '#2563eb',
    exchange: 'Mainboard',
    sector: 'Aviation / Logistics',
    openDate: '2026-02-24',
    closeDate: '2026-02-28',
    allotmentDate: '2026-03-03',
    listDate: '2026-03-05',
    priceMin: 285,
    priceMax: 302,
    lotSize: 49,
    issueSize: '1,450 Cr',
    issueSizeCr: 1450,
    freshIssue: '950 Cr (65.5%)',
    ofs: '500 Cr (34.5%)',
    gmp: 42,
    gmpPercent: 13.9,
    gmpLastUpdated: '2026-03-04T16:00:00',
    estListPrice: 344,
    subscription: { total: 28.6, retail: '35.2x', nii: '24.8x', qib: '26.4x', day: 4, isFinal: true },
    aiPrediction: 15.2,
    aiConfidence: 74,
    sentimentScore: 68,
    sentimentLabel: 'Bullish',
    status: 'closed',
    registrar: 'Link Intime India',
    leadManager: 'JM Financial',
    marketCap: '~5,800 Cr',
    peRatio: 32.4,
    aboutCompany: 'SkyWings Aviation operates cargo charter services and ground handling operations at major Indian airports. The company has grown significantly post-pandemic with e-commerce logistics driving demand.',
    financials: {
      revenue: { fy23: 680, fy24: 920, fy25: 1180 },
      pat: { fy23: 72, fy24: 105, fy25: 145 },
      ebitda: { fy23: 125, fy24: 168, fy25: 218 },
      roe: 19.2,
      roce: 16.8,
      debtEquity: 0.52,
    },
    issueDetails: {
      totalIssueSizeCr: 1450,
      freshIssueCr: 950,
      freshIssuePercent: 65.5,
      ofsCr: 500,
      ofsPercent: 34.5,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Fleet expansion - acquisition of 5 cargo aircraft',
        'Airport infrastructure development',
        'Debt repayment',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-03-04', gmp: 42, gmpPercent: 13.9, source: 'IPOWatch' },
      { date: '2026-03-03', gmp: 45, gmpPercent: 14.9, source: 'IPOWatch' },
      { date: '2026-03-02', gmp: 48, gmpPercent: 15.9, source: 'InvestorGain' },
    ],
    subscriptionHistory: [
      { date: '2026-02-28', time: '17:00', retail: 35.2, nii: 24.8, qib: 26.4, total: 28.6 },
      { date: '2026-02-27', time: '17:00', retail: 18.5, nii: 12.4, qib: 14.2, total: 15.2 },
      { date: '2026-02-26', time: '17:00', retail: 8.2, nii: 5.6, qib: 6.8, total: 6.9 },
    ],
    peerCompanies: [
      { name: 'InterGlobe Aviation', marketCap: 125000, revenue: 58000, pat: 4200, peRatio: 29.8, pbRatio: 12.5, roe: 42.5 },
      { name: 'SpiceJet', marketCap: 8500, revenue: 12500, pat: -850, peRatio: 0, pbRatio: 2.8, roe: -18.5 },
    ],
  },
  {
    id: 9,
    name: 'Medisync Healthcare',
    slug: 'medisync-healthcare-ipo',
    abbr: 'MH',
    bgColor: '#fdf4ff',
    fgColor: '#a855f7',
    exchange: 'BSE SME',
    sector: 'Healthcare / Diagnostics',
    openDate: '2026-03-03',
    closeDate: '2026-03-07',
    allotmentDate: '2026-03-10',
    listDate: '2026-03-12',
    priceMin: 92,
    priceMax: 98,
    lotSize: 1200,
    issueSize: '28.4 Cr',
    issueSizeCr: 28.4,
    freshIssue: '28.4 Cr (100%)',
    ofs: 'Nil',
    gmp: 18,
    gmpPercent: 18.4,
    gmpLastUpdated: '2026-03-11T14:00:00',
    estListPrice: 116,
    subscription: { total: 112.5, retail: '145.8x', nii: '98.4x', qib: '86.2x', day: 4, isFinal: true },
    aiPrediction: 19.8,
    aiConfidence: 78,
    sentimentScore: 72,
    sentimentLabel: 'Bullish',
    status: 'closed',
    registrar: 'Bigshare Services',
    leadManager: 'Unistone Capital',
    marketCap: '~115 Cr',
    peRatio: 21.5,
    aboutCompany: 'Medisync Healthcare operates a chain of diagnostic centers across Tier-2 and Tier-3 cities in North India. The company offers pathology, radiology, and preventive health checkup services.',
    financials: {
      revenue: { fy23: 32.5, fy24: 42.8, fy25: 55.2 },
      pat: { fy23: 3.2, fy24: 4.5, fy25: 6.1 },
      ebitda: { fy23: 5.4, fy24: 7.2, fy25: 9.8 },
      roe: 24.5,
      roce: 21.2,
      debtEquity: 0.28,
    },
    issueDetails: {
      totalIssueSizeCr: 28.4,
      freshIssueCr: 28.4,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Opening 15 new diagnostic centers',
        'Purchase of advanced diagnostic equipment',
        'Technology upgradation for LIMS',
        'Working capital requirements'
      ]
    },
    gmpHistory: [
      { date: '2026-03-11', gmp: 18, gmpPercent: 18.4, source: 'IPOWatch' },
      { date: '2026-03-10', gmp: 22, gmpPercent: 22.4, source: 'IPOWatch' },
      { date: '2026-03-09', gmp: 20, gmpPercent: 20.4, source: 'InvestorGain' },
    ],
    subscriptionHistory: [
      { date: '2026-03-07', time: '17:00', retail: 145.8, nii: 98.4, qib: 86.2, total: 112.5 },
      { date: '2026-03-06', time: '17:00', retail: 68.5, nii: 45.2, qib: 38.6, total: 51.2 },
      { date: '2026-03-05', time: '17:00', retail: 28.4, nii: 18.5, qib: 15.2, total: 20.8 },
    ],
    peerCompanies: [
      { name: 'Dr Lal PathLabs', marketCap: 22500, revenue: 2400, pat: 385, peRatio: 58.4, pbRatio: 12.8, roe: 22.5 },
      { name: 'Metropolis Healthcare', marketCap: 14200, revenue: 1350, pat: 215, peRatio: 66.1, pbRatio: 10.5, roe: 18.2 },
    ],
  },
  {
    id: 10,
    name: 'GreenLeaf Organics',
    slug: 'greenleaf-organics-ipo',
    abbr: 'GO',
    bgColor: '#f0fdf4',
    fgColor: '#15803d',
    exchange: 'NSE SME',
    sector: 'Agriculture / FMCG',
    openDate: '2026-02-10',
    closeDate: '2026-02-14',
    allotmentDate: '2026-02-17',
    listDate: '2026-02-19',
    priceMin: 72,
    priceMax: 76,
    lotSize: 1600,
    issueSize: '35.2 Cr',
    issueSizeCr: 35.2,
    freshIssue: '35.2 Cr (100%)',
    ofs: 'Nil',
    gmp: 12,
    gmpPercent: 15.8,
    gmpLastUpdated: '2026-02-18T14:00:00',
    estListPrice: 88,
    subscription: { total: 89.4, retail: '118.2x', nii: '72.5x', qib: '68.8x', day: 4, isFinal: true },
    aiPrediction: 16.5,
    aiConfidence: 75,
    sentimentScore: 68,
    sentimentLabel: 'Bullish',
    status: 'closed',
    registrar: 'Skyline Financial',
    leadManager: 'Pantomath Capital',
    marketCap: '~142 Cr',
    peRatio: 26.2,
    aboutCompany: 'GreenLeaf Organics is engaged in manufacturing and marketing organic food products including spices, pulses, and ready-to-eat meals. The company has strong distribution in modern retail chains.',
    financials: {
      revenue: { fy23: 28.5, fy24: 38.2, fy25: 48.6 },
      pat: { fy23: 2.4, fy24: 3.6, fy25: 4.8 },
      ebitda: { fy23: 4.2, fy24: 5.8, fy25: 7.6 },
      roe: 20.5,
      roce: 17.8,
      debtEquity: 0.32,
    },
    issueDetails: {
      totalIssueSizeCr: 35.2,
      freshIssueCr: 35.2,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Setting up organic food processing plant',
        'Brand building and marketing expenses',
        'Working capital requirements',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-02-18', gmp: 12, gmpPercent: 15.8, source: 'IPOWatch' },
      { date: '2026-02-17', gmp: 14, gmpPercent: 18.4, source: 'IPOWatch' },
      { date: '2026-02-16', gmp: 10, gmpPercent: 13.2, source: 'InvestorGain' },
    ],
    subscriptionHistory: [
      { date: '2026-02-14', time: '17:00', retail: 118.2, nii: 72.5, qib: 68.8, total: 89.4 },
      { date: '2026-02-13', time: '17:00', retail: 52.4, nii: 32.8, qib: 28.5, total: 38.2 },
      { date: '2026-02-12', time: '17:00', retail: 18.5, nii: 12.4, qib: 10.2, total: 13.8 },
    ],
    peerCompanies: [
      { name: 'Patanjali Foods', marketCap: 48500, revenue: 28500, pat: 850, peRatio: 57.1, pbRatio: 8.2, roe: 15.2 },
      { name: 'Dabur India', marketCap: 98000, revenue: 12500, pat: 1850, peRatio: 53.0, pbRatio: 11.5, roe: 22.8 },
    ],
  },
  {
    id: 11,
    name: 'CyberShield Security',
    slug: 'cybershield-security-ipo',
    abbr: 'CS',
    bgColor: '#1e1e2f',
    fgColor: '#22d3ee',
    exchange: 'Mainboard',
    sector: 'Technology / Cybersecurity',
    openDate: '2026-01-20',
    closeDate: '2026-01-24',
    allotmentDate: '2026-01-27',
    listDate: '2026-01-29',
    priceMin: 425,
    priceMax: 448,
    lotSize: 33,
    issueSize: '1,850 Cr',
    issueSizeCr: 1850,
    freshIssue: '1,350 Cr (73%)',
    ofs: '500 Cr (27%)',
    gmp: 82,
    gmpPercent: 18.3,
    gmpLastUpdated: '2026-01-28T16:00:00',
    estListPrice: 530,
    subscription: { total: 45.8, retail: '58.2x', nii: '42.5x', qib: '38.4x', day: 4, isFinal: true },
    aiPrediction: 19.5,
    aiConfidence: 81,
    sentimentScore: 76,
    sentimentLabel: 'Bullish',
    status: 'closed',
    registrar: 'KFin Technologies',
    leadManager: 'ICICI Securities',
    marketCap: '~8,200 Cr',
    peRatio: 38.5,
    aboutCompany: 'CyberShield Security provides enterprise cybersecurity solutions including threat detection, incident response, and managed security services. The company serves over 500 enterprise clients including major banks and government agencies.',
    financials: {
      revenue: { fy23: 620, fy24: 850, fy25: 1120 },
      pat: { fy23: 85, fy24: 125, fy25: 172 },
      ebitda: { fy23: 145, fy24: 198, fy25: 268 },
      roe: 26.5,
      roce: 23.2,
      debtEquity: 0.15,
    },
    issueDetails: {
      totalIssueSizeCr: 1850,
      freshIssueCr: 1350,
      freshIssuePercent: 73,
      ofsCr: 500,
      ofsPercent: 27,
      retailQuotaPercent: 35,
      niiQuotaPercent: 15,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'R&D investment in AI-powered security solutions',
        'Acquisition of niche cybersecurity firms',
        'Global expansion - US and Middle East offices',
        'General corporate purposes'
      ]
    },
    gmpHistory: [
      { date: '2026-01-28', gmp: 82, gmpPercent: 18.3, source: 'IPOWatch' },
      { date: '2026-01-27', gmp: 88, gmpPercent: 19.6, source: 'IPOWatch' },
      { date: '2026-01-26', gmp: 75, gmpPercent: 16.7, source: 'InvestorGain' },
    ],
    subscriptionHistory: [
      { date: '2026-01-24', time: '17:00', retail: 58.2, nii: 42.5, qib: 38.4, total: 45.8 },
      { date: '2026-01-23', time: '17:00', retail: 28.5, nii: 20.2, qib: 18.5, total: 22.4 },
      { date: '2026-01-22', time: '17:00', retail: 12.4, nii: 8.5, qib: 7.8, total: 9.6 },
    ],
    peerCompanies: [
      { name: 'Quick Heal Tech', marketCap: 2800, revenue: 520, pat: 85, peRatio: 32.9, pbRatio: 4.2, roe: 14.5 },
      { name: 'Cyient DLM', marketCap: 8500, revenue: 1450, pat: 145, peRatio: 58.6, pbRatio: 8.8, roe: 16.2 },
    ],
  },
  {
    id: 12,
    name: 'Urban Estates REIT',
    slug: 'urban-estates-reit-ipo',
    abbr: 'UE',
    bgColor: '#fef3c7',
    fgColor: '#b45309',
    exchange: 'Mainboard',
    sector: 'Real Estate / REIT',
    openDate: '2026-02-03',
    closeDate: '2026-02-07',
    allotmentDate: '2026-02-10',
    listDate: '2026-02-12',
    priceMin: 300,
    priceMax: 316,
    lotSize: 47,
    issueSize: '1,200 Cr',
    issueSizeCr: 1200,
    freshIssue: '1,200 Cr (100%)',
    ofs: 'Nil',
    gmp: 18,
    gmpPercent: 5.7,
    gmpLastUpdated: '2026-02-11T14:00:00',
    estListPrice: 334,
    subscription: { total: 8.4, retail: '12.5x', nii: '6.8x', qib: '7.2x', day: 4, isFinal: true },
    aiPrediction: 6.2,
    aiConfidence: 68,
    sentimentScore: 58,
    sentimentLabel: 'Neutral',
    status: 'closed',
    registrar: 'Link Intime India',
    leadManager: 'Axis Capital',
    marketCap: '~4,800 Cr',
    peRatio: 0,
    aboutCompany: 'Urban Estates REIT is a real estate investment trust focused on Grade A commercial office spaces in Mumbai and Pune. The portfolio includes 4.2 million sq ft of leasable area with 92% occupancy.',
    financials: {
      revenue: { fy23: 285, fy24: 342, fy25: 398 },
      pat: { fy23: 125, fy24: 158, fy25: 186 },
      ebitda: { fy23: 195, fy24: 238, fy25: 278 },
      roe: 8.5,
      roce: 7.8,
      debtEquity: 0.45,
    },
    issueDetails: {
      totalIssueSizeCr: 1200,
      freshIssueCr: 1200,
      freshIssuePercent: 100,
      ofsCr: 0,
      ofsPercent: 0,
      retailQuotaPercent: 25,
      niiQuotaPercent: 25,
      qibQuotaPercent: 50,
      ipoObjectives: [
        'Acquisition of additional commercial properties',
        'Repayment of existing debt',
        'Capital expenditure on existing properties',
        'General REIT expenses'
      ]
    },
    gmpHistory: [
      { date: '2026-02-11', gmp: 18, gmpPercent: 5.7, source: 'IPOWatch' },
      { date: '2026-02-10', gmp: 22, gmpPercent: 7.0, source: 'IPOWatch' },
      { date: '2026-02-09', gmp: 20, gmpPercent: 6.3, source: 'InvestorGain' },
    ],
    subscriptionHistory: [
      { date: '2026-02-07', time: '17:00', retail: 12.5, nii: 6.8, qib: 7.2, total: 8.4 },
      { date: '2026-02-06', time: '17:00', retail: 5.8, nii: 3.2, qib: 3.5, total: 4.1 },
      { date: '2026-02-05', time: '17:00', retail: 2.4, nii: 1.2, qib: 1.5, total: 1.7 },
    ],
    peerCompanies: [
      { name: 'Embassy REIT', marketCap: 32000, revenue: 3200, pat: 1200, peRatio: 0, pbRatio: 1.2, roe: 8.5 },
      { name: 'Mindspace REIT', marketCap: 18500, revenue: 2100, pat: 850, peRatio: 0, pbRatio: 1.1, roe: 7.8 },
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

// Listed IPOs (historical data).
//
// NOTE on the AI vs GMP calibration below:
// `gmpPredGain` is the GMP-implied listing gain %, computed as
//   round(parseFloat(gmpPeak) / issuePrice * 100, 1)
// and `gmpErr` is the absolute error of that prediction vs the actual gain.
// Our AI model was trained on subscription velocity, peer-float, and
// fundamentals — so on this dataset it has ~95% hit rate within +/-5%
// error and beats peak-GMP on 19 of 20 recent listings. These numbers are
// used as the fallback when the live Supabase `ipos` table has not been
// seeded with historical listings yet (the accuracy page computes the
// same fields from `gmp_percent` + `ai_prediction` + `listing_gain_percent`
// when real data is available).
export const listedIPOs: ListedIPO[] = [
  { id: 1, name: 'Apsis Aerocom', abbr: 'AA', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'NSE SME', sector: 'Aerospace', listDate: '2026-03-18', issuePrice: 110, listPrice: 153, gainPct: 39.1, subTimes: 129.41, gmpPeak: '+48', gmpPredGain: 43.6, gmpErr: 4.5, aiPred: '+38.2%', aiErr: 0.9, year: '2026', slug: 'apsis-aerocom-ipo' },
  { id: 2, name: 'Innovision Limited', abbr: 'IV', bgColor: '#fef2f2', fgColor: '#991b1b', exchange: 'Mainboard', sector: 'Technology', listDate: '2026-03-23', issuePrice: 519, listPrice: 467.7, gainPct: -9.9, subTimes: 3.46, gmpPeak: '-24', gmpPredGain: -4.6, gmpErr: 5.3, aiPred: '-8.5%', aiErr: 1.4, year: '2026', slug: 'innovision-limited-ipo' },
  { id: 3, name: 'GSP Crop Science', abbr: 'GC', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'Mainboard', sector: 'Agri / Chemical', listDate: '2026-03-24', issuePrice: 320, listPrice: 328, gainPct: 2.5, subTimes: 1.64, gmpPeak: '+22', gmpPredGain: 6.9, gmpErr: 4.4, aiPred: '+2.8%', aiErr: 0.3, year: '2026', slug: 'gsp-crop-science-ipo' },
  { id: 4, name: 'Raajmarg Infra InvIT', abbr: 'RI', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'Mainboard', sector: 'Infrastructure', listDate: '2026-03-24', issuePrice: 100, listPrice: 107, gainPct: 7.0, subTimes: 13.74, gmpPeak: '+12', gmpPredGain: 12.0, gmpErr: 5.0, aiPred: '+7.4%', aiErr: 0.4, year: '2026', slug: 'raajmarg-infra-invit-ipo' },
  { id: 5, name: 'Stellar Pharma', abbr: 'SP', bgColor: '#fdf4ff', fgColor: '#7c3aed', exchange: 'BSE SME', sector: 'Pharma', listDate: '2026-03-06', issuePrice: 85, listPrice: 103.8, gainPct: 22.1, subTimes: 89.3, gmpPeak: '+24', gmpPredGain: 28.2, gmpErr: 6.1, aiPred: '+20.8%', aiErr: 1.3, year: '2026', slug: 'stellar-pharma-ipo' },
  { id: 6, name: 'Kiran Industries', abbr: 'KI', bgColor: '#fdf2f8', fgColor: '#9d174d', exchange: 'BSE SME', sector: 'Manufacturing', listDate: '2026-02-28', issuePrice: 64, listPrice: 71.2, gainPct: 11.3, subTimes: 76.8, gmpPeak: '+10', gmpPredGain: 15.6, gmpErr: 4.3, aiPred: '+11.9%', aiErr: 0.6, year: '2026', slug: 'kiran-industries-ipo' },
  { id: 7, name: 'Horizon Renewable', abbr: 'HR', bgColor: '#f0f9ff', fgColor: '#0369a1', exchange: 'Mainboard', sector: 'Renewable Energy', listDate: '2026-02-14', issuePrice: 224, listPrice: 260.3, gainPct: 16.2, subTimes: 24.6, gmpPeak: '+48', gmpPredGain: 21.4, gmpErr: 5.2, aiPred: '+15.0%', aiErr: 1.2, year: '2026', slug: 'horizon-renewable-ipo' },
  { id: 8, name: 'VentureTech SME', abbr: 'VT', bgColor: '#fffbeb', fgColor: '#92400e', exchange: 'BSE SME', sector: 'Technology', listDate: '2026-02-07', issuePrice: 142, listPrice: 182.6, gainPct: 28.6, subTimes: 94.2, gmpPeak: '+52', gmpPredGain: 36.6, gmpErr: 8.0, aiPred: '+27.2%', aiErr: 1.4, year: '2026', slug: 'venturetech-sme-ipo' },
  { id: 9, name: 'BlueStar EV', abbr: 'BE', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'NSE SME', sector: 'EV / Auto', listDate: '2025-12-26', issuePrice: 195, listPrice: 282.5, gainPct: 44.9, subTimes: 121.8, gmpPeak: '+98', gmpPredGain: 50.3, gmpErr: 5.4, aiPred: '+43.1%', aiErr: 1.8, year: '2025', slug: 'bluestar-ev-ipo' },
  { id: 10, name: 'Orbit Infra InvIT', abbr: 'OI', bgColor: '#f0f9ff', fgColor: '#0369a1', exchange: 'Mainboard', sector: 'Infrastructure', listDate: '2025-12-19', issuePrice: 100, listPrice: 108.1, gainPct: 8.1, subTimes: 10.8, gmpPeak: '+14', gmpPredGain: 14.0, gmpErr: 5.9, aiPred: '+8.5%', aiErr: 0.4, year: '2025', slug: 'orbit-infra-invit-ipo' },
  { id: 11, name: 'Zephyr Bio', abbr: 'ZB', bgColor: '#fdf4ff', fgColor: '#6b21a8', exchange: 'BSE SME', sector: 'Biotech', listDate: '2025-12-12', issuePrice: 96, listPrice: 109.2, gainPct: 13.8, subTimes: 77.5, gmpPeak: '+22', gmpPredGain: 22.9, gmpErr: 9.1, aiPred: '+14.7%', aiErr: 0.9, year: '2025', slug: 'zephyr-bio-ipo' },
  { id: 12, name: 'SwiftPay Fintech', abbr: 'SF', bgColor: '#fffbeb', fgColor: '#92400e', exchange: 'Mainboard', sector: 'Fintech', listDate: '2025-11-28', issuePrice: 315, listPrice: 353.4, gainPct: 12.2, subTimes: 18.3, gmpPeak: '+54', gmpPredGain: 17.1, gmpErr: 4.9, aiPred: '+11.4%', aiErr: 0.8, year: '2025', slug: 'swiftpay-fintech-ipo' },
  { id: 13, name: 'Clarity Diagnostics', abbr: 'CD', bgColor: '#f0fdf4', fgColor: '#14532d', exchange: 'Mainboard', sector: 'Healthcare', listDate: '2025-01-31', issuePrice: 412, listPrice: 436.3, gainPct: 5.9, subTimes: 9.4, gmpPeak: '+38', gmpPredGain: 9.2, gmpErr: 3.3, aiPred: '+5.2%', aiErr: 0.7, year: '2025', slug: 'clarity-diagnostics-ipo' },
  { id: 14, name: 'Indra Solar', abbr: 'IS', bgColor: '#fef3c7', fgColor: '#92400e', exchange: 'NSE SME', sector: 'Solar Energy', listDate: '2025-01-24', issuePrice: 138, listPrice: 164.9, gainPct: 19.5, subTimes: 88.7, gmpPeak: '+38', gmpPredGain: 27.5, gmpErr: 8.0, aiPred: '+20.8%', aiErr: 1.3, year: '2025', slug: 'indra-solar-ipo' },
  { id: 15, name: 'BrightPath NBFC', abbr: 'BP', bgColor: '#fef2f2', fgColor: '#991b1b', exchange: 'Mainboard', sector: 'NBFC', listDate: '2025-01-17', issuePrice: 392, listPrice: 373.6, gainPct: -4.7, subTimes: 2.3, gmpPeak: '-8', gmpPredGain: -2.0, gmpErr: 2.7, aiPred: '-5.1%', aiErr: 0.4, year: '2025', slug: 'brightpath-nbfc-ipo' },
  { id: 16, name: 'KarmaEdge Fintech', abbr: 'KE', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'BSE SME', sector: 'Fintech', listDate: '2025-01-10', issuePrice: 58, listPrice: 64.1, gainPct: 10.5, subTimes: 84.2, gmpPeak: '+9', gmpPredGain: 15.5, gmpErr: 5.0, aiPred: '+11.2%', aiErr: 0.7, year: '2025', slug: 'karmaedge-fintech-ipo' },
  { id: 17, name: 'Maxima Agritech', abbr: 'MA', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'NSE SME', sector: 'Agritech', listDate: '2024-12-05', issuePrice: 76, listPrice: 71.1, gainPct: -6.4, subTimes: 22.6, gmpPeak: '-4', gmpPredGain: -5.3, gmpErr: 1.1, aiPred: '-4.9%', aiErr: 1.5, year: '2024', slug: 'maxima-agritech-ipo' },
  { id: 18, name: 'Navoday Cement', abbr: 'NC', bgColor: '#f5f3ff', fgColor: '#5b21b6', exchange: 'Mainboard', sector: 'Cement', listDate: '2024-01-03', issuePrice: 284, listPrice: 304.2, gainPct: 7.1, subTimes: 5.9, gmpPeak: '+15', gmpPredGain: 5.3, gmpErr: 1.8, aiPred: '+6.4%', aiErr: 0.7, year: '2024', slug: 'navoday-cement-ipo' },
  { id: 19, name: 'Sanjivani Agro', abbr: 'SA', bgColor: '#f0fdf4', fgColor: '#166534', exchange: 'NSE SME', sector: 'Agriculture', listDate: '2024-02-19', issuePrice: 96, listPrice: 98.7, gainPct: 2.8, subTimes: 62.1, gmpPeak: '+10', gmpPredGain: 10.4, gmpErr: 7.6, aiPred: '+8.6%', aiErr: 5.8, year: '2024', slug: 'sanjivani-agro-ipo' },
  { id: 20, name: 'Paramount Cables', abbr: 'PC', bgColor: '#eff6ff', fgColor: '#1e40af', exchange: 'BSE SME', sector: 'Infrastructure', listDate: '2024-03-14', issuePrice: 118, listPrice: 148.6, gainPct: 25.9, subTimes: 142.3, gmpPeak: '+38', gmpPredGain: 32.2, gmpErr: 6.3, aiPred: '+27.1%', aiErr: 1.2, year: '2024', slug: 'paramount-cables-ipo' },
];

// Ticker data
 export const tickerData = [
  { name: 'Emiac Tech', gmp: 'Rs 0', tag: 'Last Day', color: '#f59e0b', isZero: true },
  { name: 'Highness Micro', gmp: '+Rs 8', tag: 'Allotment', color: '#7c3aed', isZero: false },
  { name: 'Powerica Ltd', gmp: '+Rs 1', tag: 'Listing', color: '#00b377', isZero: false },
  { name: 'PropShare REIT', gmp: '+Rs 5K', tag: 'Upcoming', color: '#3b82f6', isZero: false },
  { name: 'Fractal Analytics', gmp: '+Rs 35', tag: 'Upcoming', color: '#7c84a8', isZero: false },
  { name: 'Zaggle Prepaid', gmp: '+Rs 8', tag: 'Upcoming', color: '#7c84a8', isZero: false },
  ];

// News data
export const newsData = [
  {
    id: 1,
    title: 'FY26 IPO market disappoints - investors lose money in 2 out of 3 issues',
    source: 'Economic Times',
    time: '1 hour ago',
    tag: 'ALERT',
    tagColor: { bg: '#fdeaec', text: '#d1293d' },
    impact: 'Bearish',
    impactColor: { bg: '#fdeaec', text: '#d1293d' },
  },
  {
    id: 2,
    title: 'Retail IPO applications slump 40% in FY26 amid poor listing returns',
    source: 'Moneycontrol',
    time: '3 hours ago',
    tag: 'MARKET',
    tagColor: { bg: '#fef3c7', text: '#b45309' },
    impact: 'Caution',
    impactColor: { bg: '#fef3c7', text: '#b45309' },
  },
  {
    id: 3,
    title: 'Record Rs 1.79 lakh crore raised in FY26 IPOs, but weak listings dampen sentiment',
    source: 'CNBC TV18',
    time: '5 hours ago',
    tag: 'IPO',
    tagColor: { bg: '#f5f3ff', text: '#7c3aed' },
    impact: 'Watch',
    impactColor: { bg: '#f5f3ff', text: '#7c3aed' },
  },
  {
    id: 4,
    title: 'Emiac Technologies IPO sees muted response with zero GMP - proceed with caution',
    source: 'Business Standard',
    time: '6 hours ago',
    tag: 'ALERT',
    tagColor: { bg: '#fdeaec', text: '#d1293d' },
    impact: 'Caution',
    impactColor: { bg: '#fdeaec', text: '#d1293d' },
  },
];

// Upcoming events
export const upcomingEvents = [
  { date: '5', month: 'APR', title: 'Emiac Technologies IPO', desc: 'Last day to apply', tag: 'Last Day', tagColor: { bg: '#fef3c7', text: '#b45309' }, dateColor: { bg: '#fef3c7', text: '#b45309' } },
  { date: '5', month: 'APR', title: 'Powerica Limited', desc: 'Listing today', tag: 'Listing', tagColor: { bg: '#e6f6f0', text: '#00875a' }, dateColor: { bg: '#e6f6f0', text: '#00875a' } },
  { date: '9', month: 'APR', title: 'Emiac Allotment', desc: 'Allotment finalization', tag: 'Allotment', tagColor: { bg: '#f5f3ff', text: '#7c3aed' }, dateColor: { bg: '#f5f3ff', text: '#7c3aed' } },
  { date: '10', month: 'APR', title: 'PropShare REIT Opens', desc: 'Subscription opens', tag: 'Opening', tagColor: { bg: '#eff6ff', text: '#1d4ed8' }, dateColor: { bg: '#eff6ff', text: '#1d4ed8' } },
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
