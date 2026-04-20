'use client';

import { Calendar, IndianRupee, BarChart3, Layers, Building2, Users, TrendingUp, Sparkles, RefreshCw, Clock } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';
import { useRefreshCountdown, formatRefreshCountdown } from '@/lib/use-refresh-countdown';

interface DetailSidebarProps {
  ipo: IPO;
}

export function DetailSidebar({ ipo }: DetailSidebarProps) {
  // Shared 15-min wall-clock countdown — synced with the worker's `*/15 * * * *`
  // schedule and with every other refresh timer across the app.
  const refreshSeconds = useRefreshCountdown(15);
  const countdownLabel = formatRefreshCountdown(refreshSeconds);

  // AI-based calculations - using AI prediction percentage
  const aiPredictedListingPrice = Math.round(ipo.priceMax * (1 + ipo.aiPrediction / 100)); // Est. Listing Price = Issue Price × (1 + AI Prediction %)
  const aiEstimatedProfit = Math.round((ipo.priceMax * (ipo.aiPrediction / 100)) * ipo.lotSize); // Est. Profit = Predicted Gain per share × Lot Size
  const minInvestment = ipo.priceMax * ipo.lotSize; // Investment = Issue Price × Lot Size

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* AI Predicted Profit for 1 Lot */}
      <div className="bg-primary-bg border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <p className="text-[12px] font-bold">AI Predicted Profit</p>
              <p className="text-[10px] text-ink3">For 1 Lot ({ipo.lotSize} shares)</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-ink4">
            <RefreshCw className="w-3 h-3" />
            <span className="tabular-nums">{countdownLabel}</span>
          </div>
        </div>
        
        {/* AI Predicted Listing Price */}
        <div className="bg-background/60 rounded-xl p-3 mb-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-ink4 font-semibold">AI PREDICTED LISTING PRICE</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">Rs {aiPredictedListingPrice.toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-ink4 mt-1">Based on {ipo.aiPrediction}% AI prediction</p>
        </div>

        {/* AI Estimated Profit */}
        <div className="bg-background/60 rounded-xl p-3 mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-[10px] text-ink4 font-semibold">AI EST. PROFIT (1 LOT)</span>
            <span className={`text-[10px] font-semibold ${
              ipo.aiPrediction >= 30 ? 'text-emerald' : 
              ipo.aiPrediction >= -30 ? 'text-gold' : 'text-destructive'
            }`}>{ipo.sentimentLabel} ({ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction})</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`font-[family-name:var(--font-sora)] text-3xl font-extrabold ${aiEstimatedProfit >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
              {aiEstimatedProfit >= 0 ? '+' : '-'}Rs {Math.abs(aiEstimatedProfit).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-ink3 mt-1">
            {aiEstimatedProfit >= 0 ? '+' : ''}{ipo.aiPrediction}% ({ipo.lotSize} shares)
          </p>
        </div>

        {/* AI Prediction & Market Sentiment */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold">AI Prediction</span>
          </div>
          <span className={`font-[family-name:var(--font-sora)] text-[14px] font-bold ${ipo.aiPrediction >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
          </span>
        </div>
        

        
        {/* Refresh countdown */}
        <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border/50">
          <Clock className="w-3 h-3 text-emerald" />
          <span className="text-[10px] text-ink3">Refresh in</span>
          <span className="text-[11px] font-bold text-emerald tabular-nums">{countdownLabel}</span>
        </div>
      </div>

      {/* Basic Details */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Basic Details</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Calendar className="w-3.5 h-3.5" />
              IPO Date
            </div>
            <span className="text-[12px] font-semibold">{formatDate(ipo.openDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Calendar className="w-3.5 h-3.5" />
              Listing Date
            </div>
            <span className="text-[12px] font-semibold">{formatDate(ipo.listDate)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <IndianRupee className="w-3.5 h-3.5" />
              Face Value
            </div>
            <span className="text-[12px] font-semibold">Rs 10</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <BarChart3 className="w-3.5 h-3.5" />
              Price Band
            </div>
            <span className="text-[12px] font-semibold">Rs {ipo.priceMin} - {ipo.priceMax}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Layers className="w-3.5 h-3.5" />
              Lot Size
            </div>
            <span className="text-[12px] font-semibold">{ipo.lotSize} Shares</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Building2 className="w-3.5 h-3.5" />
              Sale Type
            </div>
            <span className="text-[12px] font-semibold">Book Building</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Users className="w-3.5 h-3.5" />
              Issue Type
            </div>
            <span className="text-[12px] font-semibold">
              {ipo.issueDetails?.ofsPercent && ipo.issueDetails.ofsPercent > 0 ? 'Fresh + OFS' : 'Fresh Issue'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <TrendingUp className="w-3.5 h-3.5" />
              Listing At
            </div>
            <span className="text-[12px] font-semibold">{ipo.exchange}</span>
          </div>
        </div>
      </div>

      {/* Quick Links / Investment Calculator could go here */}
    </aside>
  );
}
