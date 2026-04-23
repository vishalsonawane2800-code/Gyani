import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Ticker } from '@/components/ticker';
import { Footer } from '@/components/footer';
import { LiveSubscriptionDetails } from '@/components/subscription/live-subscription-details';
import { ListingGainSummary } from '@/components/subscription/listing-gain-summary';
import { ProbabilityCalculator } from '@/components/subscription/probability-calculator';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import {
  getMergedAvailableYears,
  getMergedListedIposByYear,
} from '@/lib/listed-ipos/loader';
import { Users, ChevronRight, BarChart3, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IPO Subscription & Allotment Probability Calculator | IPOGyani',
  description:
    'Historical avg and median listing gains for Mainboard and SME IPOs, a retail allotment probability calculator (1 / retail subscription, capped at 100%), and live subscription tracking for current IPOs.',
  alternates: { canonical: 'https://ipogyani.com/subscription' },
};

// Compute avg + median listing gain from an array of values. Returns null
// when the bucket is empty so callers can render a dash instead of a
// misleading "+0%".
function summarize(values: number[]): { avg: number | null; median: number | null } {
  if (values.length === 0) return { avg: null, median: null };
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  const sorted = [...values].sort((a, b) => a - b);
  const median =
    values.length % 2 === 1
      ? sorted[(values.length - 1) / 2]
      : (sorted[values.length / 2 - 1] + sorted[values.length / 2]) / 2;
  return { avg, median };
}

export default async function SubscriptionPage() {
  // Pull the full listed-IPO excel history across every available year,
  // then bucket by Mainboard vs SME so we can surface avg / median listing
  // gain for each segment. The listed IPO excel sheet is the single source
  // of truth for these historical numbers.
  const years = await getMergedAvailableYears();
  const rowsByYear = await Promise.all(
    years.map((y) => getMergedListedIposByYear(y))
  );
  const listedRows = rowsByYear.flat();

  const mainboardGains = listedRows
    .filter((r) => r.exchange !== 'BSE SME' && r.exchange !== 'NSE SME' && r.listingGainPct !== null && r.listingGainPct !== undefined)
    .map((r) => r.listingGainPct as number);
  const smeGains = listedRows
    .filter((r) => (r.exchange === 'BSE SME' || r.exchange === 'NSE SME') && r.listingGainPct !== null && r.listingGainPct !== undefined)
    .map((r) => r.listingGainPct as number);

  const mainboardSummary = summarize(mainboardGains);
  const smeSummary = summarize(smeGains);

  const yearsLabel =
    years.length === 0
      ? ''
      : years.length === 1
      ? `${years[0]}`
      : `${Math.min(...years.map(Number))} - ${Math.max(...years.map(Number))}`;

  // Live subscription data for the bottom section.
  const currentIpos = await getCurrentIPOs();

  // Any IPO that still has meaningful subscription data to surface — open +
  // lastday for live bidding, plus closed/allot/listing so the day-wise
  // history remains visible after bidding ends. We prioritise live IPOs by
  // putting them first in the list.
  const liveOrder: Record<string, number> = {
    lastday: 0,
    open: 1,
    closed: 2,
    allot: 3,
    listing: 4,
  };
  const liveCycleIPOs = currentIpos
    .filter((i) =>
      ['open', 'lastday', 'closed', 'allot', 'listing'].includes(i.status)
    )
    .sort(
      (a, b) =>
        (liveOrder[a.status] ?? 99) - (liveOrder[b.status] ?? 99)
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
          <span className="text-ink">Subscription</span>
        </nav>

        {/* Hero */}
        <div className="mb-6 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-1">
              IPO Subscription &amp; Allotment
            </h1>
            <p className="text-ink3 text-sm md:text-base">
              Listing-gain history from our listed IPO dataset, a quick
              retail allotment probability calculator, and live subscription
              tracking for every current IPO.
            </p>
          </div>
        </div>

        {/* Listing-gain summary pulled directly from the listed IPO excel
            sheet — avg and median gains bucketed by Mainboard vs SME. */}
        <ListingGainSummary
          mainboard={{
            count: mainboardGains.length,
            avg: mainboardSummary.avg,
            median: mainboardSummary.median,
          }}
          sme={{
            count: smeGains.length,
            avg: smeSummary.avg,
            median: smeSummary.median,
          }}
          yearsLabel={yearsLabel}
        />

        {/* Retail allotment probability calculator: 1 / retail sub (capped
            at 100%). Lets investors gauge their odds before applying. */}
        <div className="mt-6">
          <ProbabilityCalculator />
        </div>

        {/* Live subscription per current IPO — day-wise + category-wise,
            fetched directly from the same subscription_live +
            subscription_history tables the IPO detail page uses. */}
        {liveCycleIPOs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
                Live Subscription - Current IPOs
              </h2>
              <div className="ml-auto flex items-center gap-1 text-xs text-ink3">
                <Clock className="w-3.5 h-3.5" />
                Updated hourly
              </div>
            </div>

            <p className="text-sm text-ink3 mb-4">
              Click any IPO to expand the category-wise breakdown (QIB, NII,
              retail, employee, anchor) and day-wise subscription history.
            </p>

            <LiveSubscriptionDetails ipos={liveCycleIPOs} />
          </section>
        )}

        {/* Footer note */}
        <div className="mt-10 bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-sm font-bold text-ink">
              How we compute these stats
            </h2>
          </div>
          <ul className="text-sm text-ink2 space-y-1.5 list-disc pl-5">
            <li>
              <strong>Avg / Median Listing Gain</strong> is calculated from
              the listing-day gain % of every row in our listed IPO excel
              sheet, bucketed by Mainboard and SME.
            </li>
            <li>
              <strong>Allotment Probability</strong> uses the standard
              retail-category formula <code>1 / retail subscription</code>,
              capped at 100% when the category is undersubscribed.
            </li>
            <li>
              <strong>Live Subscription</strong> streams from the same
              subscription tables powering the IPO detail page and refreshes
              hourly on bidding days.
            </li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
