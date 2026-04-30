'use client';

import Link from 'next/link';
import { ExternalLink, Brain } from 'lucide-react';
import { useEffect, useState } from 'react';

// Public IPO application pages for major Indian brokers. Links open the
// broker's IPO dashboard; users must be logged in to apply.
const BROKERS: { name: string; url: string }[] = [
  { name: 'Zerodha', url: 'https://kite.zerodha.com/#oms/ipo' },
  { name: 'Groww', url: 'https://groww.in/ipo' },
  { name: 'Upstox', url: 'https://upstox.com/ipo/' },
  { name: 'Angel One', url: 'https://www.angelone.in/ipo' },
];

export function Sidebar() {
  const [dashboardStats, setDashboardStats] = useState<{
    totalListed: number;
    mainboardListed: number;
    smeListed: number;
    avgError: string;
    withinRange: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/home/dashboard-stats');
        if (res.ok) {
          const data = await res.json();
          setDashboardStats(data);
        }
      } catch (error) {
        console.error('[v0] Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* AI Accuracy Quick */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary gap-2">
          <h3 className="text-sm font-bold flex items-center gap-2 min-w-0">
            <Brain className="w-4 h-4 text-primary shrink-0" />
            <span className="truncate">
              AI Accuracy &amp; Error
              <span className="ml-1 text-[11px] font-semibold text-ink3">
                ({dashboardStats?.avgError ?? '2.1%'} avg err)
              </span>
            </span>
          </h3>
          <Link href="/accuracy" className="text-xs font-semibold text-primary shrink-0">
            Full Dashboard
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-secondary rounded-lg p-2 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald">{dashboardStats?.withinRange ?? '95%'}</div>
              <div className="text-xs text-ink3">Within 5%</div>
            </div>
            <div className="bg-secondary rounded-lg p-2 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald">{dashboardStats?.avgError ?? '2.1%'}</div>
              <div className="text-xs text-ink3">Avg Error</div>
            </div>
          </div>
          <Link 
            href="/accuracy"
            className="block text-center text-sm font-semibold py-2 px-4 rounded-lg border border-primary text-primary hover:bg-primary-bg transition-colors"
          >
            View All Predictions
          </Link>
        </div>
      </div>

      {/* Apply Links */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-sm font-bold">Apply via Broker</h3>
        </div>
        <div className="p-4">
          {BROKERS.map((broker, index) => (
            <div
              key={broker.name}
              className={`flex items-center justify-between py-2 ${
                index !== BROKERS.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-sm font-medium">{broker.name}</span>
              <a
                href={broker.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open ${broker.name} IPO page in a new tab`}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-1"
              >
                Apply
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
          <p className="text-[10px] text-ink3 mt-3 leading-relaxed">
            Opens the broker&apos;s IPO page in a new tab. You&apos;ll need an
            active demat + UPI to apply.
          </p>
        </div>
      </div>
    </aside>
  );
}
