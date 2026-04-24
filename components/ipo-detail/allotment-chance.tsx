'use client';

import { useEffect, useState } from 'react';
import type { IPO } from '@/lib/data';
import { Users, TrendingUp } from 'lucide-react';

interface AllotmentData {
  retailSubscription: number;
  allotmentChance: number;
}

interface AllotmentChanceProps {
  ipo: IPO;
}

export function AllotmentChance({ ipo }: AllotmentChanceProps) {
  const [allotmentData, setAllotmentData] = useState<AllotmentData | null>(null);

  useEffect(() => {
    // Calculate allotment chance from subscription data
    const calculateAllotment = () => {
      let retailSub = 0;

      // Try to get retail subscription from latest subscription_live data
      if (ipo.subscription?.retail) {
        const retailStr = String(ipo.subscription.retail).toLowerCase();
        const num = parseFloat(retailStr.replace(/x/g, '').trim());
        if (Number.isFinite(num) && num > 0) {
          retailSub = num;
        }
      }

      if (retailSub === 0) {
        setAllotmentData(null);
        return;
      }

      // Calculate allotment chance: 100 / retail subscription, capped at 100%
      const allotmentChance = Math.min(100 / retailSub, 100);

      setAllotmentData({
        retailSubscription: retailSub,
        allotmentChance: Math.round(allotmentChance * 100) / 100,
      });
    };

    calculateAllotment();
  }, [ipo.subscription?.retail]);

  if (!allotmentData) return null;

  // Color coding based on allotment chance
  const getColor = (chance: number) => {
    if (chance >= 50) return { bg: 'bg-emerald-bg', border: 'border-emerald/20', text: 'text-emerald', label: 'High' };
    if (chance >= 20) return { bg: 'bg-gold-bg', border: 'border-gold/20', text: 'text-gold', label: 'Moderate' };
    return { bg: 'bg-red-bg', border: 'border-red/20', text: 'text-red', label: 'Low' };
  };

  const colorConfig = getColor(allotmentData.allotmentChance);

  return (
    <section className={`${colorConfig.bg} border ${colorConfig.border} rounded-2xl p-5 md:p-6`}>
      <div className="flex items-start gap-3 md:gap-4">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg ${colorConfig.bg} border ${colorConfig.border} flex items-center justify-center flex-shrink-0`}>
          <Users className={`w-5 h-5 md:w-6 md:h-6 ${colorConfig.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-ink mb-3 text-sm md:text-base">
            IPO Allotment Chance (Retail Category)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs md:text-sm text-ink3 mb-1">Retail Subscription</p>
              <p className={`text-xl md:text-2xl font-bold ${colorConfig.text}`}>
                {allotmentData.retailSubscription.toFixed(2)}x
              </p>
            </div>
            <div>
              <p className="text-xs md:text-sm text-ink3 mb-1">Allotment Chance</p>
              <p className={`text-xl md:text-2xl font-bold ${colorConfig.text}`}>
                {allotmentData.allotmentChance.toFixed(2)}%
              </p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs md:text-sm text-ink3 mb-1">Probability</p>
              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${colorConfig.bg} border ${colorConfig.border} ${colorConfig.text}`}>
                {colorConfig.label}
              </span>
            </div>
          </div>
          <p className="text-xs md:text-sm text-ink2 mt-3 leading-relaxed">
            The allotment chance is calculated as <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-[0.85em] font-mono">100 ÷ retail subscription</code>, capped at 100%. Lower subscription = higher allotment odds for retail investors.
          </p>
        </div>
      </div>
    </section>
  );
}
