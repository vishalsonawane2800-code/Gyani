'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Star, Clock, ClipboardCheck, Sparkles } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDateRange, formatPrice } from '@/lib/data';

interface IPOCardProps {
  ipo: IPO;
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  // Older than a day: show the actual update date so "1d ago" / "5d ago"
  // isn't ambiguous.
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatFullTimestamp(dateString: string): string {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDateShort(dateString: string | undefined | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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
    const allotDate = formatDateShort(ipo.allotmentDate);
    const listDate = formatDateShort(ipo.listDate);
    switch (ipo.status) {
      case 'open':
        return { label: 'Open', className: 'bg-cobalt-bg text-cobalt border-cobalt/20' };
      case 'lastday':
        return { label: 'Last Day', className: 'bg-gold-bg text-gold border-gold/20' };
      case 'closed':
        // Bidding done, waiting for allotment - surface the allotment date
        // instead of a generic "closed" label.
        return {
          label: allotDate ? `Allotment on ${allotDate}` : 'Awaiting Allotment',
          className: 'bg-primary-bg text-primary border-primary/30',
        };
      case 'allot':
        // Allotment is out / happening today, now waiting for listing - show
        // the listing date.
        return {
          label: listDate ? `Listing on ${listDate}` : 'Awaiting Listing',
          className: 'bg-primary-bg text-primary border-primary/30',
        };
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
        {ipo.logoUrl ? (
          // Use admin-provided logo when available. The small letter-mark
          // fallback is kept below for IPOs without a logo so the card never
          // looks half-empty.
          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-card border border-border flex items-center justify-center">
            <Image
              src={ipo.logoUrl}
              alt={`${ipo.name} logo`}
              width={40}
              height={40}
              className="object-contain w-full h-full"
              unoptimized
            />
          </div>
        ) : (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
          >
            {abbr}
          </div>
        )}
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
            {/* Once bidding is over (status closed/allot/listing) the
                subscription numbers are final - don't keep showing a
                stale "Updated X ago" label. */}
            {ipo.status === 'closed' || ipo.status === 'allot' || ipo.status === 'listing'
              ? 'Final'
              : ipo.subscriptionLastScraped
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
        <div
          className="flex items-center gap-1 text-xs text-ink4 ml-auto"
          title={formatFullTimestamp(ipo.gmpLastUpdated)}
        >
          <Clock className="w-4 h-4" />
          <span>{timeAgo || 'just now'}</span>
        </div>
      </div>

      {/* AI Predicted Listing Gain + rupee equivalent.
          `aiPrediction` is stored as a percentage (e.g. 5.2 = +5.2%). We
          derive the absolute rupee value on issue price so investors can
          see both the % pop and the per-share gain at a glance. */}
      {typeof ipo.aiPrediction === 'number' && ipo.priceMax > 0 && (() => {
        const predPct = ipo.aiPrediction;
        const predRupees = (ipo.priceMax * predPct) / 100;
        const isPosPred = predPct > 0;
        const isZeroPred = predPct === 0;
        const rupeeAbs = Math.abs(predRupees);
        const rupeeLabel =
          rupeeAbs >= 1
            ? `Rs ${rupeeAbs.toFixed(0)}`
            : `Rs ${rupeeAbs.toFixed(2)}`;
        return (
          <div className="flex items-center gap-2 py-2 px-3 bg-secondary rounded-lg mb-2 text-sm">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="text-xs font-extrabold text-ink4 tracking-wide shrink-0">
              AI Gain
            </span>
            <span
              className={`font-extrabold text-base ${
                isZeroPred
                  ? 'text-ink3'
                  : isPosPred
                  ? 'text-emerald-mid'
                  : 'text-destructive'
              }`}
            >
              {isZeroPred ? '0%' : isPosPred ? `+${predPct.toFixed(1)}%` : `${predPct.toFixed(1)}%`}
            </span>
            <span
              className={`text-xs font-bold px-2 py-1 rounded-lg ${
                isZeroPred
                  ? 'bg-secondary text-ink3 border border-border'
                  : isPosPred
                  ? 'bg-emerald-bg text-emerald'
                  : 'bg-destructive-bg text-destructive'
              }`}
            >
              {isZeroPred ? 'Rs 0' : isPosPred ? `+${rupeeLabel}` : `-${rupeeLabel}`}
            </span>
            <span className="text-[10px] text-ink4 ml-auto">per share</span>
          </div>
        );
      })()}

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

      {/* Action row. On allotment day we surface a secondary "Check
          Allotment" button so users can jump straight to the registrar
          portal without scrolling into the detail page. Falls back to
          the generic allotment-status hub if no registrar URL is set. */}
      <div className="flex gap-2">
        <span className="flex-1 text-center py-2 rounded-lg text-sm font-bold bg-primary text-white cursor-pointer transition-opacity hover:opacity-90">
          View Analysis
        </span>
        {ipo.status === 'allot' && (
          // The outer element is already an <a> (Next.js Link) so we can't
          // nest a second anchor here. Using a <button> + manual navigation
          // keeps the DOM valid while still opening the registrar portal
          // in a new tab when available.
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const target = ipo.allotmentUrl || '/allotment-status';
              if (ipo.allotmentUrl) {
                window.open(target, '_blank', 'noopener,noreferrer');
              } else {
                window.location.href = target;
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold bg-primary-bg text-primary border border-primary/30 hover:bg-primary/10 transition-colors whitespace-nowrap"
            aria-label={`Check allotment status for ${ipo.name}`}
          >
            <ClipboardCheck className="w-4 h-4" />
            Check Allotment
          </button>
        )}
      </div>
    </Link>
  );
}
