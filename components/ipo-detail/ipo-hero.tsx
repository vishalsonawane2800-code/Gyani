'use client';

import { Clock, TrendingUp, BarChart3, RefreshCw } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDateRange, formatPrice, formatDate } from '@/lib/data';
import { useRefreshCountdown, formatRefreshCountdown } from '@/lib/use-refresh-countdown';

function scrollToSection(sectionId: string) {
  // Map section IDs to tab IDs
  const tabMap: Record<string, string> = {
    'gmp-history-section': 'tab-gmp',
    'subscription-section': 'tab-subscription',
  };
  
  // Click the corresponding tab first
  const tabId = tabMap[sectionId];
  if (tabId) {
    const tabButton = document.getElementById(tabId);
    if (tabButton) {
      tabButton.click();
    }
  }
  
  // Then scroll to the section
  setTimeout(() => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}

interface IPOHeroProps {
  ipo: IPO;
}

// Generate abbreviation from company name
function generateAbbr(name: string | undefined | null): string {
  if (!name) return 'IP';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export function IPOHero({ ipo }: IPOHeroProps) {
  // Shared 15-min wall-clock countdown — synced with the worker's `*/15 * * * *`
  // schedule and with every other refresh timer across the app.
  const refreshSeconds = useRefreshCountdown(15);

  const getStatusBadge = () => {
    switch (ipo.status) {
      case 'open': return { label: 'Open', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      case 'lastday': return { label: 'Last Day', className: 'bg-gold-bg text-gold border-gold/20' };
      case 'allot': return { label: 'Allotment Day', className: 'bg-primary-bg text-primary border-primary/20' };
      case 'listing': return { label: 'Listing Day', className: 'bg-emerald-bg text-emerald border-emerald/20' };
      case 'upcoming': return { label: 'Upcoming', className: 'bg-secondary text-ink3 border-border' };
      default: return { label: ipo.status, className: 'bg-muted text-muted-foreground' };
    }
  };

  const statusBadge = getStatusBadge();
  const gmp = ipo.gmp ?? 0;
  const priceMax = ipo.priceMax ?? 0;
  const priceMin = ipo.priceMin ?? 0;
  const lotSize = ipo.lotSize ?? 1;
  const gmpPercent = ipo.gmpPercent ?? 0;
  const subscription = ipo.subscription ?? { total: 0, day: 0, isFinal: false };
  
  const isPositiveGMP = gmp > 0;
  const minInvestment = priceMax * lotSize;
  
  // Dynamic calculations
  const estimatedListingPrice = priceMax + gmp;
  const estimatedProfit = gmp * lotSize;
  const estimatedProfitPercent = priceMax > 0 ? ((gmp / priceMax) * 100).toFixed(1) : '0';

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      {/* Top Row */}
      <div className="flex flex-wrap gap-6 items-start mb-6">
        {/* Logo & Info */}
        {ipo.logoUrl ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ipo.logoUrl}
              alt={`${ipo.name} logo`}
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center font-[family-name:var(--font-sora)] font-black text-2xl shrink-0"
            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
          >
            {generateAbbr(ipo.name)}
          </div>
        )}
        
        <div className="flex-1 min-w-[200px]">
          <h1 className="font-[family-name:var(--font-sora)] text-xl font-extrabold mb-1">
            {ipo.name} IPO
          </h1>
          <p className="text-[13px] text-ink3 mb-2">
            {ipo.sector} - {ipo.aboutCompany?.split('.')[0] || 'Company details'}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-xl border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-cobalt-bg text-cobalt">
              {ipo.exchange}
            </span>
            <span className="text-[12px] text-ink3 font-medium self-center">
              {formatDateRange(ipo.openDate, ipo.closeDate)}
            </span>
          </div>
        </div>

        {/* Price Block */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Price Band</p>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            {priceMax >= 100000 ? formatPrice(priceMax) : `Rs ${priceMin} - ${priceMax}`}
          </p>
          <p className="text-[11px] text-ink3 mt-1">Cut-off: Rs {priceMax.toLocaleString()} per share</p>
          <p className="text-[11px] text-ink4 mt-0.5">
            Lot: {lotSize.toLocaleString()} - Min Rs {minInvestment >= 100000 ? `${(minInvestment / 100000).toFixed(2)}L` : minInvestment.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Key Dates Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-secondary rounded-xl">
        <div className="text-center">
          <p className="text-[10px] text-ink4 font-semibold">Open</p>
          <p className="text-[12px] font-bold">{formatDate(ipo.openDate)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-ink4 font-semibold">Last Day</p>
          <p className="text-[12px] font-bold">{formatDate(ipo.closeDate)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-ink4 font-semibold">Allotment</p>
          <p className="text-[12px] font-bold">{formatDate(ipo.allotmentDate)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-ink4 font-semibold">Listing</p>
          <p className="text-[12px] font-bold">{formatDate(ipo.listDate)}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4">GMP Today</p>
            <div className="flex items-center gap-1 text-[9px] text-ink4">
              <Clock className="w-3 h-3" />
              {formatTimeAgo(ipo.gmpLastUpdated)}
            </div>
          </div>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${isPositiveGMP ? 'text-emerald-mid' : 'text-destructive'}`}>
            {isPositiveGMP ? '+' : ''}Rs {Math.abs(gmp).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">{isPositiveGMP ? '+' : ''}{gmpPercent}% premium</p>
          {/* Refresh Timer */}
          <div className="flex items-center gap-1 mt-2 text-[9px] text-ink4">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="tabular-nums">Refresh in {formatRefreshCountdown(refreshSeconds)}</span>
          </div>
          {/* GMP Graph Button */}
          <div className="mt-2">
            <button 
              onClick={() => scrollToSection('gmp-history-section')}
              className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-emerald-bg text-emerald border border-emerald/20 hover:bg-emerald/10 transition-colors"
            >
              <TrendingUp className="w-3 h-3" />
              GMP Graph
            </button>
          </div>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4">Est. Listing Price</p>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-emerald-bg text-emerald">GMP Based</span>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            Rs {estimatedListingPrice >= 100000 ? `${(estimatedListingPrice / 100000).toFixed(2)}L` : estimatedListingPrice.toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">Issue Price + GMP (Dynamic)</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4">Est. Profit (1 Lot)</p>
            <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-emerald-bg text-emerald">GMP Based</span>
          </div>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${estimatedProfit >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            {estimatedProfit >= 0 ? '+' : ''}Rs {Math.abs(estimatedProfit).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">
            {estimatedProfit >= 0 ? '+' : ''}{estimatedProfitPercent}% ({lotSize} shares)
          </p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Subscription</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${
            subscription.total > 1 ? 'text-emerald-mid' : subscription.total > 0 ? 'text-gold-mid' : 'text-ink4'
          }`}>
            {subscription.total > 0 ? `${subscription.total}x` : '-'}
          </p>
          <p className="text-[11px] text-ink3 mt-1">
            {subscription.isFinal ? 'Final' : subscription.day > 0 ? `Day ${subscription.day} - Live` : 'Not open'}
          </p>
          {/* Subscription Graph Button */}
          <div className="mt-3">
            <button 
              onClick={() => scrollToSection('subscription-section')}
              className="w-full flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold bg-cobalt-bg text-cobalt border border-cobalt/20 hover:bg-cobalt/10 transition-colors"
            >
              <BarChart3 className="w-3 h-3" />
              Sub. Graph
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
