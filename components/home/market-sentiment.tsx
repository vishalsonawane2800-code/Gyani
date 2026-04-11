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

// Fallback static stats if Supabase is unavailable
const fallbackStats = {
  mainboard: {
    total: 19, upcoming: 1, inGainOnListing: 9, inLossOnListing: 9,
    currentlyInGain: 6, currentlyInLoss: 12, totalRaisedCr: 18240, avgListingGain: 12.4, avgSubscription: 28.6,
  },
  sme: {
    total: 44, upcoming: 3, inGainOnListing: 20, inLossOnListing: 21,
    currentlyInGain: 22, currentlyInLoss: 19, totalRaisedCr: 4120, avgListingGain: 18.7, avgSubscription: 112.4,
  },
};

// Manual "medium" values for quick UI editing without backend changes
const manualMediumListingGain: Record<'mainboard' | 'sme', number> = {
  mainboard: 7.8,
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
    <div className="space-y-3">
      {/* Extra stats row - Chittorgarh-style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2">
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-cobalt leading-none">
            {stats.total}
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">{label} Listed</div>
        </div>
        <div className="col-span-2 sm:col-span-3 lg:col-span-2 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-4 text-center shadow-sm min-h-[80px] sm:min-h-[96px] lg:min-h-[88px] flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] sm:text-[26px] lg:text-[24px] font-black text-emerald leading-none">
            {stats.avgListingGain >= 0 ? '+' : ''}{stats.avgListingGain}%
          </div>
          <div className="text-[10px] sm:text-[12px] lg:text-[11px] text-ink3 mt-2 leading-tight">Avg Listing Gains</div>
          <div className="text-[9px] sm:text-[11px] lg:text-[10px] text-ink3/90 mt-1.5 leading-tight">
            Medium: {manualMediumListingGain[category] >= 0 ? '+' : ''}{manualMediumListingGain[category]}%
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-gold-mid leading-none">
            {stats.avgSubscription}x
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">Avg Subscription</div>
        </div>
        <div className="hidden sm:block bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-emerald leading-none">
            {stats.inGainOnListing}
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">Gain on Listing</div>
        </div>
        <div className="hidden lg:block bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-destructive leading-none">
            {stats.inLossOnListing}
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">Loss on Listing</div>
        </div>
      </div>

    </div>
  );
}

export function MarketSentiment({ ipoStats }: MarketSentimentProps) {
  const [activeTab, setActiveTab] = useState<'mainboard' | 'sme'>('mainboard');
  const stats = ipoStats || fallbackStats;
  const active = stats[activeTab];

  return (
    <div className="w-full bg-gradient-to-b from-sky-50/80 to-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-4 sm:p-6 shadow-sm">
      <div className="space-y-4">
        {/* Header with tabs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setActiveTab('mainboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'mainboard'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/60 text-ink2 hover:bg-white/90 border border-white/60'
            }`}
          >
            <List className="w-3 h-3" />
            Mainboard
          </button>
          <button
            onClick={() => setActiveTab('sme')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
              activeTab === 'sme'
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/60 text-ink2 hover:bg-white/90 border border-white/60'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            SME
          </button>
          <span className="ml-auto text-[9px] font-semibold text-ink3 bg-white/50 px-2 py-1 rounded-md border border-white/50">
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
