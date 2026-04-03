'use client';

import Link from 'next/link';
import { RefreshCw, Clock } from 'lucide-react';
import { currentIPOs } from '@/lib/data';

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

export function GMPTracker() {
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

  // Find the most recent GMP update
  const latestUpdate = currentIPOs.reduce((latest, ipo) => {
    const ipoDate = new Date(ipo.gmpLastUpdated);
    return ipoDate > latest ? ipoDate : latest;
  }, new Date(0));

  return (
    <section id="gmp" className="mb-7">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold">
            Live GMP Tracker
          </h2>
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-[11px] text-ink3">
              <Clock className="w-3 h-3" />
              <span>Updated: <strong className="text-foreground">{formatTimeAgo(latestUpdate.toISOString())}</strong></span>
            </div>
            <button className="text-[12.5px] font-semibold text-primary-mid flex items-center gap-1 hover:opacity-75 transition-opacity">
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
        </div>

        {/* Table */}
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
              {currentIPOs.map((ipo) => {
                const isPositive = ipo.gmp > 0;
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
                        isPositive ? 'bg-emerald-bg text-emerald-mid' : 'bg-destructive-bg text-destructive'
                      }`}>
                        {isPositive ? '+' : ''}Rs {Math.abs(ipo.gmp).toLocaleString()}
                      </span>
                    </td>
                    <td className={`py-3 px-3 font-bold ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                      {isPositive ? '+' : ''}{ipo.gmpPercent}%
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
                      {formatTimeAgo(ipo.gmpLastUpdated)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
