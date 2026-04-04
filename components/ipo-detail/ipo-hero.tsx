import { Clock } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDateRange, formatPrice, formatDate } from '@/lib/data';

interface IPOHeroProps {
  ipo: IPO;
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
  const isPositiveGMP = ipo.gmp > 0;
  const minInvestment = ipo.priceMax * ipo.lotSize;
  const estimatedListingPrice = ipo.priceMax + ipo.gmp;
  const expectedProfit = (estimatedListingPrice - ipo.priceMax) * ipo.lotSize;
  const expectedProfitPercent = ((ipo.gmp / ipo.priceMax) * 100).toFixed(2);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      {/* Top Row */}
      <div className="flex flex-wrap gap-6 items-start mb-6">
        {/* Logo & Info */}
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center font-[family-name:var(--font-sora)] font-black text-2xl shrink-0"
          style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
        >
          {ipo.abbr}
        </div>
        
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
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-xl bg-gradient-to-r from-primary to-cobalt text-white">
              AI Tracked
            </span>
            <span className="text-[12px] text-ink3 font-medium self-center">
              {formatDateRange(ipo.openDate, ipo.closeDate)}
            </span>
          </div>
        </div>

        {/* Key Metrics Block */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Issue Price</p>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            Rs {ipo.priceMax}
          </p>
          <p className="text-[11px] text-ink3 mt-1">Price Band: Rs {ipo.priceMin} - {ipo.priceMax}</p>
        </div>
      </div>

      {/* Key Metrics Grid - MAIN FOCUS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-secondary rounded-xl p-4 border-l-4 border-primary-mid">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">GMP</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${isPositiveGMP ? 'text-emerald-mid' : 'text-destructive'}`}>
            {isPositiveGMP ? '+' : ''}Rs {Math.abs(ipo.gmp).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">{isPositiveGMP ? '+' : ''}{ipo.gmpPercent}% premium</p>
          <div className="flex items-center gap-1 text-[8px] text-ink4 mt-1.5">
            <Clock className="w-2.5 h-2.5" />
            {formatTimeAgo(ipo.gmpLastUpdated)}
          </div>
        </div>
        
        <div className="bg-secondary rounded-xl p-4 border-l-4 border-cobalt-mid">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Est. Listing Price</p>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            Rs {estimatedListingPrice.toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">Issue + GMP</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4 border-l-4 border-emerald-mid">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Expected Profit/Lot</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${expectedProfit > 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            {expectedProfit > 0 ? '+' : ''}Rs {Math.abs(expectedProfit).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">{expectedProfit > 0 ? '+' : ''}{expectedProfitPercent}% for {ipo.lotSize} shares</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4 border-l-4 border-gold-mid">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Subscription</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${
            ipo.subscription.total > 1 ? 'text-emerald-mid' : ipo.subscription.total > 0 ? 'text-gold-mid' : 'text-ink4'
          }`}>
            {ipo.subscription.total > 0 ? `${ipo.subscription.total}x` : '-'}
          </p>
          <p className="text-[11px] text-ink3 mt-1">
            {ipo.subscription.isFinal ? 'Final' : ipo.subscription.day > 0 ? `Day ${ipo.subscription.day} - Live` : 'Not open'}
          </p>
        </div>
      </div>

      {/* Key Dates Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5 p-4 bg-secondary rounded-xl">
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

      {/* Quick Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <button 
          onClick={() => scrollToSection('gmp-section')}
          className="py-2 px-4 rounded-lg text-[12px] font-bold bg-secondary text-ink2 border border-border transition-colors hover:bg-border"
        >
          GMP Graph
        </button>
        <button 
          onClick={() => scrollToSection('subscription-section')}
          className="py-2 px-4 rounded-lg text-[12px] font-bold bg-secondary text-ink2 border border-border transition-colors hover:bg-border"
        >
          Subscription Graph
        </button>
        <button className="px-6 py-2 rounded-lg text-[12px] font-semibold bg-secondary text-ink2 border border-border transition-colors hover:bg-border ml-auto">
          Check Allotment
        </button>
      </div>
    </div>
  );
}
