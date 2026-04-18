import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ArchiveTable } from '@/components/listed/archive-table';
import {
  getAvailableYears,
  getListedIposByYear,
  getMergedListedIposByYear,
  getMergedAvailableYears,
} from '@/lib/listed-ipos/loader';

// ISR: revalidate every hour so DB-sourced IPOs appear without a full rebuild
export const revalidate = 3600;
// Allow dynamic params for DB-only years not in CSV
export const dynamicParams = true;

export function generateStaticParams() {
  return getAvailableYears().map((y) => ({ year: String(y) }));
}

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  if (n < 2000 || n > 2100) return null;
  return n;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string }>;
}): Promise<Metadata> {
  const { year: yearStr } = await params;
  const year = parseYear(yearStr);
  if (!year) return {};

  const rows = getListedIposByYear(year);
  const total = rows.length;
  const positive = rows.filter(
    (r) => (r.listingGainPct ?? 0) > 0
  ).length;
  const avgGain =
    total > 0
      ? rows.reduce((a, r) => a + (r.listingGainPct ?? 0), 0) / total
      : 0;

  const title = `Listed IPO ${year} - Listing Gains, GMP, Subscription | IPOGyani`;
  const description =
    total > 0
      ? `All ${total} IPOs listed in ${year} on BSE & NSE. ${positive} positive listings, ${avgGain.toFixed(
          1
        )}% average listing gain. Track IPO GMP, subscription, listing price and day-1 performance for every ${year} IPO.`
      : `Complete database of IPOs listed on BSE and NSE in ${year}. Track listing gains, IPO GMP, subscription numbers and listing day performance.`;

  return {
    title,
    description,
    keywords: [
      `listed IPO ${year}`,
      `IPO listing gain ${year}`,
      `IPO GMP ${year}`,
      `IPO subscription ${year}`,
      `mainboard IPO ${year}`,
      `SME IPO ${year}`,
      'upcoming IPO',
      'IPO India',
    ].join(', '),
    alternates: {
      canonical: `/listed/${year}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/listed/${year}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ListedYearPage({
  params,
}: {
  params: Promise<{ year: string }>;
}) {
  const { year: yearStr } = await params;
  const year = parseYear(yearStr);
  if (!year) notFound();

  const rows = getListedIposByYear(year);
  if (rows.length === 0) notFound();

  const availableYears = getAvailableYears();
  const total = rows.length;
  const positive = rows.filter((r) => (r.listingGainPct ?? 0) > 0).length;
  const negative = rows.filter((r) => (r.listingGainPct ?? 0) < 0).length;
  const avgGain =
    rows.reduce((a, r) => a + (r.listingGainPct ?? 0), 0) / total;
  const avgClosingGain =
    rows.reduce((a, r) => a + (r.listingGainClosingPct ?? 0), 0) / total;
  const bestGain = rows.reduce<typeof rows[number] | null>((best, r) => {
    if (r.listingGainPct == null) return best;
    if (!best || r.listingGainPct > (best.listingGainPct ?? -Infinity)) return r;
    return best;
  }, null);
  const worstGain = rows.reduce<typeof rows[number] | null>((worst, r) => {
    if (r.listingGainPct == null) return worst;
    if (!worst || r.listingGainPct < (worst.listingGainPct ?? Infinity)) return r;
    return worst;
  }, null);

  const stats = [
    { value: String(total), label: 'IPOs Listed', color: 'text-white' },
    {
      value: `${((positive / total) * 100).toFixed(0)}%`,
      label: 'Positive Listings',
      color: 'text-emerald-mid',
    },
    {
      value: `${avgGain.toFixed(1)}%`,
      label: 'Avg Listing Gain',
      color: 'text-[#60a5fa]',
    },
    {
      value: `${avgClosingGain.toFixed(1)}%`,
      label: 'Avg Close Gain',
      color: 'text-[#a78bfa]',
    },
  ];

  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Listed IPOs ${year}`,
    numberOfItems: total,
    itemListElement: rows.slice(0, 50).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `/listed/${year}/${r.slug}`,
      name: r.name,
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />

      <main>
        {/* Hero */}
        <div className="bg-foreground py-14 px-5 relative overflow-hidden">
          <div className="max-w-[1440px] mx-auto relative">
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-white/60 mb-3">
              <Link href="/listed" className="hover:text-white">
                Listed IPOs
              </Link>
              <span>/</span>
              <span className="text-primary">{year}</span>
            </div>

            <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-black text-white leading-tight mb-3">
              Listed IPOs <span className="text-primary">{year}</span>
            </h1>

            <p className="text-[15px] text-white/60 max-w-2xl mb-8">
              Complete archive of all mainboard and SME IPOs listed on BSE & NSE
              in {year}. Track IPO GMP, listing gain, subscription data and
              day-1 performance for every listing.
            </p>

            <div className="flex flex-wrap gap-4 mb-8">
              {stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 min-w-[120px]"
                >
                  <div
                    className={`font-[family-name:var(--font-sora)] text-2xl font-black ${stat.color}`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[11px] text-white/40 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Year quick nav */}
            <div className="flex flex-wrap gap-2">
              {availableYears.map((y) => (
                <Link
                  key={y}
                  href={`/listed/${y}`}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    y === year
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-5 py-6 pb-16 space-y-6">
          {/* Best / Worst highlight cards */}
          {(bestGain || worstGain) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bestGain && (
                <Link
                  href={`/listed/${year}/${bestGain.slug}`}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-emerald transition-colors"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink3 mb-2">
                    Best listing of {year}
                  </div>
                  <div className="font-bold text-lg text-foreground mb-1">
                    {bestGain.name}
                  </div>
                  <div className="text-3xl font-black text-emerald-mid">
                    {bestGain.listingGainPct != null
                      ? `+${bestGain.listingGainPct.toFixed(1)}%`
                      : '-'}
                  </div>
                  <div className="text-xs text-ink3 mt-1">
                    {bestGain.sector} - listed{' '}
                    {bestGain.listingDate || bestGain.listingDateRaw}
                  </div>
                </Link>
              )}
              {worstGain && (
                <Link
                  href={`/listed/${year}/${worstGain.slug}`}
                  className="bg-card border border-border rounded-2xl p-5 hover:border-destructive transition-colors"
                >
                  <div className="text-[11px] font-bold uppercase tracking-wider text-ink3 mb-2">
                    Weakest listing of {year}
                  </div>
                  <div className="font-bold text-lg text-foreground mb-1">
                    {worstGain.name}
                  </div>
                  <div className="text-3xl font-black text-destructive">
                    {worstGain.listingGainPct != null
                      ? `${worstGain.listingGainPct.toFixed(1)}%`
                      : '-'}
                  </div>
                  <div className="text-xs text-ink3 mt-1">
                    {worstGain.sector} - listed{' '}
                    {worstGain.listingDate || worstGain.listingDateRaw}
                  </div>
                </Link>
              )}
            </div>
          )}

          <ArchiveTable year={year} rows={rows} />

          {/* SEO content block */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-4">
              IPOs listed in {year} - summary
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
              <div className="space-y-3">
                <p>
                  In {year}, a total of <strong>{total}</strong> companies listed
                  on BSE and NSE through an IPO. Of these,{' '}
                  <strong>{positive}</strong> listed above issue price and{' '}
                  <strong>{negative}</strong> listed at a discount. The average
                  listing-day gain was <strong>{avgGain.toFixed(1)}%</strong>{' '}
                  and the average listing-day closing gain was{' '}
                  <strong>{avgClosingGain.toFixed(1)}%</strong>.
                </p>
                <p>
                  Each row in the table links to a detailed IPO page with
                  complete subscription breakdown (QIB, HNI/NII, Retail), full
                  GMP history (Day 1 - Day 5), issue size, fresh issue vs OFS
                  split, and Nifty performance around the listing window.
                </p>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold text-foreground mb-3">
                  Related searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    `IPO GMP ${year}`,
                    `IPO listing gain ${year}`,
                    `Best IPO of ${year}`,
                    `Mainboard IPO ${year}`,
                    `SME IPO ${year}`,
                    `Upcoming IPO`,
                    `IPO subscription ${year}`,
                  ].map((term) => (
                    <Link
                      key={term}
                      href="/listed"
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border border-border text-primary-mid hover:bg-primary-bg transition-colors"
                    >
                      {term}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Footer />
    </div>
  );
}
