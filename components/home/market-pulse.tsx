'use client';

import { TrendingUp, TrendingDown, Activity, BarChart2, Zap, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface IndexData {
  name: string;
  value: string;
  change: string;
  changePercent: string;
  up: boolean;
}

const indices: IndexData[] = [
  { name: 'SENSEX', value: '76,992', change: '+312.40', changePercent: '+0.41%', up: true },
  { name: 'NIFTY 50', value: '23,328', change: '+96.10', changePercent: '+0.41%', up: true },
  { name: 'NIFTY SME IPO', value: '68,140', change: '-124.50', changePercent: '-0.18%', up: false },
  { name: 'BSE IPO', value: '11,248', change: '+42.20', changePercent: '+0.38%', up: true },
];

const signals = [
  { label: 'Subscriptions', value: '12 Active', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  { label: 'Avg GMP', value: '+8.4%', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { label: 'IPO Mood', value: 'Cautious', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  { label: 'Retail Apps', value: '↓ 40%', icon: BarChart2, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
];

export function MarketPulse() {
  return (
    <div className="mb-7 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-wider text-ink3 uppercase">
            Market Pulse
          </span>
        </div>
        <span className="text-[10px] text-ink4 font-medium">Live · BSE/NSE</span>
      </div>

      <div className="p-4">
        {/* Index Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {indices.map((idx) => (
            <div
              key={idx.name}
              className="bg-secondary/60 rounded-xl px-3 py-2.5 flex flex-col gap-0.5"
            >
              <span className="text-[9.5px] font-bold text-ink4 uppercase tracking-wide">{idx.name}</span>
              <span className="font-[family-name:var(--font-sora)] text-[15px] font-black text-foreground leading-tight">
                {idx.value}
              </span>
              <div className={`flex items-center gap-0.5 text-[10.5px] font-bold ${idx.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {idx.up ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {idx.change} ({idx.changePercent})
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-border mb-4" />

        {/* IPO Market Signals */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10.5px] font-extrabold text-ink3 uppercase tracking-wider">IPO Market Signals</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {signals.map((sig) => (
            <div key={sig.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${sig.bg}`}>
              <sig.icon className={`w-4 h-4 shrink-0 ${sig.color}`} />
              <div className="min-w-0">
                <div className={`font-[family-name:var(--font-sora)] text-[13px] font-black ${sig.color} leading-tight`}>
                  {sig.value}
                </div>
                <div className="text-[9px] text-ink4 font-semibold leading-tight mt-0.5">{sig.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Commentary strip */}
        <div className="mt-3 flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
          <span className="text-[9.5px] font-extrabold text-primary uppercase tracking-wider shrink-0 mt-0.5">
            IPOGyani AI
          </span>
          <p className="text-[10.5px] text-ink3 leading-relaxed">
            FY26 IPO returns disappoint — investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution before applying.
          </p>
        </div>
      </div>
    </div>
  );
}
