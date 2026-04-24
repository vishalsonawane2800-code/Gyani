import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Ticker } from '@/components/ticker';
import { Footer } from '@/components/footer';
import { IPOCard } from '@/components/ipo-card';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import {
  CalendarDays,
  Bell,
  ChevronRight,
  Sparkles,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import {
  exchangeKind,
  getExpectedSoonIpos,
  paginate,
} from '@/lib/expected-soon-ipos/loader';

// Admin status changes have to land immediately on this page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upcoming IPOs 2026 - New IPO Calendar, Dates & Details | IPOGyani',
  description:
    'All upcoming IPOs in India 2026 - scheduled mainboard + SME issues added by the admin, plus the full pipeline of DRHP-filed / SEBI-approved companies expected to IPO soon.',
  alternates: { canonical: 'https://ipogyani.com/upcoming' },
};

const PER_PAGE = 20;

function buildPageHref(page: number): string {
  if (page <= 1) return '/upcoming';
  return `/upcoming?page=${page}`;
}

/**
 * Build a compact page-number list for the pagination nav.
 * Example (current=7, total=12): [1, '…', 5, 6, 7, 8, 9, '…', 12]
 */
function buildPageList(current: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) out.push(i);
    return out;
  }
  out.push(1);
  const start = Math.max(2, current - 2);
  const end = Math.min(total - 1, current + 2);
  if (start > 2) out.push('…');
  for (let i = start; i <= end; i++) out.push(i);
  if (end < total - 1) out.push('…');
  out.push(total);
  return out;
}

export default async function UpcomingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [ipos, sp] = await Promise.all([getCurrentIPOs(), searchParams]);

  // Admin-scheduled upcoming IPOs (status === 'upcoming'). Sorted by earliest
  // open date first so the most imminent issue shows on top.
  const scheduled = ipos
    .filter((i) => i.status === 'upcoming')
    .sort(
      (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
    );

  const mainboardCount = scheduled.filter(
    (i) => i.exchange === 'Mainboard' || i.exchange === 'REIT'
  ).length;
  const smeCount = scheduled.filter(
    (i) => i.exchange === 'BSE SME' || i.exchange === 'NSE SME'
  ).length;

  // Expected-soon pipeline (DRHP filed / SEBI approved, dates not announced).
  const expectedSoon = getExpectedSoonIpos();
  const requestedPage = parseInt(sp?.page ?? '1', 10) || 1;
  const {
    slice: expectedSoonPage,
    page,
    totalPages,
    total: expectedSoonTotal,
    start,
    end,
  } = paginate(expectedSoon, requestedPage, PER_PAGE);
  const pageList = buildPageList(page, totalPages);

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
          <span className="text-ink">Upcoming IPOs</span>
        </nav>

        {/* Hero */}
        <div className="mb-6 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-cobalt-bg flex items-center justify-center shrink-0">
            <CalendarDays className="w-6 h-6 text-cobalt" />
          </div>
          <div>
            <h1 className="font-heading text-2xl md:text-3xl font-bold text-ink mb-1">
              Upcoming IPOs
            </h1>
            <p className="text-ink3 text-sm md:text-base">
              Scheduled IPOs with confirmed open / close dates, plus the full
              pipeline of DRHP-filed and SEBI-approved companies expected to
              IPO soon.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Scheduled</p>
            <p className="text-2xl font-bold text-ink">{scheduled.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Mainboard</p>
            <p className="text-2xl font-bold text-ink">{mainboardCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">SME</p>
            <p className="text-2xl font-bold text-ink">{smeCount}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Expected Soon</p>
            <p className="text-2xl font-bold text-ink">{expectedSoonTotal}</p>
          </div>
        </div>

        {/* Scheduled section (admin data) */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-2 h-2 rounded-full bg-cobalt" />
            <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
              Scheduled with Confirmed Dates
            </h2>
            <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-cobalt-bg text-cobalt">
              {scheduled.length}
            </span>
          </div>

          {scheduled.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {scheduled.map((ipo) => (
                // getCurrentIPOs returns the same IPO shape IPOCard already
                // consumes on the homepage, so live upcoming entries render
                // with GMP / AI prediction chips as soon as the admin seeds
                // them.
                <IPOCard key={ipo.id} ipo={ipo} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <CalendarDays className="w-10 h-10 text-ink4 mx-auto mb-3" />
              <p className="font-semibold text-ink2">
                No scheduled upcoming IPOs.
              </p>
              <p className="text-sm text-ink3 mt-1">
                Add a new IPO from the admin panel with status = Upcoming and it
                will appear here.
              </p>
            </div>
          )}
        </section>

        {/* Expected-soon watchlist (DRHP filed / SEBI approved pipeline) */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
              Expected Soon - Dates Not Announced
            </h2>
            <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-primary-bg text-primary">
              {expectedSoonTotal}
            </span>
          </div>
          <p className="text-sm text-ink3 mb-4 max-w-3xl">
            Companies that have filed DRHP or received SEBI approval and are
            widely expected to IPO soon. Exact open / close dates, price bands
            and lot sizes are not yet public.
          </p>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 font-semibold text-ink2 min-w-[220px]">
                      Company
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Industry
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Exchange
                    </th>
                    <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                      Estimated Size
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Status
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 min-w-[220px]">
                      Note
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {expectedSoonPage.map((item, idx) => {
                    const kind = exchangeKind(item.exchange);
                    return (
                      <tr
                        key={`${item.company}-${idx}`}
                        className={`${
                          idx !== expectedSoonPage.length - 1
                            ? 'border-b border-border'
                            : ''
                        } hover:bg-secondary/30 transition-colors`}
                      >
                        <td className="p-4 font-semibold text-ink align-top">
                          {item.company}
                        </td>
                        <td className="p-4 text-ink2 align-top">
                          {item.industry || '-'}
                        </td>
                        <td className="p-4 align-top">
                          {kind === 'Mainboard' ? (
                            <span className="px-2 py-1 rounded text-xs font-bold bg-gold-bg text-gold border border-gold/30 whitespace-nowrap">
                              Mainboard
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-extrabold uppercase tracking-wide bg-destructive-bg text-destructive border border-destructive/40 whitespace-nowrap">
                              <span
                                aria-hidden
                                className="w-1.5 h-1.5 rounded-full bg-destructive"
                              />
                              SME ({kind === 'BSE SME' ? 'BSE' : 'NSE'})
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-right font-medium text-ink align-top whitespace-nowrap">
                          {item.estimatedIssueSize || '-'}
                        </td>
                        <td className="p-4 text-ink2 whitespace-nowrap align-top">
                          {item.sebiApprovalDate ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald/10 text-emerald-mid border border-emerald/30">
                              SEBI {item.sebiApprovalDate}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-cobalt-bg text-cobalt border border-cobalt/30">
                              DRHP {item.drhpFilingDate}
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-ink3 align-top">
                          {item.note}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination footer */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 px-4 py-3 border-t border-border bg-secondary/30">
              <p className="text-xs text-ink3">
                Showing{' '}
                <span className="font-bold text-ink">
                  {expectedSoonTotal === 0 ? 0 : start + 1}
                </span>
                {' '}-{' '}
                <span className="font-bold text-ink">{end}</span> of{' '}
                <span className="font-bold text-ink">{expectedSoonTotal}</span>
                {' '}companies
              </p>

              {totalPages > 1 && (
                <nav
                  aria-label="Expected-soon IPOs pagination"
                  className="flex items-center gap-1 flex-wrap"
                >
                  {page > 1 ? (
                    <Link
                      href={buildPageHref(page - 1)}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold text-ink2 bg-card border border-border hover:bg-secondary transition-colors"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold text-ink4 bg-card border border-border opacity-50 cursor-not-allowed">
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Prev
                    </span>
                  )}

                  {pageList.map((p, i) =>
                    p === '…' ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="px-2 text-ink4 text-xs"
                      >
                        …
                      </span>
                    ) : p === page ? (
                      <span
                        key={p}
                        aria-current="page"
                        className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1.5 rounded-md text-xs font-extrabold bg-primary text-primary-foreground border border-primary"
                      >
                        {p}
                      </span>
                    ) : (
                      <Link
                        key={p}
                        href={buildPageHref(p)}
                        prefetch={false}
                        className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1.5 rounded-md text-xs font-bold text-ink2 bg-card border border-border hover:bg-secondary transition-colors"
                      >
                        {p}
                      </Link>
                    )
                  )}

                  {page < totalPages ? (
                    <Link
                      href={buildPageHref(page + 1)}
                      prefetch={false}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold text-ink2 bg-card border border-border hover:bg-secondary transition-colors"
                      aria-label="Next page"
                    >
                      Next
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-bold text-ink4 bg-card border border-border opacity-50 cursor-not-allowed">
                      Next
                      <ChevronRightIcon className="w-3.5 h-3.5" />
                    </span>
                  )}
                </nav>
              )}
            </div>
          </div>
        </section>

        {/* Notification CTA */}
        <div className="bg-foreground rounded-2xl p-8 text-center text-white">
          <Bell className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-heading text-2xl font-bold mb-2">
            Never Miss an IPO
          </h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Get instant notifications when new IPOs are announced and when
            subscription opens.
          </p>
          <button className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors">
            Enable Notifications
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
