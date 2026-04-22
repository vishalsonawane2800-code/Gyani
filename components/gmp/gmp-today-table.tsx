'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  ChevronDown,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import type { IPO } from '@/lib/data';

interface Props {
  ipos: IPO[];
}

// Compact IST date formatter used for the "last updated" cell.
function formatShortDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function formatHistoryDate(date: string): string {
  // History rows come back as ISO timestamps from gmp_history.recorded_at;
  // fall back gracefully if a stored label (e.g. "Today") sneaks through.
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Build chart data from an IPO's gmpHistory. History is stored newest ->
// oldest (see queries.ts) so we reverse for a chronological X axis.
function buildChartData(ipo: IPO) {
  const history = ipo.gmpHistory ?? [];
  if (history.length === 0) {
    return [{ name: 'Today', gmp: ipo.gmp ?? 0, percent: ipo.gmpPercent ?? 0 }];
  }
  return [...history].reverse().map((entry) => ({
    name: formatHistoryDate(entry.date),
    gmp: entry.gmp,
    percent: entry.gmpPercent,
  }));
}

export function GMPTodayTable({ ipos }: Props) {
  const [expandedSlug, setExpandedSlug] = useState<string | null>(null);

  if (ipos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <BarChart2 className="w-10 h-10 text-ink4 mx-auto mb-3" />
        <p className="text-ink2 font-semibold">No GMP data to show right now.</p>
        <p className="text-sm text-ink3 mt-1">
          Once the admin adds an active IPO, its GMP will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary">
            <tr>
              <th className="w-8" />
              <th className="text-left p-4 font-semibold text-ink2 min-w-[180px]">
                IPO
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                Price Band
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                GMP
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                AI Pred. %
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                GMP Gain / Lot
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                AI Gain / Lot
              </th>
              <th className="text-right p-4 font-semibold text-ink2 whitespace-nowrap">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {ipos.map((ipo, idx) => {
              const gmp = ipo.gmp ?? 0;
              const gmpPct = ipo.gmpPercent ?? 0;
              const aiPct = ipo.aiPrediction ?? 0;
              const lot = ipo.lotSize ?? 0;
              const priceMax = ipo.priceMax ?? 0;
              const gmpGainPerLot = gmp * lot;
              const aiGainPerLot = (priceMax * aiPct * lot) / 100;
              const isExpanded = expandedSlug === ipo.slug;
              const isLastRow = idx === ipos.length - 1;
              const priceRange =
                ipo.priceMin === ipo.priceMax
                  ? `Rs ${priceMax}`
                  : `Rs ${ipo.priceMin} - ${priceMax}`;

              return (
                <Fragment key={ipo.slug}>
                  <tr
                    className={`${
                      isLastRow && !isExpanded ? '' : 'border-b border-border'
                    } hover:bg-secondary/30 transition-colors cursor-pointer`}
                    onClick={() =>
                      setExpandedSlug(isExpanded ? null : ipo.slug)
                    }
                    aria-expanded={isExpanded}
                  >
                    <td className="p-4">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-ink3" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-ink3" />
                      )}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/ipo/${ipo.slug}`}
                        className="font-semibold text-ink hover:text-primary transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {ipo.name}
                      </Link>
                      <p className="text-xs text-ink3 mt-0.5">
                        {ipo.exchange} | Lot: {lot.toLocaleString('en-IN')}
                      </p>
                    </td>
                    <td className="p-4 text-right font-medium text-ink">
                      {priceRange}
                    </td>
                    <td className="p-4 text-right">
                      <div
                        className={`inline-flex items-center gap-1 font-bold ${
                          gmp > 0
                            ? 'text-emerald'
                            : gmp < 0
                            ? 'text-destructive'
                            : 'text-ink3'
                        }`}
                      >
                        {gmp > 0 ? (
                          <TrendingUp className="w-3.5 h-3.5" />
                        ) : gmp < 0 ? (
                          <TrendingDown className="w-3.5 h-3.5" />
                        ) : null}
                        {gmp > 0 ? '+' : ''}Rs {gmp}
                      </div>
                      <div className="text-[11px] text-ink4 mt-0.5">
                        {gmpPct > 0 ? '+' : ''}
                        {gmpPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div
                        className={`inline-flex items-center gap-1 font-bold ${
                          aiPct > 0
                            ? 'text-emerald'
                            : aiPct < 0
                            ? 'text-destructive'
                            : 'text-ink3'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        {aiPct > 0 ? '+' : ''}
                        {aiPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-bold ${
                          gmpGainPerLot > 0
                            ? 'text-emerald'
                            : gmpGainPerLot < 0
                            ? 'text-destructive'
                            : 'text-ink3'
                        }`}
                      >
                        {gmpGainPerLot > 0 ? '+' : ''}Rs{' '}
                        {Math.round(gmpGainPerLot).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span
                        className={`font-bold ${
                          aiGainPerLot > 0
                            ? 'text-emerald'
                            : aiGainPerLot < 0
                            ? 'text-destructive'
                            : 'text-ink3'
                        }`}
                      >
                        {aiGainPerLot > 0 ? '+' : ''}Rs{' '}
                        {Math.round(aiGainPerLot).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="p-4 text-right text-ink3 text-xs whitespace-nowrap">
                      {formatShortDate(ipo.gmpLastUpdated)}
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr
                      className={`${
                        isLastRow ? '' : 'border-b border-border'
                      } bg-secondary/20`}
                    >
                      <td colSpan={8} className="p-4 md:p-6">
                        <GmpExpandedPanel ipo={ipo} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Expanded panel per IPO — mirrors the "GMP History" tab on the IPO detail
// page so users see the exact same trend chart + historical data table.
function GmpExpandedPanel({ ipo }: { ipo: IPO }) {
  const history = ipo.gmpHistory ?? [];
  const chartData = buildChartData(ipo);
  const latestGmp = ipo.gmp ?? 0;
  const latestPct = ipo.gmpPercent ?? 0;
  const priceMax = ipo.priceMax ?? 0;

  const badgeTone =
    latestGmp > 0
      ? 'bg-emerald-bg text-emerald'
      : latestGmp < 0
      ? 'bg-destructive-bg text-destructive'
      : 'bg-secondary text-ink3';

  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-ink">
          GMP Trend — {ipo.name}
        </h3>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-3 py-1 rounded-lg ${badgeTone}`}>
            Latest: {latestGmp >= 0 ? '+' : ''}Rs {latestGmp} (
            {latestPct >= 0 ? '+' : ''}
            {latestPct.toFixed(1)}%)
          </span>
          <Link
            href={`/ipo/${ipo.slug}`}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View full analysis
          </Link>
        </div>
      </div>

      {/* Trend chart */}
      <div className="bg-card rounded-xl border border-border p-3 md:p-4 mb-4">
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id={`gmp-grad-${ipo.slug}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor="var(--emerald-mid)"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="var(--emerald-mid)"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'var(--ink3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--ink3)' }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={false}
                tickFormatter={(v) => `Rs ${v}`}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number) => [`Rs ${value}`, 'GMP']}
              />
              <Area
                type="monotone"
                dataKey="gmp"
                stroke="var(--emerald-mid)"
                strokeWidth={2}
                fill={`url(#gmp-grad-${ipo.slug})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Historical Data table — matches the IPO detail page's GMP tab. */}
      {history.length > 0 ? (
        <div>
          <h4 className="font-semibold text-sm mb-3 text-ink">Historical Data</h4>
          <div className="overflow-x-auto bg-card rounded-xl border border-border">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left py-2 px-3 font-bold text-ink3">
                    Date
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-ink3">
                    GMP (Rs)
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-ink3">
                    Premium %
                  </th>
                  <th className="text-right py-2 px-3 font-bold text-ink3">
                    Est. Listing (Rs)
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, index) => {
                  const estListing = priceMax + (entry.gmp ?? 0);
                  const toneGmp =
                    entry.gmp > 0
                      ? 'text-emerald-mid'
                      : entry.gmp < 0
                      ? 'text-destructive'
                      : 'text-ink3';
                  const tonePct =
                    entry.gmpPercent > 0
                      ? 'text-emerald-mid'
                      : entry.gmpPercent < 0
                      ? 'text-destructive'
                      : 'text-ink3';
                  return (
                    <tr
                      key={`${entry.date}-${index}`}
                      className="border-b border-border last:border-b-0"
                    >
                      <td
                        className={`py-2 px-3 ${
                          index === 0 ? 'font-bold text-emerald-mid' : 'text-ink2'
                        }`}
                      >
                        {formatHistoryDate(entry.date)}
                        {index === 0 && ' (Latest)'}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${toneGmp}`}>
                        {entry.gmp > 0 ? '+' : ''}Rs {entry.gmp}
                      </td>
                      <td className={`py-2 px-3 text-right font-bold ${tonePct}`}>
                        {entry.gmpPercent > 0 ? '+' : ''}
                        {entry.gmpPercent.toFixed(1)}%
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-ink">
                        Rs {estListing.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-xs text-ink3">
          GMP history will appear here once multiple data points have been
          recorded for this IPO.
        </p>
      )}
    </div>
  );
}
