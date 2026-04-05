'use client';

import { useState, useEffect } from 'react';
import { Calendar, IndianRupee, BarChart3, Layers, Building2, Users, TrendingUp, Sparkles, RefreshCw, Clock } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';

interface DetailSidebarProps {
  ipo: IPO;
}

export function DetailSidebar({ ipo }: DetailSidebarProps) {
  // Countdown timer state (5 minutes = 300 seconds)
  const [countdown, setCountdown] = useState(300);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Reset to 5 minutes when timer reaches 0
          return 300;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Format countdown as M:SS
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
            <span>{formatCountdown(countdown)}</span>
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
          <span className="text-[11px] font-bold text-emerald">{formatCountdown(countdown)}</span>
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

      {/* Issue Details */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Issue Details</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink3">Total Issue Size</span>
            <div className="text-right">
              <span className="text-[12px] font-semibold">{ipo.issueSize}</span>
              {ipo.issueDetails && (
                <p className="text-[10px] text-ink4">
                  {((ipo.issueDetails.totalIssueSizeCr * 10000000) / ipo.priceMax).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')} shares
                </p>
              )}
            </div>
          </div>
          
          {ipo.leadManager && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink3">Lead Manager</span>
              <span className="text-[12px] font-semibold truncate max-w-[140px]">{ipo.leadManager}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink3">Fresh Issue</span>
            <div className="text-right">
              <span className="text-[12px] font-semibold">Rs {ipo.issueDetails?.freshIssueCr || '-'} Cr</span>
              {ipo.issueDetails && (
                <p className="text-[10px] text-ink4">({ipo.issueDetails.freshIssuePercent.toFixed(0)}%)</p>
              )}
            </div>
          </div>
          
          {ipo.issueDetails?.ofsCr && ipo.issueDetails.ofsCr > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink3">OFS</span>
              <div className="text-right">
                <span className="text-[12px] font-semibold">Rs {ipo.issueDetails.ofsCr} Cr</span>
                <p className="text-[10px] text-ink4">({ipo.issueDetails.ofsPercent.toFixed(0)}%)</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink3">Net Offered to Public</span>
            <span className="text-[12px] font-semibold">{ipo.issueSize}</span>
          </div>
          
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-ink4 font-semibold">Reservation Quota</span>
            </div>
            {ipo.issueDetails && (
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-cobalt-bg border border-cobalt/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-ink4">QIB</p>
                  <p className="text-[12px] font-bold text-cobalt">{ipo.issueDetails.qibQuotaPercent}%</p>
                </div>
                <div className="bg-emerald-bg border border-emerald/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-ink4">Retail</p>
                  <p className="text-[12px] font-bold text-emerald">{ipo.issueDetails.retailQuotaPercent}%</p>
                </div>
                <div className="bg-gold-bg border border-gold/20 rounded-lg p-2 text-center">
                  <p className="text-[10px] text-ink4">NII</p>
                  <p className="text-[12px] font-bold text-gold">{ipo.issueDetails.niiQuotaPercent}%</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-ink3">Registrar</span>
            <span className="text-[12px] font-semibold">{ipo.registrar}</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
