import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Ticker } from '@/components/ticker';
import { CurrentIPOs } from '@/components/home/current-ipos';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import { Activity, ChevronRight } from 'lucide-react';

// Same rationale as the homepage: always render from live Supabase data so
// the page never shows stale content after a status change in admin.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Live IPOs 2026 - Open & Upcoming IPO Bids Today | IPOGyani',
  description:
    'All IPOs currently open for bidding in India, plus awaiting-allotment and awaiting-listing IPOs. Live GMP, subscription and AI predicted listing gains.',
  alternates: { canonical: 'https://ipogyani.com/live' },
};

export default async function LiveIPOsPage() {
  const ipos = await getCurrentIPOs();

  // Count IPOs that are actually live (open for bidding). The CurrentIPOs
  // component handles empty/awaiting/upcoming fallbacks on its own.
  const liveCount = ipos.filter(
    (i) => i.status === 'open' || i.status === 'lastday'
  ).length;

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />

      <main className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-ink3 mb-4">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-ink">Live IPOs</span>
        </nav>

        {/* Hero */}
        <div className="mb-6 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-bg flex items-center justify-center shrink-0">
            <Activity className="w-6 h-6 text-emerald" />
          </div>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-1">
              Live IPOs
            </h1>
            <p className="text-ink3 text-sm md:text-base">
              {liveCount > 0
                ? `${liveCount} IPO${liveCount === 1 ? '' : 's'} open for bidding right now, plus recent closed IPOs awaiting allotment or listing.`
                : 'No IPOs are open for bidding right now. Tracking upcoming and awaiting-listing IPOs below.'}
            </p>
          </div>
        </div>

        {/* Reuse the same grouped Current / Awaiting / Upcoming component
            the homepage uses so behaviour stays consistent. */}
        <CurrentIPOs ipos={ipos} />
      </main>

      <Footer />
    </div>
  );
}
