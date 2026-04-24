import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Ticker } from '@/components/ticker';
import { Footer } from '@/components/footer';
import { GMPTodayTable } from '@/components/gmp/gmp-today-table';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import { TrendingUp, Clock, ChevronRight, Info, Sparkles } from 'lucide-react';

// Supabase-backed; keep it fresh on every request.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IPO GMP Today 2026 - Live Grey Market Premium + AI Predictions | IPOGyani',
  description:
    'Live IPO Grey Market Premium (GMP) with AI-predicted listing gains and per-lot rupee gain estimates for every current IPO in India. Click any row to see the full GMP trend chart.',
  alternates: { canonical: 'https://ipogyani.com/gmp' },
};

export default async function GMPPage() {
  const ipos = await getCurrentIPOs();

  // Only show IPOs that are still in their live cycle (open / lastday /
  // closed waiting for allotment / allot / listing). Upcoming IPOs rarely
  // have meaningful GMP yet and already have their own page.
  const liveCycle = ipos.filter(
    (i) =>
      i.status === 'open' ||
      i.status === 'lastday' ||
      i.status === 'closed' ||
      i.status === 'allot' ||
      i.status === 'listing'
  );

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
          <span className="text-ink">GMP Today</span>
        </nav>

        {/* Hero */}
        <div className="mb-6 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-bg flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6 text-emerald" />
          </div>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-1">
              IPO GMP Today
            </h1>
            <p className="text-ink3 text-sm md:text-base">
              Live Grey Market Premium alongside our AI-predicted listing gain and
              the rupee impact on a single lot. Click any row to see the GMP trend.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-cobalt-bg border border-cobalt/20 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Info className="w-5 h-5 text-cobalt flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-cobalt font-semibold mb-1">
              About GMP &amp; AI Prediction
            </p>
            <p className="text-sm text-ink2">
              GMP is an unofficial grey-market signal; the AI prediction is a
              model estimate of listing-day gains based on subscription velocity,
              peers and fundamentals. Neither is guaranteed. Use both alongside
              the full IPO analysis before investing.
            </p>
          </div>
        </div>

        {/* Last updated strip */}
        <div className="flex items-center gap-2 text-sm text-ink3 mb-4">
          <Clock className="w-4 h-4" />
          <span>
            GMP data updated every 15 minutes. Last updated:{' '}
            {new Date().toLocaleString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>

        {/* Live GMP table (client component handles row-expand chart) */}
        <GMPTodayTable ipos={liveCycle} />

        {/* Quick legend */}
        <section className="grid md:grid-cols-2 gap-4 mt-8">
          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-emerald" />
              <h2 className="font-heading text-base font-bold text-ink">
                How we compute 1-lot gains
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-ink2">
              <li>
                <strong>GMP Gain / Lot</strong> = GMP x Lot Size. Reflects the
                current grey-market premium translated into a rupee amount for
                one HNI/Retail lot.
              </li>
              <li>
                <strong>AI Gain / Lot</strong> = Upper Price x AI Predicted % x
                Lot Size / 100. Uses our model output rather than grey market.
              </li>
            </ul>
          </div>

          <div className="bg-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="font-heading text-base font-bold text-ink">
                Reading AI vs GMP
              </h2>
            </div>
            <ul className="space-y-2 text-sm text-ink2">
              <li>
                When AI and GMP agree, confidence in a positive/negative listing
                is typically higher.
              </li>
              <li>
                When they disagree, read the full analysis on the IPO page -
                subscription pattern often explains the gap.
              </li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
