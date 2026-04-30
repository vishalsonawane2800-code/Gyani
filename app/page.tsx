import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/home/hero-section';
import { MarketSentimentScore } from '@/components/home/market-sentiment-score';
import { MarketSentiment } from '@/components/home/market-sentiment';
import { CurrentIPOs } from '@/components/home/current-ipos';
import { ListedIPOs } from '@/components/home/listed-ipos';
import { GMPTracker } from '@/components/home/gmp-tracker';
import { NewsSection } from '@/components/home/news-section';
import { Sidebar } from '@/components/home/sidebar';
import { CommunityReviews } from '@/components/home/community-reviews';
import { getCurrentIPOs, getIPOStats, getMarketNews } from '@/lib/supabase/queries';
import { getMergedAvailableYearsWithSme, getMergedListedIposByYearWithSme } from '@/lib/listed-ipos/loader';
import { getListedSmeIposByYear } from '@/lib/listed-sme-ipos/loader';
import type { ListedIPO } from '@/lib/data';
import type { NewsSectionItem } from '@/components/home/news-section';
import Link from 'next/link';

// Always render on the server with fresh data. Without this, Next.js can
// serve a cached RSC payload so newly-created / status-updated IPOs do
// not show up in the hero or the Current IPOs grid even though the
// header's live-count badge (which hits /api/public/live-ipo-count) sees
// them.
export const dynamic = 'force-dynamic';

const allPages = [
  { href: '/', label: 'Home' },
  { href: '/ipo-gmp', label: 'IPO GMP Guide' },
  { href: '/gmp', label: 'GMP Tracker' },
  { href: '/listing-gain', label: 'Listing Gain' },
  { href: '/best-ipo', label: 'Best IPO' },
  { href: '/allotment-status', label: 'Allotment Status' },
  { href: '/subscription-status', label: 'Subscription Status' },
  { href: '/upcoming', label: 'Upcoming IPOs' },
  { href: '/listed', label: 'Listed IPOs' },
  { href: '/sme', label: 'SME IPOs' },
  { href: '/shareholder-quota', label: 'Shareholder Quota' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/accuracy', label: 'AI Accuracy' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
];

function toListedIpoCard(
  row: Awaited<ReturnType<typeof getMergedListedIposByYearWithSme>>[number],
  index: number,
  isSme: boolean
): ListedIPO {
  const abbr = row.name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';

  const aiPredVal = row.aiPrediction;

  return {
    id: index + 1,
    name: row.name,
    slug: row.slug,
    abbr,
    bgColor: '#f0f9ff',
    fgColor: '#0369a1',
    exchange: isSme ? 'NSE SME' : 'NSE',
    sector: row.sector || 'General',
    listDate: row.listingDate,
    issuePrice: row.issuePriceUpper ?? 0,
    listPrice: row.listingPrice ?? 0,
    gainPct: row.listingGainPct ?? 0,
    subTimes: row.day3Sub ?? 0,
    gmpPeak: '-',
    aiPred: aiPredVal != null ? aiPredVal.toFixed(1) : '-',
    aiErr: 0,
    year: String(row.year),
  };
}

async function getRecentListedIpos(limit = 10): Promise<ListedIPO[]> {
  const years = await getMergedAvailableYearsWithSme();
  const rowsByYear = await Promise.all(years.map((y) => getMergedListedIposByYearWithSme(y)));
  const merged = rowsByYear
    .flat()
    .sort((a, b) => new Date(b.listingDate).getTime() - new Date(a.listingDate).getTime())
    .slice(0, limit);

  const smeSlugByYear = new Map<number, Set<string>>();
  for (const y of years) {
    smeSlugByYear.set(y, new Set(getListedSmeIposByYear(y).map((r) => r.slug)));
  }

  return merged.map((row, idx) => {
    const isSme = smeSlugByYear.get(row.year)?.has(row.slug) ?? false;
    return toListedIpoCard(row, idx, isSme);
  });
}

export default async function HomePage() {
  // Fetch data from Supabase. Sections render empty states when no admin
  // data has been added yet - we intentionally do NOT fall back to the
  // hardcoded demo IPOs in lib/data.ts.
  const [ipos, listedIpos, ipoStats, marketNews] = await Promise.all([
    getCurrentIPOs(),
    getRecentListedIpos(10),
    getIPOStats(),
    getMarketNews({ limit: 6 }),
  ]);

  // Map DB rows to the shape NewsSection expects.
  const newsItems: NewsSectionItem[] = marketNews.map(n => ({
    id: n.id,
    title: n.title,
    url: n.url,
    source: n.source,
    publishedAt: n.publishedAt,
    tag: n.tag,
    impact: n.impact,
  }));
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection ipos={ipos} />
      
      <main className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_312px] gap-6 items-start">
          {/* Main Column */}
          <div className="min-w-0">
            <MarketSentimentScore 
              score={56}
              description="Mixed market conditions with cautious investor sentiment. Recent IPO performance shows 2 out of 3 issues trading in negative territory. Retail applications showing -25% decline from historical average. Overall market indices stable with moderate volatility."
              signals={[
                { label: 'Recent Losses', value: '2 of 3', tone: 'negative' },
                { label: 'Retail Trend', value: '-25%', tone: 'negative' },
                { label: 'Market Volatility', value: 'Moderate', tone: 'neutral' },
              ]}
            />
            <MarketSentiment ipoStats={ipoStats} />
            <CurrentIPOs ipos={ipos} />
            <ListedIPOs listedIpos={listedIpos} />
            <GMPTracker ipos={ipos} />
            <NewsSection items={newsItems} />
          </div>
          
          {/* Sidebar */}
          <Sidebar />
        </div>

        {/* Community reviews — bottom of home, full width below the two-column grid */}
        <CommunityReviews />
      </main>
      
      {/* Quick Links to All Pages */}
      <div className="max-w-[1440px] mx-auto px-5 py-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold text-ink mb-3">All Pages (Quick Links)</h2>
          <div className="flex flex-wrap gap-2">
            {allPages.map((page) => (
              <Link 
                key={page.href} 
                href={page.href}
                className="px-3 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-lg text-sm text-ink2 transition-colors"
              >
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
