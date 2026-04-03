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

export function IPOCard({ ipo }: IPOCardProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  
  useEffect(() => {
    setTimeAgo(formatTimeAgo(ipo.gmpLastUpdated));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(ipo.gmpLastUpdated));
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [ipo.gmpLastUpdated]);
  const isPositiveGMP = ipo.gmp > 0;
  const isPositivePrediction = ipo.aiPrediction > 0;

  const getStatusBadge = () => {
    switch (ipo.status) {
      case 'open':
        return { label: 'Open', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      case 'lastday':
        return { label: 'Last Day', className: 'bg-gold-bg text-gold border-gold/20' };
      case 'allot':
        return { label: 'Allotment Day', className: 'bg-primary-bg text-primary border-primary/20' };
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
          className="w-10 h-10 rounded-[10px] flex items-center justify-center font-[family-name:var(--font-sora)] font-black text-[13px] shrink-0"
          style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
        >
          {ipo.abbr}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-[13.5px] truncate">{ipo.name}</h3>
          <p className="text-[11px] text-ink3 mt-0.5">
            {formatDateRange(ipo.openDate, ipo.closeDate)}
          </p>
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-xl border ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-xl ${getExchangeBadge()}`}>
              {ipo.exchange}
            </span>
            <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-xl bg-gradient-to-r from-primary to-cobalt text-white">
              AI
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-1.5 mb-2.5">
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-[9.5px] text-ink4 font-semibold mb-0.5">Price Band</p>
          <p className="text-[13.5px] font-bold font-[family-name:var(--font-sora)]">
            {ipo.priceMax >= 100000 ? formatPrice(ipo.priceMax) : `Rs ${ipo.priceMin}-${ipo.priceMax}`}
          </p>
          <p className="text-[9.5px] text-ink4">Lot: {ipo.lotSize.toLocaleString()}</p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-[9.5px] text-ink4 font-semibold mb-0.5">Subscription</p>
          <p className={`text-[13.5px] font-bold font-[family-name:var(--font-sora)] ${
            ipo.subscription.total > 1 ? 'text-emerald-mid' : ipo.subscription.total > 0 ? 'text-gold-mid' : 'text-ink4'
          }`}>
            {ipo.subscription.total > 0 ? `${ipo.subscription.total}x` : '-'}
          </p>
          <p className="text-[9.5px] text-ink4">
            {ipo.subscription.isFinal ? 'Final' : ipo.subscription.day > 0 ? `Day ${ipo.subscription.day}` : 'Not open'}
          </p>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <p className="text-[9.5px] text-ink4 font-semibold mb-0.5">Issue Size</p>
          <p className="text-[13.5px] font-bold font-[family-name:var(--font-sora)]">
            Rs {ipo.issueSize}
          </p>
          <p className="text-[9.5px] text-ink4">{ipo.exchange === 'REIT' ? 'REIT' : ipo.ofs === 'Nil' ? 'Fresh' : 'OFS'}</p>
        </div>
      </div>

      {/* GMP Row */}
      <div className="flex items-center gap-2 py-2 px-2.5 bg-secondary rounded-lg mb-2 text-[12.5px]">
        <span className="text-[9.5px] font-extrabold text-ink4 tracking-wide">GMP</span>
        <span className={`font-extrabold font-[family-name:var(--font-sora)] text-sm ${isPositiveGMP ? 'text-emerald-mid' : 'text-destructive'}`}>
          {isPositiveGMP ? '+' : ''}Rs {Math.abs(ipo.gmp).toLocaleString()}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${
          isPositiveGMP ? 'bg-emerald-bg text-emerald' : 'bg-destructive-bg text-destructive'
        }`}>
          {isPositiveGMP ? '+' : ''}{ipo.gmpPercent}%
        </span>
        <div className="flex items-center gap-1 text-[10px] text-ink4 ml-auto">
          <Clock className="w-3 h-3" />
          <span>{timeAgo || 'just now'}</span>
        </div>
      </div>

      {/* AI Prediction Row */}
      <div className="flex items-center gap-2 py-2 px-2.5 border border-border rounded-lg mb-2.5 text-[12px]">
        <Star className="w-3 h-3 text-primary-mid" fill="currentColor" />
        <span className="text-[10px] text-ink3 font-semibold shrink-0">AI Prediction</span>
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-primary to-cobalt rounded-full"
            style={{ width: `${ipo.aiConfidence}%` }}
          />
        </div>
        <span className="text-[10px] text-ink3 shrink-0">{ipo.aiConfidence}%</span>
        <span className={`font-extrabold font-[family-name:var(--font-sora)] text-sm shrink-0 ${
          isPositivePrediction ? 'text-emerald-mid' : 'text-destructive'
        }`}>
          {isPositivePrediction ? '+' : ''}{ipo.aiPrediction}%
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <span className="flex-1 text-center py-1.5 rounded-lg text-[12px] font-semibold bg-secondary text-ink2 cursor-pointer transition-colors hover:bg-border">
          View Details
        </span>
        <span className="flex-1 text-center py-1.5 rounded-lg text-[12px] font-bold bg-gradient-to-br from-primary to-cobalt text-white cursor-pointer transition-opacity hover:opacity-90">
          View Analysis
        </span>
      </div>
    </Link>
  );
}
