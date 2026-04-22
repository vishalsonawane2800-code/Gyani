import { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { Ticker } from '@/components/ticker';
import { Footer } from '@/components/footer';
import { IPOCard } from '@/components/ipo-card';
import { getCurrentIPOs } from '@/lib/supabase/queries';
import { CalendarDays, Bell, ChevronRight, Sparkles } from 'lucide-react';

// Admin status changes have to land immediately on this page.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Upcoming IPOs 2026 - New IPO Calendar, Dates & Details | IPOGyani',
  description:
    'All upcoming IPOs in India 2026 - scheduled mainboard + SME issues added by the admin, plus a curated list of IPOs expected soon but without confirmed dates.',
  alternates: { canonical: 'https://ipogyani.com/upcoming' },
};

// ---------------------------------------------------------------------------
// Expected-soon list (manual, edit this array directly in the .tsx file)
// ---------------------------------------------------------------------------
// These are IPOs that are rumoured / DRHP-filed / approved but do not yet have
// confirmed open-close dates. They appear on the page in a separate section
// beneath admin-listed upcoming IPOs. To add / remove an entry, just edit
// this array - no DB migration or admin step needed.
type ExpectedSoonIPO = {
  name: string;
  sector: string;
  expectedTimeframe: string; // free-form: "Q2 2026", "Apr-May 2026", "Filed DRHP"
  issueSizeCr?: number;
  exchange?: 'Mainboard' | 'BSE SME' | 'NSE SME';
  note?: string;
};

const expectedSoonIPOs: ExpectedSoonIPO[] = [
  {
    name: 'Tata Capital',
    sector: 'NBFC',
    expectedTimeframe: 'Q2 2026',
    issueSizeCr: 15000,
    exchange: 'Mainboard',
    note: 'DRHP filed, awaiting SEBI observations',
  },
  {
    name: 'Reliance Jio',
    sector: 'Telecom',
    expectedTimeframe: 'H2 2026',
    issueSizeCr: 40000,
    exchange: 'Mainboard',
    note: 'Widely reported; no DRHP yet',
  },
  {
    name: 'LG Electronics India',
    sector: 'Consumer Durables',
    expectedTimeframe: 'Q3 2026',
    issueSizeCr: 15000,
    exchange: 'Mainboard',
    note: 'DRHP filed via OFS',
  },
  {
    name: 'PhysicsWallah',
    sector: 'Edtech',
    expectedTimeframe: '2026',
    issueSizeCr: 4600,
    exchange: 'Mainboard',
    note: 'Confidential DRHP filed',
  },
  {
    name: 'boAt (Imagine Marketing)',
    sector: 'Consumer Electronics',
    expectedTimeframe: '2026',
    issueSizeCr: 2000,
    exchange: 'Mainboard',
    note: 'DRHP re-filing expected',
  },
];

export default async function UpcomingPage() {
  const ipos = await getCurrentIPOs();

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
              Scheduled IPOs with confirmed open / close dates, plus a curated
              watchlist of IPOs expected to hit the market soon.
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
            <p className="text-2xl font-bold text-ink">{expectedSoonIPOs.length}</p>
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

        {/* Expected-soon watchlist (hardcoded) */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
              Expected Soon - Dates Not Announced
            </h2>
            <span className="text-xs font-extrabold py-0.5 px-2 rounded-full bg-primary-bg text-primary">
              {expectedSoonIPOs.length}
            </span>
          </div>
          <p className="text-sm text-ink3 mb-4 max-w-3xl">
            Companies that have filed DRHP or are widely expected to IPO soon.
            Exact dates, price bands and lot sizes are not yet public.
          </p>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 font-semibold text-ink2 min-w-[160px]">
                      Company
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Sector
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Exchange
                    </th>
                    <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                      Expected Size
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2 whitespace-nowrap">
                      Timeframe
                    </th>
                    <th className="text-left p-4 font-semibold text-ink2">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {expectedSoonIPOs.map((item, idx) => (
                    <tr
                      key={item.name}
                      className={`${
                        idx !== expectedSoonIPOs.length - 1
                          ? 'border-b border-border'
                          : ''
                      } hover:bg-secondary/30 transition-colors`}
                    >
                      <td className="p-4 font-semibold text-ink">{item.name}</td>
                      <td className="p-4 text-ink2">{item.sector}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            item.exchange === 'Mainboard'
                              ? 'bg-primary-bg text-primary'
                              : 'bg-gold-bg text-gold'
                          }`}
                        >
                          {item.exchange ?? 'Mainboard'}
                        </span>
                      </td>
                      <td className="p-4 text-right font-medium text-ink">
                        {item.issueSizeCr
                          ? `Rs ${item.issueSizeCr.toLocaleString('en-IN')} Cr`
                          : '-'}
                      </td>
                      <td className="p-4 text-ink2 whitespace-nowrap">
                        {item.expectedTimeframe}
                      </td>
                      <td className="p-4 text-ink3">{item.note ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
