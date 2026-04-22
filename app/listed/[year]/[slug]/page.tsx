import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import {
  getMergedAvailableYears,
  getMergedListedIpo,
  getMergedListedIposByYear,
  type ListedIpoRecord,
} from '@/lib/listed-ipos/loader';

// ISR: revalidate every hour so newly migrated IPOs show up
export const revalidate = 3600;
// Allow on-demand rendering for IPOs added via the DB after build
export const dynamicParams = true;

export async function generateStaticParams() {
  const years = await getMergedAvailableYears();
  const params: Array<{ year: string; slug: string }> = [];
  for (const y of years) {
    const rows = await getMergedListedIposByYear(y);
    for (const r of rows) {
      params.push({ year: String(y), slug: r.slug });
    }
  }
  return params;
}

function parseYear(raw: string): number | null {
  if (!/^\d{4}$/.test(raw)) return null;
  const n = parseInt(raw, 10);
  if (n < 2000 || n > 2100) return null;
  return n;
}

function fmtRs(v: number | null): string {
  if (v == null) return '-';
  return `Rs ${v.toLocaleString('en-IN')}`;
}

function fmtPct(v: number | null, decimals = 2): string {
  if (v == null) return '-';
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(decimals)}%`;
}

function fmtX(v: number | null, decimals = 2): string {
  if (v == null) return '-';
  return `${v.toFixed(decimals)}x`;
}

function fmtNum(v: number | null, decimals = 2): string {
  if (v == null) return '-';
  return v.toFixed(decimals);
}

function tone(v: number | null, inverse = false): string {
  if (v == null) return 'text-ink3';
  const positive = inverse ? v < 0 : v > 0;
  const negative = inverse ? v > 0 : v < 0;
  if (positive) return 'text-emerald-mid';
  if (negative) return 'text-destructive';
  return 'text-ink2';
}

function formatDate(iso: string, raw: string): string {
  if (!iso) return raw || '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return raw || iso;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ year: string; slug: string }>;
}): Promise<Metadata> {
  const { year: yearStr, slug } = await params;
  const year = parseYear(yearStr);
  if (!year) return {};
  const ipo = await getMergedListedIpo(year, slug);
  if (!ipo) return {};

  const gainPart =
    ipo.listingGainPct != null
      ? `listed at ${ipo.listingGainPct > 0 ? '+' : ''}${ipo.listingGainPct.toFixed(
          1
        )}% gain`
      : 'listing performance';
  const subPart =
    ipo.day3Sub != null ? `, subscribed ${ipo.day3Sub.toFixed(2)}x` : '';
  const title = `${ipo.name} IPO Listing (${year}) - Listing Gain, GMP, Subscription | IPOGyani`;
  const description = `${ipo.name} IPO ${gainPart}${subPart}. Full breakdown of listing price, closing price, IPO GMP Day 1 - Day 5, QIB / HNI / Retail subscription, issue size and Nifty performance around the ${year} listing.`;

  return {
    title,
    description,
    keywords: [
      `${ipo.name} IPO`,
      `${ipo.name} IPO listing gain`,
      `${ipo.name} IPO GMP`,
      `${ipo.name} IPO subscription`,
      `${ipo.name} listing price`,
      `IPO ${year}`,
      `listed IPO ${year}`,
      'IPO GMP',
      'IPO listing gain',
      ipo.sector ? `${ipo.sector} IPO` : '',
    ]
      .filter(Boolean)
      .join(', '),
    alternates: {
      canonical: `/listed/${year}/${ipo.slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/listed/${year}/${ipo.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

function Stat({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink3 mb-1">
        {label}
      </div>
      <div
        className={`font-[family-name:var(--font-sora)] text-xl font-black ${
          valueClass ?? 'text-foreground'
        }`}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink3 mt-1">{sub}</div>}
    </div>
  );
}

function DataRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
      <span className="text-sm text-ink2">{label}</span>
      <span className={`text-sm font-bold ${valueClass ?? 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

function relatedByYear(
  all: ListedIpoRecord[],
  current: ListedIpoRecord
): ListedIpoRecord[] {
  return all
    .filter((r) => r.slug !== current.slug)
    .sort((a, b) => {
      // Same sector first, then by closest listing date
      const aSector = a.sector === current.sector ? 0 : 1;
      const bSector = b.sector === current.sector ? 0 : 1;
      if (aSector !== bSector) return aSector - bSector;
      return Math.abs(
        new Date(a.listingDate).getTime() -
          new Date(current.listingDate).getTime()
      ) -
        Math.abs(
          new Date(b.listingDate).getTime() -
            new Date(current.listingDate).getTime()
        );
    })
    .slice(0, 6);
}

export default async function ListedIpoDetail({
  params,
}: {
  params: Promise<{ year: string; slug: string }>;
}) {
  const { year: yearStr, slug } = await params;
  const year = parseYear(yearStr);
  if (!year) notFound();

  const ipo = await getMergedListedIpo(year, slug);
  if (!ipo) notFound();

  const allYear = await getMergedListedIposByYear(year);
  const related = relatedByYear(allYear, ipo);
  const availableYears = await getMergedAvailableYears();

  // Derived display values
  const listingDateDisplay = formatDate(ipo.listingDate, ipo.listingDateRaw);

  const primaryGainClass =
    ipo.listingGainPct == null
      ? 'text-foreground'
      : ipo.listingGainPct > 0
      ? 'text-emerald-mid'
      : 'text-destructive';

  // JSON-LD for rich results (FinancialProduct + BreadcrumbList)
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Listed IPOs', item: '/listed' },
        {
          '@type': 'ListItem',
          position: 2,
          name: `Listed IPOs ${year}`,
          item: `/listed/${year}`,
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${ipo.name} IPO`,
          item: `/listed/${year}/${ipo.slug}`,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: `${ipo.name} IPO`,
      category: ipo.sector || 'IPO',
      description: `${ipo.name} IPO listed on ${listingDateDisplay}. Issue price ${fmtRs(
        ipo.issuePriceUpper
      )}, listing price ${fmtRs(ipo.listingPrice)}, listing gain ${fmtPct(
        ipo.listingGainPct
      )}.`,
      ...(ipo.issueSizeCr != null && {
        offers: {
          '@type': 'Offer',
          price: ipo.issuePriceUpper ?? 0,
          priceCurrency: 'INR',
        },
      }),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What was the listing gain of ${ipo.name} IPO?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              ipo.listingGainPct != null
                ? `${ipo.name} IPO listed at ${fmtPct(
                    ipo.listingGainPct
                  )} versus the upper issue price of ${fmtRs(
                    ipo.issuePriceUpper
                  )} on ${listingDateDisplay}.`
                : `${ipo.name} IPO listed on ${listingDateDisplay}. Full listing price details are available on this page.`,
          },
        },
        {
          '@type': 'Question',
          name: `What was the subscription of ${ipo.name} IPO?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              ipo.day3Sub != null
                ? `${ipo.name} IPO was subscribed ${fmtX(
                    ipo.day3Sub
                  )} times overall - QIB ${fmtX(ipo.qibDay3)}, HNI/NII ${fmtX(
                    ipo.hniDay3
                  )}, Retail ${fmtX(ipo.retailDay3)}.`
                : `Subscription data for ${ipo.name} IPO is listed on this page across QIB, HNI/NII and Retail.`,
          },
        },
        {
          '@type': 'Question',
          name: `What was the GMP of ${ipo.name} IPO?`,
          acceptedAnswer: {
            '@type': 'Answer',
            text:
              ipo.gmpD1 != null || ipo.gmpD3 != null
                ? `${ipo.name} IPO GMP moved from ${fmtRs(
                    ipo.gmpD1
                  )} on Day 1 to ${fmtRs(
                    ipo.gmpD5 ?? ipo.gmpD3 ?? ipo.gmpD1
                  )} before listing. Full day-by-day GMP is available on this page.`
                : `Day-by-day IPO GMP history for ${ipo.name} is listed on this page.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />

      <main>
        {/* Hero */}
        <div className="bg-foreground py-10 md:py-14 px-5">
          <div className="max-w-[1200px] mx-auto">
            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-white/60 mb-3"
            >
              <Link href="/listed" className="hover:text-white">
                Listed IPOs
              </Link>
              <span>/</span>
              <Link href={`/listed/${year}`} className="hover:text-white">
                {year}
              </Link>
              <span>/</span>
              <span className="text-primary truncate max-w-[280px]">
                {ipo.name}
              </span>
            </nav>

            <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
              <div>
                <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-black text-white leading-tight">
                  {ipo.name} <span className="text-primary">IPO</span>
                </h1>
                <p className="text-[14px] text-white/60 mt-2">
                  {ipo.sector ? `${ipo.sector} - ` : ''}Listed on{' '}
                  {listingDateDisplay}
                </p>
              </div>
              {ipo.listingGainPct != null && (
                <div
                  className={`px-4 py-2 rounded-xl border font-[family-name:var(--font-sora)] text-2xl font-black ${
                    ipo.listingGainPct > 0
                      ? 'text-emerald-mid border-emerald/30 bg-emerald/10'
                      : 'text-destructive border-destructive/30 bg-destructive/10'
                  }`}
                >
                  {fmtPct(ipo.listingGainPct, 1)} listing gain
                </div>
              )}
            </div>

            {/* Top stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-[11px] text-white/40 uppercase font-bold tracking-wider">
                  Issue Price (Upper)
                </div>
                <div className="text-white font-[family-name:var(--font-sora)] text-xl font-black mt-1">
                  {fmtRs(ipo.issuePriceUpper)}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-[11px] text-white/40 uppercase font-bold tracking-wider">
                  Listing Price
                </div>
                <div
                  className={`font-[family-name:var(--font-sora)] text-xl font-black mt-1 ${primaryGainClass}`}
                >
                  {fmtRs(ipo.listingPrice)}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-[11px] text-white/40 uppercase font-bold tracking-wider">
                  Closing Price (NSE)
                </div>
                <div className="text-white font-[family-name:var(--font-sora)] text-xl font-black mt-1">
                  {fmtRs(ipo.closingPriceNse)}
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                <div className="text-[11px] text-white/40 uppercase font-bold tracking-wider">
                  Total Subscription
                </div>
                <div className="text-white font-[family-name:var(--font-sora)] text-xl font-black mt-1">
                  {fmtX(ipo.day3Sub)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-5 py-6 pb-16 space-y-6">
          {/* Summary paragraph - high keyword density */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
              {ipo.name} IPO listing summary
            </h2>
            <p className="text-[13.5px] text-ink2 leading-relaxed">
              {ipo.name}{' '}
              {ipo.sector ? `(${ipo.sector})` : ''} closed its IPO window in{' '}
              {year} and listed on NSE and BSE on{' '}
              <strong>{listingDateDisplay}</strong>
              {ipo.issuePriceUpper != null &&
                ` at an upper band issue price of Rs ${ipo.issuePriceUpper}`}
              {ipo.listingPrice != null &&
                `, opening at Rs ${ipo.listingPrice}`}
              {ipo.listingGainPct != null &&
                ` for a listing gain of ${fmtPct(ipo.listingGainPct, 1)}`}
              {ipo.closingPriceNse != null &&
                ` and closing day one at Rs ${ipo.closingPriceNse}`}
              {ipo.listingGainClosingPct != null &&
                ` (${fmtPct(ipo.listingGainClosingPct, 1)} on closing basis)`}
              . The IPO was subscribed <strong>{fmtX(ipo.day3Sub)}</strong>{' '}
              overall - QIB <strong>{fmtX(ipo.qibDay3)}</strong>, HNI/NII{' '}
              <strong>{fmtX(ipo.hniDay3)}</strong>, Retail{' '}
              <strong>{fmtX(ipo.retailDay3)}</strong>. The total issue size was{' '}
              <strong>
                {ipo.issueSizeCr != null
                  ? `Rs ${ipo.issueSizeCr.toLocaleString('en-IN')} Cr`
                  : 'available on this page'}
              </strong>
              {ipo.freshIssueCr != null && ipo.ofsCr != null &&
                ` (Fresh Issue Rs ${ipo.freshIssueCr} Cr, OFS Rs ${ipo.ofsCr} Cr)`}
              . IPO GMP data, subscription trends across Day 1 - Day 3 and
              Nifty performance around the listing window are detailed below.
            </p>
          </section>

          {/* Listing day metrics */}
          <section>
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
              Listing day performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Listing Gain (Open)"
                value={fmtPct(ipo.listingGainPct, 2)}
                valueClass={tone(ipo.listingGainPct)}
              />
              <Stat
                label="Listing Gain (Close)"
                value={fmtPct(ipo.listingGainClosingPct, 2)}
                valueClass={tone(ipo.listingGainClosingPct)}
              />
              <Stat
                label="Day Change After Listing"
                value={fmtPct(ipo.dayChangeAfterListingPct, 2)}
                valueClass={tone(ipo.dayChangeAfterListingPct)}
              />
              <Stat
                label="Retail Quota"
                value={
                  ipo.retailQuotaPct != null
                    ? `${ipo.retailQuotaPct.toFixed(1)}%`
                    : '-'
                }
              />
            </div>
          </section>

          {/* Subscription breakdown */}
          <section>
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
              Subscription breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Final (Day 3) subscription
                </h3>
                <p className="text-[12px] text-ink3 mb-3">
                  Number of times each investor category subscribed by close of
                  Day 3.
                </p>
                <DataRow label="QIB" value={fmtX(ipo.qibDay3)} />
                <DataRow label="HNI / NII" value={fmtX(ipo.hniDay3)} />
                <DataRow label="Retail" value={fmtX(ipo.retailDay3)} />
                <DataRow
                  label="Overall"
                  value={fmtX(ipo.day3Sub)}
                  valueClass="text-primary"
                />
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground mb-1">
                  Day-wise overall subscription
                </h3>
                <p className="text-[12px] text-ink3 mb-3">
                  How overall subscription built up across the three-day issue
                  window.
                </p>
                <DataRow label="Day 1" value={fmtX(ipo.day1Sub)} />
                <DataRow label="Day 2" value={fmtX(ipo.day2Sub)} />
                <DataRow
                  label="Day 3 (Final)"
                  value={fmtX(ipo.day3Sub)}
                  valueClass="text-primary"
                />
              </div>
            </div>
          </section>

          {/* GMP */}
          <section>
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
              {ipo.name} IPO GMP history
            </h2>
            <p className="text-[13px] text-ink2 mb-3 leading-relaxed">
              Grey market premium (GMP) tracked day-by-day across the IPO
              window. Absolute GMP is the premium in rupees over the upper
              issue price; GMP % is that premium as a percent of the issue
              price.
            </p>
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary">
                      <th className="text-left font-bold uppercase tracking-wide text-ink3 py-3 px-4">
                        Day
                      </th>
                      <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-4">
                        GMP (Rs)
                      </th>
                      <th className="text-right font-bold uppercase tracking-wide text-ink3 py-3 px-4">
                        GMP %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { d: 'Day 1', v: ipo.gmpD1, p: ipo.gmpPctD1 },
                      { d: 'Day 2', v: ipo.gmpD2, p: ipo.gmpPctD2 },
                      { d: 'Day 3', v: ipo.gmpD3, p: ipo.gmpPctD3 },
                      { d: 'Day 4', v: ipo.gmpD4, p: ipo.gmpPctD4 },
                      { d: 'Day 5', v: ipo.gmpD5, p: ipo.gmpPctD5 },
                    ].map((row) => (
                      <tr key={row.d} className="border-b border-border last:border-b-0">
                        <td className="py-3 px-4 text-foreground font-semibold">{row.d}</td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${tone(row.v)}`}
                        >
                          {row.v != null ? `Rs ${row.v}` : '-'}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${tone(row.p)}`}
                        >
                          {fmtPct(row.p)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Financials + Market context */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
                Issue & financials
              </h2>
              <DataRow
                label="Issue Size"
                value={
                  ipo.issueSizeCr != null
                    ? `Rs ${ipo.issueSizeCr.toLocaleString('en-IN')} Cr`
                    : '-'
                }
              />
              <DataRow
                label="Fresh Issue"
                value={
                  ipo.freshIssueCr != null
                    ? `Rs ${ipo.freshIssueCr.toLocaleString('en-IN')} Cr`
                    : '-'
                }
              />
              <DataRow
                label="OFS"
                value={
                  ipo.ofsCr != null
                    ? `Rs ${ipo.ofsCr.toLocaleString('en-IN')} Cr`
                    : '-'
                }
              />
              <DataRow label="IPO PE" value={fmtNum(ipo.ipoPe)} />
              <DataRow label="Peer / Sector PE" value={fmtNum(ipo.peerPe)} />
              <DataRow
                label="PE vs Sector Ratio"
                value={fmtNum(ipo.peVsSectorRatio)}
              />
              <DataRow
                label="Latest EBITDA (Cr)"
                value={fmtNum(ipo.latestEbitda)}
              />
              <DataRow label="Debt / Equity" value={fmtNum(ipo.debtEquity)} />
            </div>
            <div className="bg-card border border-border rounded-2xl p-5">
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
                Market context at listing
              </h2>
              <p className="text-[12px] text-ink3 mb-3">
                How the broader market moved around the {ipo.name} IPO window.
                Helpful for isolating how much of the listing gain came from
                company fundamentals vs. market tailwind.
              </p>
              <DataRow
                label="Nifty 3D Return"
                value={fmtPct(ipo.nifty3dPct)}
                valueClass={tone(ipo.nifty3dPct)}
              />
              <DataRow
                label="Nifty 1W Return"
                value={fmtPct(ipo.nifty1wPct)}
                valueClass={tone(ipo.nifty1wPct)}
              />
              <DataRow
                label="Nifty 1M Return"
                value={fmtPct(ipo.nifty1mPct)}
                valueClass={tone(ipo.nifty1mPct)}
              />
              <DataRow
                label="Nifty during IPO window"
                value={fmtPct(ipo.niftyDuringWindowPct)}
                valueClass={tone(ipo.niftyDuringWindowPct)}
              />
            </div>
          </section>

          {/* FAQ (visual) */}
          <section className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-4">
              {ipo.name} IPO - FAQs
            </h2>
            <div className="space-y-4 text-[13.5px] text-ink2 leading-relaxed">
              <div>
                <h3 className="font-bold text-foreground mb-1">
                  What was the listing gain of {ipo.name} IPO?
                </h3>
                <p>
                  {ipo.listingGainPct != null
                    ? `${ipo.name} IPO listed at ${fmtPct(
                        ipo.listingGainPct,
                        1
                      )} versus the upper issue price of ${fmtRs(
                        ipo.issuePriceUpper
                      )} on ${listingDateDisplay}.`
                    : `${ipo.name} IPO listed on ${listingDateDisplay}. Full listing price details are listed above.`}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">
                  How many times was {ipo.name} IPO subscribed?
                </h3>
                <p>
                  {ipo.day3Sub != null
                    ? `${ipo.name} IPO was subscribed ${fmtX(
                        ipo.day3Sub
                      )} overall. QIB portion was subscribed ${fmtX(
                        ipo.qibDay3
                      )}, HNI / NII ${fmtX(ipo.hniDay3)} and Retail ${fmtX(
                        ipo.retailDay3
                      )}.`
                    : `Subscription data is listed in the Subscription breakdown section above.`}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">
                  What was the IPO GMP for {ipo.name}?
                </h3>
                <p>
                  {ipo.gmpD1 != null || ipo.gmpD3 != null
                    ? `IPO GMP started at ${fmtRs(
                        ipo.gmpD1
                      )} on Day 1 and moved to ${fmtRs(
                        ipo.gmpD5 ?? ipo.gmpD3 ?? ipo.gmpD1
                      )} by the close of the issue window. See the day-by-day GMP table above for the full trajectory.`
                    : `Day-by-day IPO GMP data for ${ipo.name} is listed in the table above.`}
                </p>
              </div>
            </div>
          </section>

          {/* Related IPOs */}
          {related.length > 0 && (
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-3">
                Other IPOs listed in {year}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/listed/${year}/${r.slug}`}
                    className="bg-card border border-border rounded-xl p-4 hover:border-primary transition-colors"
                  >
                    <div className="font-bold text-foreground mb-1 truncate">
                      {r.name}
                    </div>
                    <div className="text-[11px] text-ink3 mb-2">
                      {r.sector} - {formatDate(r.listingDate, r.listingDateRaw)}
                    </div>
                    <div
                      className={`text-sm font-black ${
                        (r.listingGainPct ?? 0) >= 0
                          ? 'text-emerald-mid'
                          : 'text-destructive'
                      }`}
                    >
                      {fmtPct(r.listingGainPct, 1)}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Year nav */}
          <section className="bg-card border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-foreground mb-3">
              Browse listed IPOs by year
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableYears.map((y) => (
                <Link
                  key={y}
                  href={`/listed/${y}`}
                  className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${
                    y === year
                      ? 'bg-primary text-white border-primary'
                      : 'border-border text-ink2 hover:bg-secondary'
                  }`}
                >
                  IPOs {y}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </main>

      {jsonLd.map((obj, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(obj) }}
        />
      ))}
      <Footer />
    </div>
  );
}
