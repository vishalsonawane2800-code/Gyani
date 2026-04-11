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

// Manual median values for quick UI editing without backend changes
const manualMedianListingGain: Record<'mainboard' | 'sme', number> = {
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-cobalt leading-none">
            {stats.total}
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">{label} Listed</div>
        </div>
        <div className="col-span-2 sm:col-span-2 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-3 text-center shadow-sm min-h-[72px] sm:min-h-[84px] flex flex-col items-center justify-center">
          <div className="font-[family-name:var(--font-sora)] text-[18px] sm:text-[20px] font-black text-emerald leading-none">
            {stats.avgListingGain >= 0 ? '+' : ''}{stats.avgListingGain}%
          </div>
          <div className="text-[10px] sm:text-[11px] text-ink3 mt-1 leading-tight">Avg Listing Gains</div>
          <div className="text-[9px] sm:text-[10px] text-ink3/90 mt-1 leading-tight">
            Median: {manualMedianListingGain[category] >= 0 ? '+' : ''}{manualMedianListingGain[category]}%
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-gold-mid leading-none">
            {stats.avgSubscription}x
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">Avg Subscription</div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
          <div className="font-[family-name:var(--font-sora)] text-[15px] font-black text-emerald leading-none">
            {stats.inGainOnListing}
          </div>
          <div className="text-[9px] text-ink3 mt-1 leading-tight">Gain on Listing</div>
        </div>
        <div className="bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl p-2.5 text-center shadow-sm">
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
  const stats = ipoStats ?? fallbackStats;
  const active = stats[activeTab];

  return (
    <div className="bg-gradient-to-br from-[#F8FAFF] via-[#F0F4FF] to-[#EEF2FF] border border-primary/15 rounded-2xl p-4 sm:p-5 mb-7 relative overflow-hidden shadow-[0_4px_20px_rgba(79,70,229,0.08)]">

      {/* Subtle decorative glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      {/* TOP SECTION: Score + Text + Mini stat pills */}
      <div className="flex flex-row items-start gap-4 sm:gap-6 relative">

        {/* LEFT: Score Circle */}
        <div className="shrink-0 flex flex-col items-center">
          <svg width="72" height="72" viewBox="0 0 106 106" aria-label="Market sentiment score: 38 out of 100" className="sm:w-[90px] sm:h-[90px]">
            <circle cx="53" cy="53" r="42" fill="none" stroke="#E5E7EB" strokeWidth="10"/>
            <circle
              cx="53" cy="53" r="42" fill="none"
              stroke="#F59E0B" strokeWidth="10"
              strokeDasharray="100 263" strokeDashoffset="66"
              strokeLinecap="round"
            />
            <text x="53" y="48" textAnchor="middle" fill="#111827" fontFamily="var(--font-sora)" fontSize="25" fontWeight="800">38</text>
            <text x="53" y="63" textAnchor="middle" fill="#6B7280" fontFamily="var(--font-dm-sans)" fontSize="11">/100</text>
          </svg>
          <div className="text-center text-[10px] sm:text-[11px] font-extrabold text-gold-mid tracking-wide mt-1">
            CAUTIOUS
          </div>
        </div>

        {/* RIGHT: Text + mini pill stats in corner */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1 sm:gap-1.5 text-[9px] sm:text-[10.5px] font-extrabold tracking-wider text-primary uppercase mb-1.5 bg-primary/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full">
                IPOGyani AI - Market Pulse
              </div>
              <h2 className="font-[family-name:var(--font-sora)] text-base sm:text-lg font-extrabold text-foreground mb-0.5 sm:mb-1">
                Overall Market Sentiment
              </h2>
              <p className="text-[10.5px] sm:text-[11.5px] text-ink3 leading-relaxed line-clamp-2">
                FY26 IPO returns disappoint &mdash; investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution.
              </p>
            </div>


          </div>


        </div>
      </div>

      {/* Score Breakdown - compact pills */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50">
          <span className="font-[family-name:var(--font-sora)] text-[13px] font-black leading-none text-destructive">32</span>
          <span className="text-[9px] text-ink3">Finfluencers</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50">
          <span className="font-[family-name:var(--font-sora)] text-[13px] font-black leading-none text-gold-mid">41</span>
          <span className="text-[9px] text-ink3">News & Media</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50">
          <span className="font-[family-name:var(--font-sora)] text-[13px] font-black leading-none text-destructive">35</span>
          <span className="text-[9px] text-ink3">Big Firms</span>
        </div>
        <div className="flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm border border-white/50">
          <span className="font-[family-name:var(--font-sora)] text-[13px] font-black leading-none text-destructive">28</span>
          <span className="text-[9px] text-ink3">Retail Mood</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-primary/10 mt-4 pt-4">

        {/* Tab switcher */}
        <div className="flex items-center gap-1 mb-3">
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
