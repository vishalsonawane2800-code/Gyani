'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Star, Clock } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDateRange, formatPrice } from '@/lib/data';

interface IPOCardProps {
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

export function IPOCard({ ipo }: IPOCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const abbr = generateAbbr(ipo.name);
  
  useEffect(() => {
    setTimeAgo(formatTimeAgo(ipo.gmpLastUpdated));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(ipo.gmpLastUpdated));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [ipo.gmpLastUpdated]);
  const isPositiveGMP = ipo.gmp > 0;
  const isZeroGMP = ipo.gmp === 0;

  const getStatusBadge = () => {
    switch (ipo.status) {
      case 'open':
        return { label: 'Open', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      case 'lastday':
        return { label: 'Last Day', className: 'bg-gold-bg text-gold border-gold/20' };
      case 'allot':
        return { label: 'Allotment Day', className: 'bg-primary-bg text-primary border-primary/30' };
      case 'listing':
        return { label: 'Listing Day', className: 'bg-emerald-bg text-emerald border-emerald/20' };
      case 'upcoming':
        return { label: 'Upcoming', className: 'bg-secondary text-ink3 border-border' };
      default:
        return { label: ipo.status, className: 'bg-muted text-muted-foreground' };
    }
  };

  const getExchangeBadge = () => {
    switch (ipo.exchange) {
      case 'Mainboard':
        return 'bg-cobalt-bg text-cobalt';
      case 'BSE SME':
      case 'NSE SME':
        return 'bg-muted text-ink3';
      case 'REIT':
        return 'bg-gold-bg text-gold';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <Link
      href={`/ipo/${ipo.slug}`}
      className="block bg-card border border-border rounded-2xl p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-border-secondary"
    >
      {/* Header */}
      <div className="flex gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
          style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
        >
          {abbr}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-sm sm:text-base truncate">{ipo.name}</h3>
          <p className="text-xs text-ink3 mt-0.5">
            {formatDateRange(ipo.openDate, ipo.closeDate)}
          </p>
          <div className="flex gap-2 flex-wrap mt-2">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getExchangeBadge()}`}>
              {ipo.exchange}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-xs text-ink4 font-semibold mb-1">Price Band</p>
          <p className="text-sm font-bold">
            {ipo.priceMax >= 100000 ? formatPrice(ipo.priceMax) : `Rs ${ipo.priceMin}-${ipo.priceMax}`}
          </p>
          <p className="text-xs text-ink4">Lot: {ipo.lotSize.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-xs text-ink4 font-semibold mb-1">Subscription</p>
          <p className={`text-sm font-bold ${
            ipo.subscription.total > 1 ? 'text-emerald-mid' : ipo.subscription.total > 0 ? 'text-gold-mid' : 'text-ink4'
          }`}>
            {ipo.subscription.total > 0 ? `${ipo.subscription.total}x` : '-'}
          </p>
          <p className="text-xs text-ink4">
            {ipo.subscriptionLastScraped
              ? `Updated ${formatTimeAgo(ipo.subscriptionLastScraped)}`
              : ipo.subscription.isFinal
              ? 'Final'
              : ipo.subscription.day > 0
              ? `Day ${ipo.subscription.day}`
              : 'Not open'}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-xs text-ink4 font-semibold mb-1">Issue Size</p>
          <p className="text-sm font-bold">
            Rs {ipo.issueSize}
          </p>
          <p className="text-xs text-ink4">{ipo.exchange === 'REIT' ? 'REIT' : ipo.ofs === 'Nil' ? 'Fresh' : 'OFS'}</p>
        </div>
      </div>

      {/* GMP Row */}
      <div className="flex items-center gap-2 py-2 px-3 bg-secondary rounded-lg mb-2 text-sm">
        <span className="text-xs font-extrabold text-ink4 tracking-wide">GMP</span>
        <span className={`font-extrabold text-base ${
          isZeroGMP ? 'text-ink3' : isPositiveGMP ? 'text-emerald-mid' : 'text-destructive'
        }`}>
          {isZeroGMP ? 'Rs 0' : isPositiveGMP ? `+Rs ${ipo.gmp.toLocaleString()}` : `-Rs ${Math.abs(ipo.gmp).toLocaleString()}`}
        </span>
        <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
          isZeroGMP ? 'bg-secondary text-ink3 border border-border' : isPositiveGMP ? 'bg-emerald-bg text-emerald' : 'bg-destructive-bg text-destructive'
        }`}>
          {isZeroGMP ? '0%' : isPositiveGMP ? `+${ipo.gmpPercent}%` : `${ipo.gmpPercent}%`}
        </span>
        <div className="flex items-center gap-1 text-xs text-ink4 ml-auto">
          <Clock className="w-4 h-4" />
          <span>{timeAgo || 'just now'}</span>
        </div>
      </div>

      {/* Market Sentiment Score */}
      <div className="flex items-center gap-2 py-2 px-3 border border-primary/20 bg-primary-bg/50 rounded-lg mb-3 text-sm">
        <Star className="w-4 h-4 text-primary" fill="currentColor" />
        <span className="text-xs text-ink3 font-semibold shrink-0">Market Sentiment</span>
        <div className="flex-1 h-2 bg-primary/20 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary"
            style={{ width: `${ipo.aiConfidence}%` }}
          />
        </div>
        <span className="font-extrabold text-base shrink-0 text-primary">
          {ipo.aiConfidence}/100
        </span>
      </div>

      {/* Action */}
      <div className="flex">
        <span className="flex-1 text-center py-2 rounded-lg text-sm font-bold bg-primary text-white cursor-pointer transition-opacity hover:opacity-90">
          View Analysis
        </span>
      </div>
    </Link>
  );
}
