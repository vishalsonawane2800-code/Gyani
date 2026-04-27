'use client';

import Link from 'next/link';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ListedIPO } from '@/lib/data';
import { useState, useEffect } from 'react';

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

interface ListedIPOsProps {
  listedIpos: ListedIPO[];
}

type TabType = 'all' | 'mainboard' | 'sme';

export function ListedIPOs({ listedIpos }: ListedIPOsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [filteredIPOs, setFilteredIPOs] = useState<ListedIPO[]>([]);

  // Take the most recent 6 listed IPOs based on active tab
  const recentListedIPOs = filteredIPOs
    .sort((a, b) => new Date(b.listDate).getTime() - new Date(a.listDate).getTime())
    .slice(0, 6);

  useEffect(() => {
    let filtered = listedIpos;

    if (activeTab === 'mainboard') {
      filtered = listedIpos.filter(
        (ipo) => ipo.exchange !== 'BSE SME' && ipo.exchange !== 'NSE SME'
      );
    } else if (activeTab === 'sme') {
      filtered = listedIpos.filter(
        (ipo) => ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME'
      );
    }

    setFilteredIPOs(filtered);
  }, [activeTab, listedIpos]);

  return (
    <section className="mb-7">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="font-[family-name:var(--font-sora)] text-[17px] font-bold">
              Recently Listed IPOs
            </h2>
            <span className="text-[10.5px] font-extrabold py-0.5 px-2.5 rounded-full bg-primary-bg text-primary">
              {recentListedIPOs.length} Recent
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

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {[
            { id: 'all' as TabType, label: 'All IPOs' },
            { id: 'mainboard' as TabType, label: 'Mainboard' },
            { id: 'sme' as TabType, label: 'SME IPOs' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-ink3 border-transparent hover:text-ink2'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {recentListedIPOs.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <p className="text-ink3 text-sm">
            {activeTab === 'sme' ? 'No SME IPOs listed yet.' : 'No recent listed IPOs available.'}
          </p>
        </div>
      )}

      {/* Listed IPOs Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-secondary/50 border-b border-border">
                <th className="text-left text-[11px] font-semibold text-ink3 py-3 px-4">IPO Name</th>
                <th className="text-center text-[11px] font-semibold text-ink3 py-3 px-4">List Date</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">Issue Price</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">List Price</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">Listing Gain</th>
                <th className="text-right text-[11px] font-semibold text-ink3 py-3 px-4">AI Prediction</th>
                <th className="text-center text-[11px] font-semibold text-ink3 py-3 px-4">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {recentListedIPOs.map((ipo, idx) => {
                const isPositive = ipo.gainPct > 0;
                const isNegative = ipo.gainPct < 0;
                // Listed IPO detail pages live at /listed/[year]/[slug].
                // Prefer the record's own year; otherwise derive from listDate.
                const listedYear =
                  ipo.year ||
                  (ipo.listDate
                    ? new Date(ipo.listDate).getFullYear().toString()
                    : new Date().getFullYear().toString());
                const detailHref = `/listed/${listedYear}/${ipo.slug}`;

                return (
                  <tr 
                    key={ipo.id} 
                    className={`hover:bg-secondary/30 transition-colors ${
                      idx !== recentListedIPOs.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <td className="py-3 px-4 min-w-[200px]">
                      <Link href={detailHref} className="flex items-center gap-2.5 group">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                          style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                        >
                          {generateAbbr(ipo.name)}
                        </div>
                        <div className="min-w-0">
                          {/* No line-clamp on mobile so full IPO names never get cut to
                              something like "Om po...". Wraps to a second line if needed. */}
                          <p className="font-medium text-[13px] text-ink group-hover:text-primary transition-colors break-words">
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
                        Rs {ipo.issuePrice}
                      </span>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[13px] font-medium text-ink">
                        Rs {ipo.listPrice}
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
                        {isPositive ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="text-right py-3 px-4">
                      <span className="text-[12px] font-medium text-ink">
                        {ipo.aiPred !== '-' ? `${ipo.aiPred}%` : '-'}
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-[12px] font-medium text-ink">
                        {ipo.subTimes}x
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
