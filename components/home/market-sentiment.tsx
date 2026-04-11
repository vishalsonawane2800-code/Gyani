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
      {/* Extra stats row - All 9 boxes visible on all screen sizes */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {/* 1. Total Listed */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-cobalt leading-none">
            {stats.total}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">{label} Listed</div>
        </div>

        {/* 2. Avg Listing Gains */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className={`font-[family-name:var(--font-sora)] text-[18px] sm:text-[22px] font-black leading-none ${
            stats.avgListingGain >= 0 ? 'text-emerald' : 'text-destructive'
          }`}>
            {stats.avgListingGain >= 0 ? '+' : ''}{stats.avgListingGain}%
          </div>
          <div className="text-[9px] sm:text-[10px] text-ink3 mt-1.5 leading-tight font-semibold">Avg Listing Gains</div>
        </div>

        {/* 3. Medium Listing Gains */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className={`font-[family-name:var(--font-sora)] text-[18px] sm:text-[22px] font-black leading-none ${
            manualMediumListingGain[category] >= 0 ? 'text-emerald' : 'text-destructive'
          }`}>
            {manualMediumListingGain[category] >= 0 ? '+' : ''}{manualMediumListingGain[category]}%
          </div>
          <div className="text-[9px] sm:text-[10px] text-ink3 mt-1.5 leading-tight font-semibold">Medium Listing Gains</div>
        </div>

        {/* 4. Avg Subscription */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-gold-mid leading-none">
            {stats.avgSubscription}x
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">Avg Subscription</div>
        </div>

        {/* 5. IPOs Open in Profit */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-emerald leading-none">
            {stats.inGainOnListing}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">IPOs Open in Profit</div>
        </div>

        {/* 6. IPOs Open in Loss */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-destructive leading-none">
            {stats.inLossOnListing}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">IPOs Open in Loss</div>
        </div>

        {/* Extra boxes - currently hidden, can add more stats here */}
        {/* 7. Currently In Gain */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-emerald leading-none">
            {stats.currentlyInGain}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">Currently In Gain</div>
        </div>

        {/* 8. Currently In Loss */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-destructive leading-none">
            {stats.currentlyInLoss}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">Currently In Loss</div>
        </div>

        {/* 9. Upcoming IPOs */}
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2 sm:p-3 text-center shadow-sm flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[14px] sm:text-[16px] font-black text-cobalt-mid leading-none">
            {stats.upcoming}
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1.5 leading-tight font-semibold">Upcoming IPOs</div>
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
