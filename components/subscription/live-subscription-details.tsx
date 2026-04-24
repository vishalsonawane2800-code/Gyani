'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Clock, Users } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface Props {
  ipos: IPO[];
}

// Category display names — same labels as the IPO detail page Subscription
// tab so users see a consistent taxonomy across the site.
const CATEGORY_NAMES: Record<string, string> = {
  anchor: 'Anchor',
  qib: 'QIB (Ex Anchor)',
  nii: 'NII',
  bnii: 'bNII (> Rs 10L)',
  snii: 'sNII (< Rs 10L)',
  retail: 'Retail',
  employee: 'Employee',
  total: 'Total **',
};

function formatUpdatedAt(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function LiveSubscriptionDetails({ ipos }: Props) {
  // Expand the first IPO by default so the panel is never silent on load.
  const defaultSlug = ipos[0]?.slug ?? null;
  const [expandedSlug, setExpandedSlug] = useState<string | null>(defaultSlug);

  if (ipos.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <Users className="w-10 h-10 text-ink4 mx-auto mb-3" />
        <p className="text-ink2 font-semibold">
          No subscription data to show right now.
        </p>
        <p className="text-sm text-ink3 mt-1">
          Day-wise and category-wise subscription will appear here once a
          current IPO starts receiving bids.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {ipos.map((ipo) => {
        const isExpanded = expandedSlug === ipo.slug;
        const total = ipo.subscription?.total ?? 0;
        const day = ipo.subscription?.day ?? 0;
        const isSme =
          ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
        const isMainboard = ipo.exchange === 'Mainboard';
        return (
          <div
            key={ipo.slug}
            className={`border rounded-2xl overflow-hidden ${
              isMainboard
                ? 'bg-gold-bg/40 border-gold/40'
                : 'bg-card border-border'
            }`}
          >
            <button
              type="button"
              onClick={() => setExpandedSlug(isExpanded ? null : ipo.slug)}
              className={`w-full flex items-center gap-3 p-4 md:p-5 text-left transition-colors ${
                isMainboard ? 'hover:bg-gold-bg/60' : 'hover:bg-secondary/40'
              }`}
              aria-expanded={isExpanded}
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-ink3 shrink-0" />
              ) : (
                <ChevronRight className="w-4 h-4 text-ink3 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink truncate">{ipo.name}</p>
                  {isSme && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-destructive-bg text-destructive border border-destructive/40">
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      SME IPO
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink3 mt-0.5">
                  {ipo.exchange}
                  {day > 0 ? ` | Day ${day}` : ''}
                  {ipo.status ? ` | ${labelForStatus(ipo.status)}` : ''}
                </p>
              </div>
              <div className="text-right shrink-0">
                <div
                  className={`font-extrabold text-lg ${
                    total > 10
                      ? 'text-emerald'
                      : total > 1
                      ? 'text-cobalt'
                      : 'text-ink'
                  }`}
                >
                  {total > 0 ? `${total.toFixed(2)}x` : '-'}
                </div>
                <div className="text-[11px] text-ink4">Total subscription</div>
              </div>
            </button>

            {isExpanded && <IpoSubscriptionPanel ipo={ipo} />}
          </div>
        );
      })}
    </div>
  );
}

function labelForStatus(status: string): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'lastday':
      return 'Last Day';
    case 'closed':
      return 'Closed';
    case 'allot':
      return 'Allotment';
    case 'listing':
      return 'Listing';
    case 'upcoming':
      return 'Upcoming';
    case 'listed':
      return 'Listed';
    default:
      return status;
  }
}

// Renders both the category-wise live table and the day-wise history table
// — same structure as the IPO detail page's Subscription tab so users who
// navigated from /subscription see the exact data they expect.
function IpoSubscriptionPanel({ ipo }: { ipo: IPO }) {
  const subscriptionLive = ipo.subscriptionLive ?? [];
  const subHistory = ipo.subscriptionHistory ?? [];
  const lastUpdated = formatUpdatedAt(ipo.subscriptionLastUpdated);

  // Build a day -> latest-entry map so each day in the column header reads
  // from its most recent (by time) snapshot.
  const dayMap = new Map<number, (typeof subHistory)[number]>();
  subHistory.forEach((entry, idx) => {
    const dayNum = entry.dayNumber || idx + 1;
    const existing = dayMap.get(dayNum);
    if (!existing || (entry.time || '') >= (existing.time || '')) {
      dayMap.set(dayNum, entry);
    }
  });
  const dayNumbers = Array.from(dayMap.keys()).sort((a, b) => a - b);

  const historyKeyForCategory: Record<
    string,
    keyof (typeof subHistory)[number]
  > = {
    anchor: 'anchor',
    qib: 'qib',
    nii: 'nii',
    bnii: 'bnii',
    snii: 'snii',
    retail: 'retail',
    employee: 'employee',
    total: 'total',
  };

  const getDaySub = (category: string, dayNum: number): string => {
    const entry = dayMap.get(dayNum);
    const key = historyKeyForCategory[category];
    if (!entry || !key) return '-';
    const value = entry[key] as number | undefined | null;
    return value && Number(value) > 0 ? `${Number(value).toFixed(2)}x` : '-';
  };

  const noData =
    subscriptionLive.length === 0 &&
    subHistory.length === 0 &&
    !(ipo.subscription?.total ?? 0);

  return (
    <div className="border-t border-border p-4 md:p-6 space-y-6 bg-secondary/20">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-xs text-ink3 flex items-center gap-2">
          {lastUpdated && (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>Updated {lastUpdated}</span>
            </>
          )}
        </div>
        <Link
          href={`/ipo/${ipo.slug}#subscription-section`}
          className="text-xs font-semibold text-primary hover:underline"
        >
          View full analysis
        </Link>
      </div>

      {noData ? (
        <div className="bg-card border border-border rounded-xl p-6 text-center">
          <p className="text-ink3 text-sm">
            Subscription data has not been recorded for {ipo.name} yet.
          </p>
        </div>
      ) : (
        <>
          {/* Allotment Chance Percentage */}
          {ipo.subscription?.retail && (
            <AllotmentChanceWidget retail={ipo.subscription.retail} />
          )}

          {/* Category-wise live table (+ day columns if history exists) */}
          {subscriptionLive.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink mb-3">
                Category-wise Subscription (Live)
              </h3>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="text-left py-3 px-4 font-bold text-ink3">
                          Category
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3">
                          Subscription (x)
                        </th>
                        {dayNumbers.map((d) => (
                          <th
                            key={d}
                            className="text-right py-3 px-4 font-bold text-ink3 whitespace-nowrap"
                          >
                            Day {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptionLive.map((entry) => {
                        const isTotal = entry.category === 'total';
                        const isSub =
                          entry.category === 'bnii' ||
                          entry.category === 'snii';
                        return (
                          <tr
                            key={entry.category}
                            className={`border-t border-border ${
                              isTotal ? 'bg-secondary font-semibold' : ''
                            }`}
                          >
                            <td
                              className={`py-3 px-4 ${
                                isSub ? 'pl-8' : ''
                              } text-ink2`}
                            >
                              {CATEGORY_NAMES[entry.category] ?? entry.category}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-ink">
                              {entry.subscriptionTimes
                                ? `${Number(
                                    entry.subscriptionTimes,
                                  ).toFixed(2)}x`
                                : '-'}
                            </td>
                            {dayNumbers.map((d) => (
                              <td
                                key={d}
                                className="py-3 px-4 text-right text-ink2"
                              >
                                {getDaySub(entry.category, d)}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Day-wise detailed history */}
          {subHistory.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink mb-3">
                Day-wise Subscription (times)
              </h3>
              <div className="border border-border rounded-xl overflow-hidden bg-card">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-secondary">
                        <th className="text-left py-3 px-4 font-bold text-ink3">
                          Date
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3">
                          QIB (Ex Anchor)
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3">
                          NII
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3 whitespace-nowrap">
                          {'NII (> Rs 10L)'}
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3 whitespace-nowrap">
                          {'NII (< Rs 10L)'}
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3">
                          Retail
                        </th>
                        <th className="text-right py-3 px-4 font-bold text-ink3">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {subHistory.map((entry, index) => {
                        const dateStr = formatRowDate(entry.date);
                        const dayNum = entry.dayNumber || index + 1;
                        return (
                          <tr
                            key={`${entry.date}-${entry.time}-${index}`}
                            className="border-t border-border"
                          >
                            <td className="py-3 px-4 text-ink2">
                              {dateStr}{' '}
                              <span className="text-ink4">(Day {dayNum})</span>
                            </td>
                            <td className="py-3 px-4 text-right text-ink">
                              {fmtX(entry.qib)}
                            </td>
                            <td className="py-3 px-4 text-right text-ink">
                              {fmtX(entry.nii)}
                            </td>
                            <td className="py-3 px-4 text-right text-ink">
                              {fmtX(entry.bnii)}
                            </td>
                            <td className="py-3 px-4 text-right text-ink">
                              {fmtX(entry.snii)}
                            </td>
                            <td className="py-3 px-4 text-right text-ink">
                              {fmtX(entry.retail)}
                            </td>
                            <td className="py-3 px-4 text-right font-semibold text-ink">
                              {fmtX(entry.total)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Fallback summary card row when only summary data exists */}
          {subscriptionLive.length === 0 &&
            subHistory.length === 0 &&
            (ipo.subscription?.total ?? 0) > 0 && (
              <SubscriptionSummaryGrid ipo={ipo} />
            )}
        </>
      )}

      <p className="text-[11px] text-ink4">
        * Subscription data is updated multiple times during the IPO period.
        For complete details, refer to the IPO prospectus.
      </p>
    </div>
  );
}

function formatRowDate(date: string): string {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function fmtX(value: number | undefined | null): string {
  const n = Number(value ?? 0);
  if (!n || n <= 0) return '-';
  return `${n.toFixed(2)}x`;
}

function SubscriptionSummaryGrid({ ipo }: { ipo: IPO }) {
  const sub = ipo.subscription;
  if (!sub) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <div
          className={`text-2xl font-extrabold ${
            sub.total > 1 ? 'text-emerald' : 'text-gold'
          }`}
        >
          {sub.total > 0 ? `${sub.total.toFixed(2)}x` : '-'}
        </div>
        <div className="text-[11px] text-ink3 mt-1">Total</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <div className="text-2xl font-extrabold text-cobalt">
          {sub.retail || '-'}
        </div>
        <div className="text-[11px] text-ink3 mt-1">Retail</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <div className="text-2xl font-extrabold text-primary">
          {sub.nii || '-'}
        </div>
        <div className="text-[11px] text-ink3 mt-1">NII</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-4 text-center">
        <div className="text-2xl font-extrabold text-emerald">
          {sub.qib || '-'}
        </div>
        <div className="text-[11px] text-ink3 mt-1">QIB</div>
      </div>
    </div>
  );
}

function AllotmentChanceWidget({ retail }: { retail: number | string }) {
  const retailSub = typeof retail === 'string' 
    ? parseFloat(String(retail).toLowerCase().replace(/x/g, '').trim())
    : retail;

  if (!Number.isFinite(retailSub) || retailSub <= 0) {
    return null;
  }

  const allotmentChance = Math.min(100 / retailSub, 100);
  const roundedChance = Math.round(allotmentChance * 100) / 100;

  // Color coding
  let bgColor = 'bg-red-bg';
  let borderColor = 'border-red/20';
  let textColor = 'text-red';
  let label = 'Low';

  if (roundedChance >= 50) {
    bgColor = 'bg-emerald-bg';
    borderColor = 'border-emerald/20';
    textColor = 'text-emerald';
    label = 'High';
  } else if (roundedChance >= 20) {
    bgColor = 'bg-gold-bg';
    borderColor = 'border-gold/20';
    textColor = 'text-gold';
    label = 'Moderate';
  }

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 md:p-5`}>
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <div>
          <p className="text-[11px] md:text-xs text-ink3 mb-1.5">Retail Subscription</p>
          <p className={`text-lg md:text-xl font-bold ${textColor}`}>
            {retailSub.toFixed(2)}x
          </p>
        </div>
        <div>
          <p className="text-[11px] md:text-xs text-ink3 mb-1.5">Allotment Chance</p>
          <p className={`text-lg md:text-xl font-bold ${textColor}`}>
            {roundedChance.toFixed(2)}%
          </p>
        </div>
        <div>
          <p className="text-[11px] md:text-xs text-ink3 mb-1.5">Probability</p>
          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${bgColor} border ${borderColor} ${textColor}`}>
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
