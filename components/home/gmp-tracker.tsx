'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw, Clock, Calendar } from 'lucide-react';
import { currentIPOs, type IPOStatus } from '@/lib/data';

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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// Only show active IPOs (not upcoming or closed)
const activeStatuses: IPOStatus[] = ['open', 'lastday', 'allot', 'listing'];

export function GMPTracker() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Filter current IPOs (active ones only)
  const activeIPOs = currentIPOs.filter(ipo => activeStatuses.includes(ipo.status));
  
  // Filter upcoming IPOs
  const upcomingIPOs = currentIPOs.filter(ipo => ipo.status === 'upcoming');
  const getExchangeBadge = (exchange: string) => {
    switch (exchange) {
      case 'Mainboard': return 'bg-cobalt-bg text-cobalt';
      case 'BSE SME': return 'bg-secondary text-ink3';
      case 'NSE SME': return 'bg-[#fff0f6] text-[#9d174d]';
      case 'REIT': return 'bg-gold-bg text-gold';
      default: return 'bg-secondary text-ink3';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return { label: 'Open', className: 'bg-cobalt-bg text-cobalt' };
      case 'lastday': return { label: 'Last Day', className: 'bg-gold-bg text-gold' };
      case 'allot': return { label: 'Allotment', className: 'bg-primary-bg text-primary' };
      case 'listing': return { label: 'Listing', className: 'bg-emerald-bg text-emerald' };
      case 'upcoming': return { label: 'Upcoming', className: 'bg-secondary text-ink3' };
      default: return { label: status, className: 'bg-secondary text-ink3' };
    }
  };

  // Find the most recent GMP update from active IPOs
  const latestUpdate = activeIPOs.reduce((latest, ipo) => {
    const ipoDate = new Date(ipo.gmpLastUpdated);
    return ipoDate > latest ? ipoDate : latest;
  }, new Date(0));

  return (
    <section id="gmp" className="mb-7 space-y-6">
      {/* Current IPOs GMP Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold">
              Live GMP Tracker
            </h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-bg text-emerald">
              {activeIPOs.length} Active
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-ink3">
              <Clock className="w-3 h-3" />
              <span>Updated: <strong className="text-foreground">{mounted ? formatTimeAgo(latestUpdate.toISOString()) : '--'}</strong></span>
            </div>
            <button className="text-[12.5px] font-semibold text-primary-mid flex items-center gap-1 hover:opacity-75 transition-opacity">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>

        {/* Active IPOs Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap min-w-[200px]">Company</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Exchange</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">GMP</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">GMP %</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Est. Price</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">AI Pred.</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Status</th>
                <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Updated</th>
              </tr>
            </thead>
            <tbody>
              {activeIPOs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 px-3 text-center text-ink3 text-[13px]">
                    No active IPOs at the moment. Check upcoming IPOs below.
                  </td>
                </tr>
              ) : (
                activeIPOs.map((ipo) => {
                  const isPositive = ipo.gmp > 0;
                  const isZero = ipo.gmp === 0;
                  const statusBadge = getStatusBadge(ipo.status);
                  return (
                    <tr key={ipo.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                          >
                            {ipo.abbr}
                          </div>
                          <div>
                            <Link href={`/ipo/${ipo.slug}`} className="font-bold text-primary-mid hover:underline">
                              {ipo.name}
                            </Link>
                            <div className="text-[10.5px] text-ink3">{ipo.sector}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-xl ${getExchangeBadge(ipo.exchange)}`}>
                          {ipo.exchange}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[13px] ${
                          isZero ? 'bg-secondary text-ink3' : isPositive ? 'bg-emerald-bg text-emerald-mid' : 'bg-destructive-bg text-destructive'
                        }`}>
                          {isZero ? 'Rs 0' : isPositive ? `+Rs ${ipo.gmp.toLocaleString()}` : `-Rs ${Math.abs(ipo.gmp).toLocaleString()}`}
                        </span>
                      </td>
                      <td className={`py-3 px-3 font-bold ${isZero ? 'text-ink3' : isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {isZero ? '0%' : isPositive ? `+${ipo.gmpPercent}%` : `${ipo.gmpPercent}%`}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        Rs {ipo.estListPrice >= 100000 ? `${(ipo.estListPrice / 100000).toFixed(2)}L` : ipo.estListPrice.toLocaleString()}
                      </td>
                      <td className={`py-3 px-3 font-bold ${ipo.aiPrediction > 0 ? 'text-emerald-mid' : ipo.aiPrediction < 0 ? 'text-destructive' : 'text-gold-mid'}`}>
                        {ipo.aiPrediction > 0 ? '+' : ''}{ipo.aiPrediction}%
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-xl ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[11px] text-ink3">
                        {mounted ? formatTimeAgo(ipo.gmpLastUpdated) : '--'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upcoming IPOs Section */}
      {upcomingIPOs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-ink3" />
              <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold">
                Upcoming IPOs
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary text-ink3">
                {upcomingIPOs.length} Scheduled
              </span>
            </div>
            <Link href="/upcoming" className="text-[12.5px] font-semibold text-primary-mid hover:opacity-75 transition-opacity">
              View All
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap min-w-[200px]">Company</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Exchange</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Price Band</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Issue Size</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Est. GMP</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2.5 px-3 whitespace-nowrap">Opens</th>
                </tr>
              </thead>
              <tbody>
                {upcomingIPOs.map((ipo) => {
                  const isPositive = ipo.gmp > 0;
                  const isZero = ipo.gmp === 0;
                  return (
                    <tr key={ipo.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                          >
                            {ipo.abbr}
                          </div>
                          <div>
                            <Link href={`/ipo/${ipo.slug}`} className="font-bold text-primary-mid hover:underline">
                              {ipo.name}
                            </Link>
                            <div className="text-[10.5px] text-ink3">{ipo.sector}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-xl ${getExchangeBadge(ipo.exchange)}`}>
                          {ipo.exchange}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        Rs {ipo.priceMin >= 100000 ? `${(ipo.priceMin / 100000).toFixed(1)}L` : ipo.priceMin.toLocaleString()} - {ipo.priceMax >= 100000 ? `${(ipo.priceMax / 100000).toFixed(1)}L` : ipo.priceMax.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-ink3">
                        {ipo.issueSize}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[12px] ${
                          isZero ? 'bg-secondary text-ink3' : isPositive ? 'bg-emerald-bg text-emerald-mid' : 'bg-destructive-bg text-destructive'
                        }`}>
                          {isZero ? 'TBD' : isPositive ? `+Rs ${ipo.gmp.toLocaleString()}` : `-Rs ${Math.abs(ipo.gmp).toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-[12px] font-semibold">
                        {mounted ? formatDate(ipo.openDate) : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
