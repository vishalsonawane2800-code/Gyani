'use client';

import { useState } from 'react';
import { List, TrendingUp } from 'lucide-react';
import type { IPOCategoryStats } from '@/lib/supabase/queries';

interface MarketSentimentProps {
  ipoStats?: {
    mainboard: IPOCategoryStats;
    sme: IPOCategoryStats;
  };
}

function isEmptyStats(stats: IPOCategoryStats | undefined): boolean {
  if (!stats) return true;
  return (
    stats.total === 0 &&
    stats.upcoming === 0 &&
    stats.inGainOnListing === 0 &&
    stats.inLossOnListing === 0 &&
    stats.avgListingGain === 0 &&
    stats.avgSubscription === 0
  );
}

// Fallback static stats if Supabase is unavailable
const fallbackStats = {
  mainboard: {
    total: 19, upcoming: 1, inGainOnListing: 7, inLossOnListing: 12,
    currentlyInGain: 6, currentlyInLoss: 12, totalRaisedCr: 18240, avgListingGain: -1.43, avgSubscription: 2.66,
  },
  sme: {
    total: 44, upcoming: 3, inGainOnListing: 20, inLossOnListing: 21,
    currentlyInGain: 22, currentlyInLoss: 19, totalRaisedCr: 4120, avgListingGain: 18.7, avgSubscription: 112.4,
  },
};

// Manual median values for quick UI editing without backend changes
const manualMedianListingGain: Record<'mainboard' | 'sme', number> = {
  mainboard: -1.27,
  sme: 12.6,
};

function CategoryStats({
  stats,
  label,
  category,
}: {
  stats: IPOCategoryStats;
  label: string;
  category: 'mainboard' | 'sme';
}) {
  return (
    <div>
      {/* All 6 boxes - 3 columns on mobile, 6 columns on desktop */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* 1. Mainboard Listed IPOs */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className="text-xl sm:text-2xl font-black text-cobalt leading-none">
            {stats.total}
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">{label} Listed</div>
        </div>

        {/* 2. Avg Subscription */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className="text-xl sm:text-2xl font-black text-gold-mid leading-none">
            {stats.avgSubscription}x
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">Avg Subscription</div>
        </div>

        {/* 3. Avg Listing Gains */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className={`text-xl sm:text-2xl font-black leading-none ${
            stats.avgListingGain >= 0 ? 'text-emerald' : 'text-destructive'
          }`}>
            {stats.avgListingGain >= 0 ? '+' : ''}{stats.avgListingGain}%
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">Avg Listing Gains</div>
        </div>

        {/* 4. Median Listing Gains */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className={`text-xl sm:text-2xl font-black leading-none ${
            manualMedianListingGain[category] >= 0 ? 'text-emerald' : 'text-destructive'
          }`}>
            {manualMedianListingGain[category] >= 0 ? '+' : ''}{manualMedianListingGain[category]}%
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">Median Listing Gains</div>
        </div>

        {/* 5. IPOs Open in Profit */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className="text-xl sm:text-2xl font-black text-emerald leading-none">
            {stats.inGainOnListing}
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">IPOs Open in Profit</div>
        </div>

        {/* 6. IPOs Open in Loss */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-lg p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center min-h-fit sm:min-h-fit">
          <div className="text-xl sm:text-2xl font-black text-destructive leading-none">
            {stats.inLossOnListing}
          </div>
          <div className="text-xs sm:text-sm text-ink3 mt-1 leading-tight font-semibold">IPOs Open in Loss</div>
        </div>
      </div>

    </div>
  );
}

export function MarketSentiment({ ipoStats }: MarketSentimentProps) {
  const [activeTab, setActiveTab] = useState<'mainboard' | 'sme'>('mainboard');
  const stats = {
    mainboard: isEmptyStats(ipoStats?.mainboard) ? fallbackStats.mainboard : ipoStats!.mainboard,
    sme: isEmptyStats(ipoStats?.sme) ? fallbackStats.sme : ipoStats!.sme,
  };
  const active = stats[activeTab];

  return (
    <div className="w-full bg-gradient-to-b from-sky-50/80 to-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="space-y-4">
        {/* Header with tabs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('mainboard')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'mainboard'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/60 text-ink2 hover:bg-white/90 border border-white/60'
            }`}
          >
            <List className="w-4 h-4" />
            Mainboard
          </button>
          <button
            onClick={() => setActiveTab('sme')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'sme'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/60 text-ink2 hover:bg-white/90 border border-white/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            SME
          </button>
          <span className="ml-auto text-xs font-semibold text-ink3 bg-white/50 px-2 py-1 rounded border border-white/50">
            2026 Stats
          </span>
        </div>

        {/* Category stats */}
        <CategoryStats
          stats={active}
          label={activeTab === 'mainboard' ? 'Mainboard' : 'SME'}
          category={activeTab}
        />
      </div>
    </div>
  );
}
