'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { currentIPOs } from '@/lib/data';

export function ListedIPOs() {
  // Get only closed IPOs and take the most recent 6
  const closedIPOs = currentIPOs
    .filter(ipo => ipo.status === 'closed')
    .sort((a, b) => new Date(b.listDate).getTime() - new Date(a.listDate).getTime())
    .slice(0, 6);

  if (closedIPOs.length === 0) {
    return null;
  }

  return (
    <section className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-[family-name:var(--font-sora)] text-[17px] font-bold">
            Recently Listed IPOs
          </h2>
          <span className="text-[10.5px] font-extrabold py-0.5 px-2.5 rounded-full bg-primary-bg text-primary">
            {closedIPOs.length} Recent
          </span>
        </div>
        <Link 
          href="/listed" 
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-primary hover:opacity-75 transition-opacity"
        >
          View All
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Listed IPOs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="text-left text-[11px] font-semibold text-ink3 py-3 px-4 sticky left-0 bg-secondary/50 z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO Name</th>
                <th className="text-center text-[11px] font-semibold text-ink3 py-3 px-4">List Date</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">Issue Price</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">List Price</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">Listing Gain</th>
                <th className="text-center text-[11px] font-semibold text-ink3 py-3 px-4">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {closedIPOs.map((ipo, idx) => {
                const listingGain = ipo.estListPrice - ipo.priceMax;
                const listingGainPercent = ((listingGain / ipo.priceMax) * 100).toFixed(1);
                const isPositive = listingGain > 0;
                const isNegative = listingGain < 0;
                
                return (
                  <tr 
                    key={ipo.id} 
                    className={`hover:bg-secondary/30 transition-colors group/row ${
                      idx !== closedIPOs.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-card group-hover/row:bg-secondary/30 z-10 min-w-[180px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                      <Link href={`/ipo/${ipo.slug}`} className="flex items-center gap-2.5 group">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                        >
                          {ipo.abbr}
                        </div>
                        <div>
                          <p className="font-medium text-[13px] text-ink group-hover:text-primary transition-colors line-clamp-1">
                            {ipo.name}
                          </p>
                          <p className="text-[10px] text-ink4">{ipo.exchange}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-[12px] text-ink3">
                        {new Date(ipo.listDate).toLocaleDateString('en-IN', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[13px] font-medium text-ink">
                        Rs {ipo.priceMax}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[13px] font-medium text-ink">
                        Rs {ipo.estListPrice}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[12px] font-semibold ${
                        isPositive ? 'bg-emerald-bg text-emerald' :
                        isNegative ? 'bg-destructive-bg text-destructive' :
                        'bg-secondary text-ink3'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : 
                         isNegative ? <TrendingDown className="w-3 h-3" /> : 
                         <Minus className="w-3 h-3" />}
                        {isPositive ? '+' : ''}{listingGainPercent}%
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-[12px] font-medium text-ink">
                        {ipo.subscription.total}x
                      </span>
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
