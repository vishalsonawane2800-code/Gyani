'use client';

import Link from 'next/link';
import { Calendar, TrendingUp, ExternalLink, Brain } from 'lucide-react';
import { upcomingEvents, currentIPOs } from '@/lib/data';

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* Upcoming Events */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-mid" />
            Upcoming Events
          </h3>
          <Link href="/events" className="text-[11.5px] font-semibold text-primary-mid">
            View All
          </Link>
        </div>
        <div className="p-4">
          {upcomingEvents.map((event, index) => (
            <div 
              key={index}
              className={`flex gap-3 items-start py-2.5 ${
                index !== upcomingEvents.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              {/* Date */}
              <div 
                className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-[9px] font-extrabold tracking-tight shrink-0 leading-tight"
                style={{ backgroundColor: event.dateColor.bg, color: event.dateColor.text }}
              >
                <span className="text-[14px]">{event.date}</span>
                <span>{event.month}</span>
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold mb-0.5 truncate">{event.title}</p>
                <p className="text-[11px] text-ink3 mb-1">{event.desc}</p>
                <span 
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-xl"
                  style={{ backgroundColor: event.tagColor.bg, color: event.tagColor.text }}
                >
                  {event.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick GMP */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-mid" />
            Quick GMP
          </h3>
          <Link href="/#gmp" className="text-[11.5px] font-semibold text-primary-mid">
            View All
          </Link>
        </div>
        <div className="p-4">
          {currentIPOs.slice(0, 4).map((ipo, index) => {
            const isPositive = ipo.gmp > 0;
            return (
              <div 
                key={ipo.id}
                className={`flex items-center gap-2 py-2 text-[12.5px] ${
                  index !== Math.min(currentIPOs.length - 1, 3) ? 'border-b border-border' : ''
                }`}
              >
                <span className="font-medium flex-1 truncate">{ipo.name}</span>
                <span className={`font-bold ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                  {isPositive ? '+' : ''}Rs {Math.abs(ipo.gmp).toLocaleString()}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-lg ${
                  isPositive ? 'bg-emerald-bg text-emerald' : 'bg-destructive-bg text-destructive'
                }`}>
                  {isPositive ? '+' : ''}{ipo.gmpPercent}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Allotment Check */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Check Allotment</h3>
        </div>
        <div className="p-4">
          <select className="w-full border-[1.5px] border-border-secondary rounded-lg py-2 px-3 text-[13px] mb-2 outline-none focus:border-primary-mid bg-card text-foreground">
            <option value="">Select IPO</option>
            {currentIPOs.filter(ipo => ipo.status === 'allot' || ipo.status === 'listing').map(ipo => (
              <option key={ipo.id} value={ipo.slug}>{ipo.name}</option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Enter PAN Number"
            className="w-full border-[1.5px] border-border-secondary rounded-lg py-2 px-3 text-[13px] mb-2 outline-none focus:border-primary-mid bg-card text-foreground placeholder:text-ink4"
            maxLength={10}
          />
          <button className="w-full bg-gradient-to-br from-primary to-cobalt text-white text-[13px] font-bold py-2.5 rounded-lg hover:opacity-90 transition-opacity">
            Check Status
          </button>
        </div>
      </div>

      {/* AI Accuracy Quick */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary-mid" />
            AI Accuracy
          </h3>
          <Link href="/accuracy" className="text-[11.5px] font-semibold text-primary-mid">
            Full Dashboard
          </Link>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <div className="font-[family-name:var(--font-sora)] text-lg font-black text-emerald">94%</div>
              <div className="text-[9px] text-ink3">Within 5%</div>
            </div>
            <div className="bg-secondary rounded-lg p-2.5 text-center">
              <div className="font-[family-name:var(--font-sora)] text-lg font-black text-gold-mid">2.3%</div>
              <div className="text-[9px] text-ink3">Avg Error</div>
            </div>
          </div>
          <Link 
            href="/accuracy"
            className="block text-center text-[12px] font-semibold py-2 px-4 rounded-lg border border-primary-mid text-primary-mid hover:bg-primary-bg transition-colors"
          >
            View All Predictions
          </Link>
        </div>
      </div>

      {/* Apply Links */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Apply via Broker</h3>
        </div>
        <div className="p-4">
          {['Zerodha', 'Groww', 'Upstox', 'Angel One'].map((broker, index, arr) => (
            <div 
              key={broker}
              className={`flex items-center justify-between py-2 ${
                index !== arr.length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <span className="text-[12.5px] font-medium">{broker}</span>
              <button className="text-[11.5px] font-bold px-3.5 py-1.5 rounded-lg bg-gradient-to-br from-primary to-cobalt text-white hover:opacity-90 transition-opacity flex items-center gap-1">
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
