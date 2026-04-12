'use client';

import Link from 'next/link';
import { ExternalLink, Brain } from 'lucide-react';

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* AI Accuracy Quick */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            AI Accuracy
          </h3>
          <Link href="/accuracy" className="text-xs font-semibold text-primary">
            Full Dashboard
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-secondary rounded-lg p-2 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald">95%</div>
              <div className="text-xs text-ink3">Within 5%</div>
            </div>
            <div className="bg-secondary rounded-lg p-2 text-center">
              <div className="text-lg sm:text-xl font-black text-emerald">2.1%</div>
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
          {['Zerodha', 'Groww', 'Upstox', 'Angel One'].map((broker, index, arr) => (
            <div 
              key={broker}
              className={`flex items-center justify-between py-2 ${
                index !== arr.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-sm font-medium">{broker}</span>
              <button className="text-xs font-bold px-3 py-1.5 rounded-lg bg-primary text-white hover:opacity-90 transition-opacity flex items-center gap-1">
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
