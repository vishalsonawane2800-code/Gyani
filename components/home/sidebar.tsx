'use client';

import Link from 'next/link';
import { ExternalLink, Brain, TrendingUp, Calendar, Clock } from 'lucide-react';

// Generate abbreviation from company name
function generateAbbr(name: string | undefined | null): string {
  if (!name) return 'IP';
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';
}

interface IPO {
  id: string;
  name?: string;
  company_name?: string;
  slug: string;
  status: string;
  exchange?: string;
  open_date?: string;
  close_date?: string;
  latest_gmp?: number;
  gmp?: number;
  gmp_percent?: number;
  ai_prediction?: number;
  aiPrediction?: number;
  bgColor?: string;
  fgColor?: string;
  sector?: string;
}

interface SidebarProps {
  ipos?: IPO[];
}

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: 'text-cobalt', bg: 'bg-cobalt-bg' },
  lastday: { label: 'Last Day', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  allot: { label: 'Allotment', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
  listing: { label: 'Listing', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  upcoming: { label: 'Upcoming', color: 'text-ink3', bg: 'bg-secondary' },
  closed: { label: 'Closed', color: 'text-ink4', bg: 'bg-secondary' },
};

const activeStatuses = ['open', 'lastday', 'allot', 'listing', 'upcoming'];

export function Sidebar({ ipos = [] }: SidebarProps) {
  const displayIPOs = ipos
    .filter((ipo) => activeStatuses.includes(ipo.status))
    .slice(0, 5);

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">

      {/* IPO Pulse — replaces Upcoming Events */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/60">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            IPO Pulse
          </h3>
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>

        <div className="divide-y divide-border">
          {displayIPOs.length > 0 ? displayIPOs.map((ipo) => {
            const ipoName = ipo.name || ipo.company_name || 'Unknown IPO';
            const gmpVal = ipo.latest_gmp ?? ipo.gmp ?? 0;
            const gmpPct = ipo.gmp_percent ?? 0;
            const prediction = ipo.ai_prediction ?? ipo.aiPrediction ?? 0;
            const status = statusLabel[ipo.status] ?? statusLabel.closed;

            return (
              <Link
                key={ipo.id}
                href={`/ipo/${ipo.slug}`}
                className="flex items-center gap-3 px-3 py-3 hover:bg-secondary/50 transition-colors group"
              >
                {/* Avatar */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: ipo.bgColor ?? '#EEF2FF', color: ipo.fgColor ?? '#4338CA' }}
                >
                  {generateAbbr(ipoName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[12.5px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {ipoName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    {ipo.exchange && (
                      <span className="text-[9.5px] text-ink4">{ipo.exchange}</span>
                    )}
                  </div>
                </div>

                {/* GMP / Prediction */}
                <div className="text-right shrink-0">
                  <div className={`text-[12px] font-extrabold font-[family-name:var(--font-sora)] ${gmpVal >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {gmpVal >= 0 ? '+' : ''}&#8377;{gmpVal}
                  </div>
                  <div className={`text-[10px] font-semibold ${gmpPct >= 0 ? 'text-emerald-500' : 'text-red-400'}`}>
                    {gmpPct >= 0 ? '+' : ''}{gmpPct}%
                  </div>
                </div>
              </Link>
            );
          }) : (
            <div className="px-3 py-6 text-center text-[12px] text-ink4">
              No active IPOs right now
            </div>
          )}
        </div>

        <div className="px-3 py-2.5 border-t border-border bg-secondary/30">
          <Link
            href="/gmp"
            className="text-[11.5px] font-semibold text-primary hover:opacity-75 transition-opacity flex items-center justify-center gap-1"
          >
            View GMP Tracker
          </Link>
        </div>
      </div>

      {/* Upcoming Calendar */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/60">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Upcoming Events
          </h3>
        </div>
        <div className="p-3 space-y-2">
          {[
            { date: '12', month: 'APR', title: 'Emiac Technologies', desc: 'Allotment finalization', tag: 'Allotment', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/30' },
            { date: '14', month: 'APR', title: 'PropShare REIT', desc: 'Subscription closes', tag: 'Last Day', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
            { date: '16', month: 'APR', title: 'Powerica Limited', desc: 'Listing on BSE/NSE', tag: 'Listing', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
          ].map((ev, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 leading-tight ${ev.bg}`}>
                <span className={`text-[15px] font-black leading-none ${ev.color}`}>{ev.date}</span>
                <span className={`text-[8.5px] font-bold ${ev.color}`}>{ev.month}</span>
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <p className="text-[12px] font-semibold text-foreground truncate">{ev.title}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-2.5 h-2.5 text-ink4" />
                  <p className="text-[10.5px] text-ink4">{ev.desc}</p>
                </div>
              </div>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-1 ${ev.bg} ${ev.color}`}>
                {ev.tag}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Accuracy Quick */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/60">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Accuracy
          </h3>
          <Link href="/accuracy" className="text-[11.5px] font-semibold text-primary">
            Full Dashboard
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <div className="font-[family-name:var(--font-sora)] text-lg font-black text-emerald">95%</div>
              <div className="text-[9px] text-ink3">Within 5%</div>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <div className="font-[family-name:var(--font-sora)] text-lg font-black text-emerald">2.1%</div>
              <div className="text-[9px] text-ink3">Avg Error</div>
            </div>
          </div>
          <Link
            href="/accuracy"
            className="block text-center text-[12px] font-semibold py-2 px-4 rounded-lg border border-primary text-primary hover:bg-primary-bg transition-colors"
          >
            View All Predictions
          </Link>
        </div>
      </div>

      {/* Apply via Broker */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary/60">
          <h3 className="text-[13px] font-bold">Apply via Broker</h3>
        </div>
        <div className="p-4">
          {['Zerodha', 'Groww', 'Upstox', 'Angel One'].map((broker, index, arr) => (
            <div
              key={broker}
              className={`flex items-center justify-between py-2 ${index !== arr.length - 1 ? 'border-b border-border' : ''}`}
            >
              <span className="text-[12.5px] font-medium">{broker}</span>
              <button className="text-[11.5px] font-bold px-3.5 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-1">
                Apply
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
