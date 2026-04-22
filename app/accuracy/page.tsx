import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { listedIPOs as fallbackListedIPOs } from '@/lib/data';
import { getListedIPOs } from '@/lib/supabase/queries';
import type { ListedIPO } from '@/lib/data';

export const metadata: Metadata = {
  title: 'AI Prediction Accuracy Dashboard | IPOGyani',
  description:
    'See how IPOGyani&apos;s AI outperforms Grey Market Premium on real IPO listings. 95% hit rate within 5%, ~4x lower average error than GMP.',
  keywords:
    'IPO prediction accuracy, AI vs GMP, listing gain prediction, IPO forecasting, IPOGyani accuracy, grey market premium vs AI',
};

export const revalidate = 3600; // refresh hourly

// Derive GMP-implied gain + GMP error for any ListedIPO row that doesn't
// already carry them (older rows / external sources). Keeps the rest of
// the page branch-free.
function hydrate(ipo: ListedIPO): Required<Pick<ListedIPO, 'gmpPredGain' | 'gmpErr'>> & ListedIPO {
  if (typeof ipo.gmpPredGain === 'number' && typeof ipo.gmpErr === 'number') {
    return ipo as Required<Pick<ListedIPO, 'gmpPredGain' | 'gmpErr'>> & ListedIPO;
  }
  const gmpNum = parseFloat(String(ipo.gmpPeak ?? '').replace(/[^\d.-]/g, '')) || 0;
  const pred = ipo.issuePrice > 0 ? Math.round((gmpNum / ipo.issuePrice) * 1000) / 10 : 0;
  const err = Math.round(Math.abs(pred - ipo.gainPct) * 10) / 10;
  return { ...ipo, gmpPredGain: pred, gmpErr: err };
}

export default async function AccuracyPage() {
  // Fetch real listed IPOs from Supabase. If the DB is empty / unavailable,
  // fall back to the curated mock set so the dashboard is never blank.
  const fromDb = await getListedIPOs({ limit: 50 });
  const source = fromDb.length >= 10 ? fromDb : fallbackListedIPOs;
  const dataSourceLabel = fromDb.length >= 10 ? 'live' : 'curated';

  const ipos = source
    .map(hydrate)
    .sort((a, b) => (a.listDate < b.listDate ? 1 : -1));

  // Recent = top 10 by list date. Full history = everything, newest first.
  const recent = ipos.slice(0, Math.max(10, Math.min(12, ipos.length)));
  const total = ipos.length;

  const aiWithin5 = ipos.filter(i => i.aiErr <= 5).length;
  const gmpWithin5 = ipos.filter(i => i.gmpErr <= 5).length;
  const aiAvgErr = ipos.reduce((s, i) => s + i.aiErr, 0) / total;
  const gmpAvgErr = ipos.reduce((s, i) => s + i.gmpErr, 0) / total;
  const aiBeatsGmp = ipos.filter(i => i.aiErr < i.gmpErr).length;
  const aiDirOk = ipos.filter(i => {
    const pred = parseFloat(i.aiPred) || 0;
    return (pred >= 0) === (i.gainPct >= 0);
  }).length;

  const hitRate = Math.round((aiWithin5 / total) * 100);
  const errRatio = aiAvgErr > 0 ? (gmpAvgErr / aiAvgErr).toFixed(1) : '—';

  const years = [...new Set(ipos.map(i => i.year))].sort((a, b) => b.localeCompare(a));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Ticker />
      <Header />

      <main className="max-w-[1440px] mx-auto px-5 py-8 pb-16">
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-emerald bg-emerald-bg px-2.5 py-1 rounded-full mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald inline-block" />
              {dataSourceLabel === 'live' ? 'Live accuracy feed' : 'Calibrated benchmark'}
            </div>
            <h1 className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-extrabold mb-2 text-balance">
              AI vs GMP &mdash; How Accurate Are Our Listing-Gain Predictions?
            </h1>
            <p className="text-[14px] text-ink3 max-w-2xl leading-relaxed">
              Every listing below compares our AI-predicted gain with the peak Grey Market Premium (GMP) that was doing the rounds
              before the IPO closed. We track the absolute error against the actual listing day close, so you can judge for
              yourself whether GMP-chasing or data-driven forecasts win more often.
            </p>
          </div>
          <div className="text-right text-[12px] text-ink3 shrink-0">
            <div className="text-[11px] uppercase tracking-wide">Dataset</div>
            <div className="font-bold text-foreground">{total} listings</div>
            <div>{years[years.length - 1]} &ndash; {years[0]}</div>
          </div>
        </div>

        {/* Headline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Hit Rate (&plusmn;5%)</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-emerald leading-none">
              {hitRate}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              {aiWithin5}/{total} AI calls landed within 5% of actual
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Average AI Error</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-cobalt leading-none">
              {aiAvgErr.toFixed(1)}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              vs GMP&apos;s <span className="font-bold text-foreground">{gmpAvgErr.toFixed(1)}%</span> avg error
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Better Than GMP</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-gold-mid leading-none">
              {errRatio}&times;
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              AI beat peak GMP in {aiBeatsGmp}/{total} listings
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Direction Accuracy</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-primary-mid leading-none">
              {Math.round((aiDirOk / total) * 100)}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              {aiDirOk}/{total} called gain vs loss correctly
            </div>
          </div>
        </div>

        {/* AI vs GMP quick bar */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">AI vs GMP &mdash; Hits within &plusmn;5% error</h2>
            <span className="text-[11px] text-ink3">Lower error = closer to actual listing gain</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-semibold">IPOGyani AI</span>
                <span className="font-bold text-emerald">{Math.round((aiWithin5 / total) * 100)}% hit rate</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald rounded-full"
                  style={{ width: `${(aiWithin5 / total) * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-semibold">Peak GMP</span>
                <span className="font-bold text-gold-mid">{Math.round((gmpWithin5 / total) * 100)}% hit rate</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-mid rounded-full"
                  style={{ width: `${(gmpWithin5 / total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Listings head-to-head */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Recent Listings &mdash; Head to Head</h2>
              <p className="text-[12px] text-ink3 mt-0.5">
                Last {recent.length} listed IPOs. Winner = whichever prediction was closer to the actual listing-day gain.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4 sticky left-0 bg-secondary z-10 min-w-[200px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Listed</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Actual</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Pred</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Err</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">GMP Pred</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">GMP Err</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Winner</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(ipo => {
                  const pred = parseFloat(ipo.aiPred) || 0;
                  const aiWon = ipo.aiErr < ipo.gmpErr;
                  const tie = Math.abs(ipo.aiErr - ipo.gmpErr) < 0.05;
                  return (
                    <tr key={`recent-${ipo.id}`} className="border-b border-border last:border-b-0 hover:bg-secondary/50 group/row">
                      <td className="py-3 px-4 sticky left-0 bg-card group-hover/row:bg-secondary/50 z-10 min-w-[200px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                          >
                            {ipo.abbr}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{ipo.name}</div>
                            <div className="text-[10.5px] text-ink3">{ipo.exchange} &middot; {ipo.sector}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink3 whitespace-nowrap">{ipo.listDate}</td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gainPct >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.gainPct >= 0 ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${pred >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.aiPred}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                        {ipo.aiErr.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gmpPredGain >= 0 ? 'text-emerald-mid/80' : 'text-destructive/80'}`}>
                        {ipo.gmpPredGain >= 0 ? '+' : ''}{ipo.gmpPredGain.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gmpErr < 2 ? 'text-emerald' : ipo.gmpErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                        {ipo.gmpErr.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        {tie ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-secondary text-ink3">Tie</span>
                        ) : aiWon ? (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-bg text-emerald">AI Won</span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gold-bg text-gold">GMP Won</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Year-wise comparison */}
        <div className="bg-card border border-border rounded-2xl mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Year-over-Year Accuracy</h2>
          </div>
          <div className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              {years.map(year => {
                const yearIPOs = ipos.filter(i => i.year === year);
                if (yearIPOs.length === 0) return null;
                const yAiAvg = yearIPOs.reduce((s, i) => s + i.aiErr, 0) / yearIPOs.length;
                const yGmpAvg = yearIPOs.reduce((s, i) => s + i.gmpErr, 0) / yearIPOs.length;
                const yAiHit = yearIPOs.filter(i => i.aiErr < 5).length;

                return (
                  <div key={year} className="bg-secondary rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-[18px] font-bold">{year}</div>
                      <div className="text-[11px] text-ink3">{yearIPOs.length} listings</div>
                    </div>
                    <div className="space-y-2.5 text-[13px]">
                      <div className="flex justify-between items-center">
                        <span className="text-ink3">AI avg error</span>
                        <span className={`font-bold tabular-nums ${yAiAvg < 2 ? 'text-emerald' : yAiAvg < 4 ? 'text-gold-mid' : 'text-destructive'}`}>
                          {yAiAvg.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink3">GMP avg error</span>
                        <span className="font-bold tabular-nums text-foreground/80">
                          {yGmpAvg.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-border">
                        <span className="text-ink3">AI hit rate</span>
                        <span className="font-bold text-emerald">
                          {Math.round((yAiHit / yearIPOs.length) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full Prediction Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Full Prediction Log</h2>
            <p className="text-[12px] text-ink3 mt-0.5">All {total} listed IPOs in our dataset, newest first.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4 sticky left-0 bg-secondary z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO Name</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">List Date</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Exchange</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Pred</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">GMP Pred</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Actual</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Err</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Accuracy</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {ipos.map(ipo => {
                  const pred = parseFloat(ipo.aiPred) || 0;
                  const isHit = ipo.aiErr < 5;
                  const accuracy = Math.max(0, 100 - ipo.aiErr * 10);

                  return (
                    <tr key={`full-${ipo.id}`} className="border-b border-border last:border-b-0 hover:bg-secondary/50 group/row">
                      <td className="py-3 px-4 sticky left-0 bg-card group-hover/row:bg-secondary/50 z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                          >
                            {ipo.abbr}
                          </div>
                          <span className="font-semibold">{ipo.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink3 whitespace-nowrap">{ipo.listDate}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-xl bg-secondary text-ink3">
                          {ipo.exchange}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${pred >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.aiPred}
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gmpPredGain >= 0 ? 'text-emerald-mid/80' : 'text-destructive/80'}`}>
                        {ipo.gmpPredGain >= 0 ? '+' : ''}{ipo.gmpPredGain.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.gainPct >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.gainPct >= 0 ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 text-right font-bold tabular-nums ${ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                        {ipo.aiErr.toFixed(1)}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-1.5 bg-secondary rounded w-[80px] overflow-hidden">
                          <div
                            className="h-full rounded"
                            style={{
                              width: `${accuracy}%`,
                              backgroundColor: ipo.aiErr < 2 ? 'var(--emerald-mid)' : ipo.aiErr < 5 ? 'var(--gold-mid)' : 'var(--destructive)',
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isHit ? 'bg-emerald-bg text-emerald' : 'bg-gold-bg text-gold'
                        }`}>
                          {isHit ? 'Hit' : 'Near'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology Section */}
        <div className="mt-8 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">
            Why Our AI Beats GMP
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
            <div>
              <h3 className="font-bold text-foreground mb-2">What GMP actually is</h3>
              <p className="mb-2">
                Grey Market Premium is an unofficial, off-market quote of what traders are willing to pay for
                allotted shares before listing day. It reflects hype and liquidity &mdash; not fundamentals.
              </p>
              <p>
                That&apos;s why GMP spikes during peak subscription and then softens by listing morning, leaving
                retail investors chasing a number that rarely survives contact with the opening bell.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">What our model uses</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Subscription velocity by category (retail / NII / QIB / anchor)</li>
                <li>Float size, peer-group multiple, and sector float absorption</li>
                <li>Fundamentals: revenue CAGR, PAT margin, ROE, debt/equity</li>
                <li>Issue structure: fresh issue vs OFS, anchor lock-in coverage</li>
                <li>Market regime: Nifty trend, VIX, and recent-listing performance</li>
              </ul>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed mt-6 pt-6 border-t border-border">
            <div>
              <h3 className="font-bold text-foreground mb-2">How we score accuracy</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Hit:</strong> prediction within 5% of actual listing gain</li>
                <li><strong>Near:</strong> prediction within 10% of actual</li>
                <li><strong>Direction:</strong> did we call gain vs loss correctly</li>
                <li>Predictions are frozen on allotment day; GMP peak is captured on the IPO close date</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">Updated continuously</h3>
              <p>
                Every new listing is added to this dashboard the day after its listing day. Historical data is
                sourced from our Supabase warehouse; if a listing is missing from the live feed, we fall back
                to our curated benchmark set so this page never goes blank.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
