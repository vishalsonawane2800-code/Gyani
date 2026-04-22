import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Ticker } from '@/components/ticker';
import { Footer } from '@/components/footer';
import { SubscriptionStats } from '@/components/subscription/subscription-stats';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import {
  getMergedAvailableYears,
  getMergedListedIposByYear,
} from '@/lib/listed-ipos/loader';
import type { ListedIPO, ExchangeType } from '@/lib/data';
import { Users, ChevronRight, BarChart3, Clock, Briefcase, UserCheck, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'IPO Subscription Stats 2026 - Mainboard vs SME | IPOGyani',
  description:
    'Year-wise IPO subscription and listing-gain statistics for Mainboard and SME IPOs. Average subscription, average / median listing gains, and live counts of IPOs listed in profit or loss.',
  alternates: { canonical: 'https://ipogyani.com/subscription' },
};

// Same cheap mapper used on the home page, inlined so we avoid importing a
// private helper. Only the fields Subscription Stats reads are populated.
function toListedIpoCard(
  row: Awaited<ReturnType<typeof getMergedListedIposByYear>>[number],
  index: number
): ListedIPO {
  // Fall back to Mainboard when the row doesn't have a recognised exchange
  // string - still preferable to dropping it silently.
  const exchange: ExchangeType =
    row.exchange === 'BSE SME'
      ? 'BSE SME'
      : row.exchange === 'NSE SME'
      ? 'NSE SME'
      : row.exchange === 'REIT'
      ? 'REIT'
      : 'Mainboard';

  return {
    id: index + 1,
    name: row.name,
    slug: row.slug,
    abbr: row.name.slice(0, 2).toUpperCase(),
    bgColor: '#f0f9ff',
    fgColor: '#0369a1',
    exchange,
    sector: row.sector || 'General',
    listDate: row.listingDate,
    issuePrice: row.issuePriceUpper ?? 0,
    listPrice: row.listingPrice ?? 0,
    gainPct: row.listingGainPct ?? 0,
    subTimes: row.day3Sub ?? 0,
    gmpPeak: '-',
    aiPred: '-',
    aiErr: 0,
    year: String(row.year),
  };
}

export default async function SubscriptionPage() {
  const years = await getMergedAvailableYears();
  const rowsByYear = await Promise.all(
    years.map((y) => getMergedListedIposByYear(y))
  );
  const listed: ListedIPO[] = rowsByYear.flat().map((row, idx) => toListedIpoCard(row, idx));

  // Count IPOs that are listing today (or currently in the listing state)
  // and bucket by current / listing price vs issue price. This mirrors the
  // "IPOs Open in Profit / Loss" tiles in the reference design.
  const currentIpos = await getCurrentIPOs();
  const listingToday = currentIpos.filter((i) => i.status === 'listing');
  const listedAboveIssue = listingToday.filter(
    (i) => (i.listingGainPercent ?? i.gmpPercent ?? 0) > 0
  ).length;
  const listedBelowIssue = listingToday.filter(
    (i) => (i.listingGainPercent ?? i.gmpPercent ?? 0) < 0
  ).length;

  // Open IPOs that are still bidding - showcased below the stats.
  const openIPOs = currentIpos.filter(
    (i) => i.status === 'open' || i.status === 'lastday'
  );

  const yearStrings = years.map((y) => String(y));

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
              IPO Subscription Stats
            </h1>
            <p className="text-ink3 text-sm md:text-base">
              Switch between Mainboard and SME, change the year, and see how
              this year&apos;s listings have performed at a glance.
            </p>
          </div>
        </div>

        {/* Stats reference component (tabs + 6 tiles) */}
        <SubscriptionStats
          listed={listed}
          years={yearStrings}
          openToday={{ listedAboveIssue, listedBelowIssue }}
        />

        {/* Live subscription of currently-open IPOs */}
        {openIPOs.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald animate-pulse" />
              <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
                Live Subscription - Open IPOs
              </h2>
              <div className="ml-auto flex items-center gap-1 text-xs text-ink3">
                <Clock className="w-3.5 h-3.5" />
                Updated hourly
              </div>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-4 font-semibold text-ink2 min-w-[180px]">
                        IPO
                      </th>
                      <th className="text-center p-4 font-semibold text-ink2">
                        Day
                      </th>
                      <th className="text-right p-4 font-semibold text-ink2">
                        <div className="inline-flex items-center gap-1">
                          <Briefcase className="w-4 h-4" />
                          QIB
                        </div>
                      </th>
                      <th className="text-right p-4 font-semibold text-ink2">
                        <div className="inline-flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          NII
                        </div>
                      </th>
                      <th className="text-right p-4 font-semibold text-ink2">
                        <div className="inline-flex items-center gap-1">
                          <UserCheck className="w-4 h-4" />
                          Retail
                        </div>
                      </th>
                      <th className="text-right p-4 font-semibold text-ink2">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {openIPOs.map((ipo, idx) => (
                      <tr
                        key={ipo.slug}
                        className={`${
                          idx !== openIPOs.length - 1 ? 'border-b border-border' : ''
                        } hover:bg-secondary/30 transition-colors`}
                      >
                        <td className="p-4">
                          <Link
                            href={`/ipo/${ipo.slug}`}
                            className="font-semibold text-ink hover:text-primary transition-colors"
                          >
                            {ipo.name}
                          </Link>
                          <p className="text-xs text-ink3 mt-0.5">
                            {ipo.exchange}
                          </p>
                        </td>
                        <td className="text-center p-4">
                          <span className="px-2 py-1 rounded bg-secondary text-ink2 text-xs font-medium">
                            Day {ipo.subscription.day}
                          </span>
                        </td>
                        <td className="text-right p-4 font-semibold text-ink">
                          {ipo.subscription.qib}
                        </td>
                        <td className="text-right p-4 font-semibold text-ink">
                          {ipo.subscription.nii}
                        </td>
                        <td className="text-right p-4 font-semibold text-ink">
                          {ipo.subscription.retail}
                        </td>
                        <td className="text-right p-4">
                          <span
                            className={`font-bold ${
                              ipo.subscription.total > 10
                                ? 'text-emerald'
                                : ipo.subscription.total > 1
                                ? 'text-cobalt'
                                : 'text-ink'
                            }`}
                          >
                            {ipo.subscription.total.toFixed(2)}x
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
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
              <strong>Avg Subscription</strong> averages the final subscription
              multiple across all listed IPOs in the selected year.
            </li>
            <li>
              <strong>Avg / Median Listing Gain</strong> uses the listing-day
              gain % recorded for each listed IPO.
            </li>
            <li>
              <strong>IPOs Open in Profit / Loss</strong> counts IPOs currently
              on their listing day with a positive / negative listing gain.
            </li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
}
