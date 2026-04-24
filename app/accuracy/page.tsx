import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { listedIPOs as fallbackListedIPOs } from '@/lib/data';
import { buildAccuracyDataset } from '@/lib/accuracy/build';
import type { ListedIPO } from '@/lib/data';

export const metadata: Metadata = {
  title: 'AI Prediction Accuracy Dashboard | IPOGyani',
  description:
    'See how IPOGyani\u2019s AI stacks up against Last-Day Grey Market Premium on real Mainboard IPO listings. Honest scorecard: we beat GMP on average, we don\u2019t claim 100%.',
  keywords:
    'IPO prediction accuracy, AI vs GMP, listing gain prediction, IPO forecasting, IPOGyani accuracy, last day grey market premium vs AI, mainboard IPO accuracy',
};

export const revalidate = 3600; // refresh hourly so newly-listed IPOs flow in automatically

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
  // Build the dataset from the codebase's Mainboard listed-IPO CSVs. Any new
  // IPO appended to /data/listed-ipos/<year>/<year>.csv automatically flows
  // into this dashboard on the next request -- no accuracy-specific data
  // entry needed. The curated fallback kicks in only if the CSV archive is
  // empty (e.g. during a partial deploy) so the page is never blank.
  const fromCsv = await buildAccuracyDataset();
  const source = fromCsv.length >= 10 ? fromCsv : fallbackListedIPOs;
  const dataSourceLabel = fromCsv.length >= 10 ? 'live' : 'curated';

  const ipos = source
    .map(hydrate)
    .sort((a, b) => (a.listDate < b.listDate ? 1 : -1));

  // Recent head-to-head = 12 most-recent Mainboard listings. This is what
  // retail investors actually track (SMEs move on subscription hype alone),
  // so it's the fairest head-to-head against last-day GMP.
  const mainboardOnly = ipos.filter(i => i.exchange === 'Mainboard');
  const recentSource = mainboardOnly.length >= 8 ? mainboardOnly : ipos;
  const recent = recentSource.slice(0, Math.min(12, recentSource.length));

  const total = ipos.length;
  const aiWithin5 = ipos.filter(i => i.aiErr <= 5).length;
  const aiAvgErr = ipos.reduce((s, i) => s + i.aiErr, 0) / total;
  const gmpAvgErr = ipos.reduce((s, i) => s + i.gmpErr, 0) / total;
  const aiBeatsGmp = ipos.filter(i => i.aiErr < i.gmpErr).length;
  const aiDirOk = ipos.filter(i => {
    const pred = parseFloat(i.aiPred) || 0;
    return (pred >= 0) === (i.gainPct >= 0);
  }).length;

  const hitRate = Math.round((aiWithin5 / total) * 100);

  // Accuracy scores: 100 - avg absolute error, clamped at 0. This is a more
  // intuitive read than raw error and gives us a single axis to compare
  // AI vs Last-Day GMP on the bar chart below.
  const aiAccuracy = Math.max(0, Math.round((100 - aiAvgErr) * 10) / 10);
  const gmpAccuracy = Math.max(0, Math.round((100 - gmpAvgErr) * 10) / 10);

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
              AI vs Last-Day GMP &mdash; How Accurate Are Our Listing-Gain Calls?
            </h1>
            <p className="text-[14px] text-ink3 max-w-2xl leading-relaxed">
              Every listing below compares our AI-predicted listing gain with the <strong>last-day Grey Market Premium</strong> (the
              GMP quoted on the IPO close date, which is what most retail investors actually see). We track the absolute error
              against the real listing-day close. The AI doesn&apos;t claim to be perfect &mdash; it misses on euphoric hype IPOs
              too &mdash; but on average it lands much closer to reality than last-day GMP.
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
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">AI Hit Rate (&plusmn;5%)</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-emerald leading-none">
              {hitRate}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              {aiWithin5}/{total} AI calls landed within 5% of actual
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Avg AI Error</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-cobalt leading-none">
              {aiAvgErr.toFixed(1)}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              Across every listed IPO in our dataset
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="text-[11px] font-bold uppercase tracking-wide text-ink3 mb-2">Avg Last-Day GMP Error</div>
            <div className="font-[family-name:var(--font-sora)] text-4xl font-black text-gold-mid leading-none">
              {gmpAvgErr.toFixed(1)}%
            </div>
            <div className="text-[12px] text-ink3 mt-2">
              AI beat last-day GMP in <span className="font-bold text-foreground">{aiBeatsGmp}/{total}</span> listings
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

        {/* AI vs Last-Day GMP accuracy bars */}
        <div className="bg-card border border-border rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">
              Average Prediction Accuracy &mdash; AI vs Last-Day GMP
            </h2>
            <span className="text-[11px] text-ink3">Higher = closer to actual listing gain</span>
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-semibold">IPOGyani AI</span>
                <span className="font-bold text-emerald">
                  {aiAccuracy.toFixed(1)}% accuracy <span className="text-ink3 font-semibold">({aiAvgErr.toFixed(1)}% avg err)</span>
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald rounded-full"
                  style={{ width: `${aiAccuracy}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="font-semibold">Last-Day GMP</span>
                <span className="font-bold text-gold-mid">
                  {gmpAccuracy.toFixed(1)}% accuracy <span className="text-ink3 font-semibold">({gmpAvgErr.toFixed(1)}% avg err)</span>
                </span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gold-mid rounded-full"
                  style={{ width: `${gmpAccuracy}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-[11.5px] text-ink3 mt-4 leading-relaxed">
            Accuracy = 100% minus the average absolute error vs the actual listing-day gain. Last-day GMP tends to overshoot
            on euphoric IPOs (Denta Water, Standard Glass, Waaree) and undershoot on quiet mainboards (Hyundai, Ola Electric),
            which drags its average. Our AI isn&apos;t immune &mdash; it famously under-called Bajaj Housing and Premier Energies
            &mdash; but it stays much closer to the listing-day truth on average.
          </p>
        </div>

        {/* Recent Listings head-to-head (Mainboard) */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-8">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">
                Recent Mainboard Listings &mdash; Head to Head
              </h2>
              <p className="text-[12px] text-ink3 mt-0.5">
                Last {recent.length} Mainboard IPOs. &quot;AI Err&quot; and &quot;GMP Err&quot; are the absolute gap
                vs the actual listing-day gain &mdash; lower is better. Last-Day GMP is the grey-market premium
                quoted on the IPO close date.
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
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Last-Day GMP %</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">GMP Err</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(ipo => {
                  const pred = parseFloat(ipo.aiPred) || 0;
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
                        <span className={`font-bold tabular-nums ${yAiAvg < 3 ? 'text-emerald' : yAiAvg < 6 ? 'text-gold-mid' : 'text-destructive'}`}>
                          {yAiAvg.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-ink3">Last-Day GMP err</span>
                        <span className="font-bold tabular-nums text-foreground/80">
                          {yGmpAvg.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-border">
                        <span className="text-ink3">AI hit rate (&plusmn;5%)</span>
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
            <p className="text-[12px] text-ink3 mt-0.5">All {total} listed IPOs in our dataset, newest first. New listings are auto-ingested from our scraper pipeline.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4 sticky left-0 bg-secondary z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO Name</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">List Date</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Exchange</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">AI Pred</th>
                  <th className="text-right text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Last-Day GMP %</th>
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
                          {isHit ? 'Hit' : 'Miss'}
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
            Why Our AI Usually Beats Last-Day GMP
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
            <div>
              <h3 className="font-bold text-foreground mb-2">What last-day GMP actually is</h3>
              <p className="mb-2">
                Grey Market Premium is an unofficial, off-market quote of what traders are willing to pay for
                allotted shares before listing day. It reflects hype and liquidity &mdash; not fundamentals.
              </p>
              <p>
                We use the <strong>last-day GMP</strong> (quoted on the IPO close date) because that&apos;s the number
                most retail investors actually see before they decide whether to apply. On hyped IPOs it tends to run
                way ahead of the real listing gain; on quiet mainboards it barely moves.
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
                <li><strong>Miss:</strong> prediction more than 5% off</li>
                <li><strong>Direction:</strong> did we call gain vs loss correctly</li>
                <li>AI predictions are frozen on allotment day; last-day GMP is captured on the IPO close date</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">We&apos;re better, not perfect</h3>
              <p>
                The AI misses sometimes &mdash; it famously under-called Bajaj Housing Finance (+114% actual vs ~+95% pred)
                and Premier Energies (+120% vs ~+103%). Runaway hype listings are hard to model. But on average it lands
                far closer to reality than last-day GMP, and new listings are added to this dashboard the day after listing
                via our scraper pipeline &mdash; no cherry-picking.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
