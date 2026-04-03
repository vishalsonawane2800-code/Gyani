import type { IPO } from '@/lib/data';
import { formatDateRange, formatPrice } from '@/lib/data';

interface IPOHeroProps {
  ipo: IPO;
}

export function IPOHero({ ipo }: IPOHeroProps) {
  const getStatusBadge = () => {
    switch (ipo.status) {
      case 'lastday': return { label: 'Live - Day 3', className: 'bg-gold-bg text-gold border-gold/20' };
      case 'upcoming': return { label: 'Opening Soon', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      case 'allot': return { label: 'Allotment Today', className: 'bg-primary-bg text-primary border-primary/20' };
      case 'listing': return { label: 'Listing Today', className: 'bg-emerald-bg text-emerald border-emerald/20' };
      case 'open': return { label: 'Live - Open', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      default: return { label: ipo.status, className: 'bg-muted text-muted-foreground' };
    }
  };

  const statusBadge = getStatusBadge();
  const isPositiveGMP = ipo.gmp > 0;
  const minInvestment = ipo.priceMax * ipo.lotSize;

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

        {/* Price Block */}
        <div className="text-right shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Price Band</p>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            {ipo.priceMax >= 100000 ? formatPrice(ipo.priceMax) : `Rs ${ipo.priceMin} - ${ipo.priceMax}`}
          </p>
          <p className="text-[11px] text-ink3 mt-1">Cut-off: Rs {ipo.priceMax.toLocaleString()} per share</p>
          <p className="text-[11px] text-ink4 mt-0.5">
            Lot: {ipo.lotSize.toLocaleString()} - Min Rs {minInvestment >= 100000 ? `${(minInvestment / 100000).toFixed(2)}L` : minInvestment.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">GMP Today</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${isPositiveGMP ? 'text-emerald-mid' : 'text-destructive'}`}>
            {isPositiveGMP ? '+' : ''}Rs {Math.abs(ipo.gmp).toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">{isPositiveGMP ? '+' : ''}{ipo.gmpPercent}% premium</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Est. Listing Price</p>
          <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold">
            Rs {ipo.estListPrice >= 100000 ? `${(ipo.estListPrice / 100000).toFixed(2)}L` : ipo.estListPrice.toLocaleString()}
          </p>
          <p className="text-[11px] text-ink3 mt-1">GMP + issue price</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
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
        
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Market Sentiment</p>
          <p className={`font-[family-name:var(--font-sora)] text-2xl font-extrabold ${
            ipo.sentimentScore >= 70 ? 'text-emerald-mid' : ipo.sentimentScore >= 50 ? 'text-gold-mid' : 'text-destructive'
          }`}>
            {ipo.sentimentScore}
            <span className="text-[13px] text-ink4 font-normal">/100</span>
          </p>
          <p className="text-[11px] text-ink3 mt-1">{ipo.sentimentLabel}</p>
        </div>
      </div>
    </div>
  );
}
