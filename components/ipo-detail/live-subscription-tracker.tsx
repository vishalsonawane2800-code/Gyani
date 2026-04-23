'use client';

import { useEffect, useState } from 'react';
import type { IPO } from '@/lib/data';
import { TrendingUp } from 'lucide-react';

interface SubscriptionData {
  category: string;
  applied: number;
  times: number;
  updated_at?: string;
}

interface LiveSubscriptionTrackerProps {
  ipo: IPO;
}

export function LiveSubscriptionTracker({ ipo }: LiveSubscriptionTrackerProps) {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Render-time derivation: is the IPO still actively bidding, or are we
  // showing the final subscription snapshot?
  const statusStr = String(ipo.status ?? '');
  const isLiveBidding = ['open', 'closing', 'lastday'].includes(statusStr);
  const isFinal = ['closed', 'allot', 'listing'].includes(statusStr);
  const isUpcomingOrUnknown = !isLiveBidding && !isFinal;

  // Color coding for different categories - matching page theme
  const categoryConfig: Record<string, { bg: string; border: string; text: string; label: string }> = {
    retail: {
      bg: 'bg-cobalt-bg',
      border: 'border-cobalt/20',
      text: 'text-cobalt',
      label: 'Retail'
    },
    nii: {
      bg: 'bg-gold-bg',
      border: 'border-gold/20',
      text: 'text-gold',
      label: 'NII (HNI)'
    },
    qib: {
      bg: 'bg-emerald-bg',
      border: 'border-emerald/20',
      text: 'text-emerald',
      label: 'QIB'
    },
    total: {
      bg: 'bg-primary-bg',
      border: 'border-primary/20',
      text: 'text-primary',
      label: 'Total'
    }
  };

  // Build a snapshot from the ipos table columns (populated by the cron
  // scraper) so the tracker has something to render even before the
  // `subscription_live` table gets populated or if the API call fails.
  const buildScrapedFallback = (): SubscriptionData[] => {
    const sub = ipo.subscription;
    if (!sub) return [];
    const parseX = (v: string | number | undefined) => {
      if (v == null) return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v).replace(/x/gi, '').trim());
      return Number.isFinite(n) ? n : 0;
    };
    const rows: SubscriptionData[] = [
      { category: 'retail', applied: 0, times: parseX(sub.retail) },
      { category: 'nii', applied: 0, times: parseX(sub.nii) },
      { category: 'qib', applied: 0, times: parseX(sub.qib) },
      { category: 'total', applied: 0, times: parseX(sub.total) },
    ];
    return rows.some((r) => r.times > 0) ? rows : [];
  };

  useEffect(() => {
    // Any status from "bidding started" onward should surface subscription
    // figures. Open/lastday/closing are live; closed/allot/listing show the
    // *final* snapshot captured at close. `closing` is not a real IPOStatus
    // value today but kept for forward-compat.
    const trackableStatuses: string[] = [
      'open',
      'closing',
      'lastday',
      'closed',
      'allot',
      'listing',
    ];
    const statusStr = String(ipo.status ?? '');
    const isTrackable = trackableStatuses.includes(statusStr);
    // Only truly live states get the 30s poll + "Live" badge.
    const livePollStatuses: string[] = ['open', 'closing', 'lastday'];
    const isLiveStatus = livePollStatuses.includes(statusStr);

    // Seed from scraped ipos columns immediately so the UI is never empty
    // while the first fetch is in flight.
    if (isTrackable) {
      const fallback = buildScrapedFallback();
      if (fallback.length > 0) {
        setSubscriptionData(fallback);
        setIsLive(true);
        setLastUpdated(
          ipo.subscriptionLastScraped
            ? new Date(ipo.subscriptionLastScraped)
            : new Date()
        );
      }
    }

    const fetchSubscriptionData = async () => {
      try {
        const response = await fetch(
          `/api/admin/ipos/${ipo.id}/subscription-live`
        );
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setSubscriptionData(data);
            setIsLive(true);
            setLastUpdated(new Date());
            return;
          }
        }

        // API returned no rows yet — fall back to scraped columns / bulk
        // entry snapshot shipped with the RSC payload.
        const fallback =
          ipo.subscriptionLive && Array.isArray(ipo.subscriptionLive)
            ? (ipo.subscriptionLive as any).map((s: any) => ({
                category: s.category,
                times: Number(s.subscriptionTimes ?? s.times ?? 0),
                applied: Number(s.sharesBidFor ?? s.applied ?? 0),
                updated_at: s.updatedAt,
              }))
            : buildScrapedFallback();

        if (fallback.length > 0) {
          setSubscriptionData(fallback);
          setIsLive(true);
          setLastUpdated(
            ipo.subscriptionLastUpdated
              ? new Date(ipo.subscriptionLastUpdated)
              : ipo.subscriptionLastScraped
                ? new Date(ipo.subscriptionLastScraped)
                : new Date()
          );
        }
      } catch (error) {
        console.error('Error fetching subscription data:', error);
        const fallback = buildScrapedFallback();
        if (fallback.length > 0) {
          setSubscriptionData(fallback);
          setIsLive(true);
          setLastUpdated(
            ipo.subscriptionLastScraped
              ? new Date(ipo.subscriptionLastScraped)
              : new Date()
          );
        }
      }
    };

    if (ipo.id && isTrackable) {
      fetchSubscriptionData();
      // Only poll while the issue is actually live. Post-close the numbers
      // are frozen, so a single fetch is enough.
      if (isLiveStatus) {
        const interval = setInterval(fetchSubscriptionData, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [
    ipo.id,
    ipo.status,
    ipo.subscription,
    ipo.subscriptionLive,
    ipo.subscriptionLastUpdated,
    ipo.subscriptionLastScraped,
  ]);

  // Placeholder: shown only when we truly have no data AND the IPO isn't
  // yet in a state that should have data (upcoming/unknown). If the IPO is
  // closed/allot/listing but we still have no numbers, show a "final data
  // unavailable" variant instead of the misleading "will appear when IPO
  // opens" copy.
  if (!isLive || !subscriptionData || subscriptionData.length === 0) {
    const headerTitle = isFinal
      ? 'Final Subscription'
      : 'Live Subscription Tracker';
    const headerSub = isFinal
      ? 'Final subscription snapshot'
      : 'Real-time subscription data';
    const bodyPrimary = isFinal
      ? 'Final subscription data is being compiled.'
      : isUpcomingOrUnknown
        ? 'Subscription data will appear when IPO opens'
        : 'Waiting for first subscription update…';
    return (
      <div className="bg-card rounded-xl border border-border card-shadow p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-muted rounded-lg">
            <TrendingUp className="w-5 h-5 text-ink3" />
          </div>
          <div>
            <h3 className="font-bold text-ink">{headerTitle}</h3>
            <p className="text-xs text-ink3">{headerSub}</p>
          </div>
        </div>

        <div className="bg-muted rounded-lg p-4 text-center border border-border">
          <p className="text-ink2 text-sm mb-2">{bodyPrimary}</p>
          <p className="text-xs text-ink3">Current IPO Status: <span className="capitalize font-semibold text-ink2">{ipo.status}</span></p>
        </div>
      </div>
    );
  }

  // Filter and organize subscription data
  const categories = ['retail', 'nii', 'qib', 'total'];
  const filteredData = subscriptionData.filter(item => 
    categories.includes(item.category.toLowerCase())
  );

  return (
    <div className="bg-card rounded-xl border border-border card-shadow p-6 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-bg rounded-lg">
            <TrendingUp className="w-5 h-5 text-emerald" />
          </div>
          <div>
            <h3 className="font-bold text-ink">
              {isFinal ? 'Final Subscription' : 'Live Subscription Tracker'}
            </h3>
            <p className="text-xs text-ink3">
              {isFinal
                ? `Closed on ${
                    ipo.closeDate
                      ? new Date(ipo.closeDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'close date'
                  } • Final snapshot`
                : `Day ${ipo.subscription?.day || '1'} • Real-time updates`}
            </p>
          </div>
        </div>

        {lastUpdated && (
          <div className="flex items-center gap-2">
            {isLiveBidding ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-mid opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald"></span>
                </span>
                <p className="text-xs font-mono text-emerald">
                  {new Date(lastUpdated).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                </p>
              </>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted border border-border text-[11px] font-semibold text-ink2 uppercase tracking-wider">
                Final
              </span>
            )}
          </div>
        )}
      </div>

      {/* Subscription Blocks Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredData.map((item) => {
          const config = categoryConfig[item.category.toLowerCase()] || categoryConfig.retail;

          // Calculate multiplier for display
          const multiplier = item.times?.toFixed(2) || '0.00';

          return (
            <div
              key={item.category}
              className={`${config.bg} ${config.border} border rounded-lg p-4 transition-all duration-200 hover:card-shadow-hover`}
            >
              <p className="text-xs font-semibold text-ink3 uppercase tracking-wider mb-2">
                {config.label}
              </p>

              <div className="flex items-baseline gap-1">
                <span className={`text-3xl font-bold ${config.text}`}>
                  {multiplier}
                </span>
                <span className="text-lg font-semibold text-ink4">x</span>
              </div>

              {item.applied ? (
                <p className="text-xs text-ink3 mt-2">
                  Applied: <span className="font-medium text-ink2">{item.applied.toLocaleString('en-IN')}</span> shares
                </p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Footer Note */}
      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-ink3">
          {isFinal
            ? '* Final subscription snapshot captured at IPO close. Shown as "Times Oversubscribed" (x).'
            : '* Subscription data updates during IPO period. Shown as "Times Oversubscribed" (x). Auto-refreshes every 30 seconds.'}
        </p>
      </div>
    </div>
  );
}
