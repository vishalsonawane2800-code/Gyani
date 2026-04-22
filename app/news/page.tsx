import type { Metadata } from 'next';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { NewsSection, type NewsSectionItem } from '@/components/home/news-section';
import { getMarketNews } from '@/lib/supabase/queries';

// Always render fresh - market news is time-sensitive and admin edits
// (publish/unpublish, reorder, new items) should surface immediately.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IPO Market News 2026 - Latest Updates, Alerts & Regulatory News | IPOGyani',
  description:
    'Stay updated with the latest IPO market news, SEBI regulatory updates, listing alerts, and market-moving stories curated by IPOGyani.',
  keywords:
    'IPO news, IPO market news, SEBI news, IPO alerts, IPO listing news, mainboard IPO news, SME IPO news',
  openGraph: {
    title: 'IPO Market News 2026 - Latest Updates | IPOGyani',
    description:
      'Curated IPO market news, regulatory updates, and listing alerts.',
    url: 'https://ipogyani.com/news',
    type: 'website',
  },
  alternates: {
    canonical: 'https://ipogyani.com/news',
  },
};

export default async function NewsPage() {
  // Pull a generous window of published news. The underlying table is
  // small (curated by admins) so a 100-row cap is plenty while keeping
  // the page snappy.
  const news = await getMarketNews({ limit: 100 });

  const items: NewsSectionItem[] = news.map((n) => ({
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

      <main className="max-w-[1040px] mx-auto px-5 py-8 pb-16">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">IPO Market News</h1>
          <p className="text-sm text-ink3 max-w-2xl">
            Latest IPO market updates, SEBI regulatory changes, listing alerts
            and sector moves - curated by the IPOGyani editorial team.
          </p>
        </header>

        <NewsSection items={items} />
      </main>

      <Footer />
    </div>
  );
}
