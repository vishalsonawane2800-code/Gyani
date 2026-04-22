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
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Sparkles, BarChart2 } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface Props {
  ipos: IPO[];
}

// Compact IST date+time formatter used for the "last updated" cell.
function formatShortDate(dateString?: string | null): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

// Build chart data from an IPO's gmpHistory. History is typically stored
// newest -> oldest (see ipo-tabs); we reverse so the X axis is chronological.
function buildChartData(ipo: IPO) {
  const history = ipo.gmpHistory ?? [];
  if (history.length === 0) {
    // Synthesize a single point from the latest value so the chart still
    // renders something useful instead of an empty container.
    return [
      { name: 'Today', gmp: ipo.gmp ?? 0, percent: ipo.gmpPercent ?? 0 },
    ];
  }
  return [...history].reverse().map((entry) => ({
    name: entry.date?.includes('-')
      ? new Date(entry.date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
        })
      : entry.date,
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
              // One-lot rupee gains for both GMP and AI predicted price.
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
                      className={`${isLastRow ? '' : 'border-b border-border'} bg-secondary/20`}
                    >
                      <td colSpan={8} className="p-4 md:p-6">
                        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                          <h3 className="text-sm font-semibold text-ink">
                            GMP Trend — {ipo.name}
                          </h3>
                          <Link
                            href={`/ipo/${ipo.slug}`}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            View full analysis
                          </Link>
                        </div>

                        <div className="bg-card rounded-xl border border-border p-3 md:p-4">
                          <div className="h-56 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={buildChartData(ipo)}
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
