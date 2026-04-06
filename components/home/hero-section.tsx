import Link from 'next/link';
import { TrendingUp, ArrowRight, Check } from 'lucide-react';
import { currentIPOs } from '@/lib/data';

const liveIPOs = currentIPOs.filter(ipo => 
  ipo.status === 'open' || ipo.status === 'lastday'
).slice(0, 3);

const stats = [
  { value: '95%+', label: 'AI Accuracy', color: 'text-emerald-400' },
  { value: '500+', label: 'IPOs Tracked', color: 'text-violet-400' },
  { value: '25+', label: 'AI Signals', color: 'text-amber-400' },
  { value: 'Live', label: 'GMP Data', color: 'text-white' },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden" style={{ background: 'linear-gradient(155deg, #0d0b1e 0%, #1a0f3c 40%, #0f2050 100%)' }}>
      {/* Radial gradient overlays */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 60% 60% at 75% 40%, rgba(124,58,237,0.25), transparent),
            radial-gradient(ellipse 40% 50% at 20% 70%, rgba(29,78,216,0.2), transparent)
          `
        }}
      />
      
      {/* Subtle grid overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="max-w-[1440px] mx-auto px-4 py-5 sm:px-5 sm:py-8 lg:py-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 lg:gap-10 items-center">
          
          {/* Left Content */}
          <div className="space-y-3 sm:space-y-4">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-violet-300 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border border-violet-500/30" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              India&apos;s AI-Powered IPO Intelligence
            </div>
            
            {/* Headline */}
            <div className="space-y-1">
              <h1 className="font-heading text-[28px] sm:text-4xl lg:text-[44px] font-black text-white leading-[1.1] tracking-tight">
                Should You Apply for
                <br />
                <em className="not-italic text-violet-400">This IPO?</em>
              </h1>
            </div>
            
            {/* Subtext */}
            <p className="text-white/55 text-[13px] sm:text-[15px] max-w-[500px] leading-relaxed">
              Get AI-based listing gain prediction, GMP, and subscription signals in one place.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1">
              <Link 
                href="#current" 
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs sm:text-sm px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_0_0_0_rgba(124,58,237,0.4)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.35)]"
              >
                <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                View Live IPOs
              </Link>
              <Link 
                href="/accuracy" 
                className="inline-flex items-center gap-2 border border-white/15 hover:border-white/25 bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white font-semibold text-xs sm:text-[13px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl transition-all"
              >
                AI Track Record
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Link>
            </div>
            
            {/* KPI Stats Row - always 4 cols in single line */}
            <div className="flex gap-1.5 sm:gap-3 pt-3 sm:pt-5">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="flex-1 backdrop-blur-xl rounded-lg sm:rounded-2xl px-1.5 sm:px-4 py-2 sm:py-3 border border-white/10 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className={`font-heading text-[13px] sm:text-xl lg:text-2xl font-black ${stat.color} leading-none mb-0.5`}>
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-[7px] sm:text-[10px] font-semibold tracking-wide leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>
            
          </div>
          
          {/* Right: Live IPO Snapshot Card */}
          <div 
            className="backdrop-blur-2xl rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-white/[0.12]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/50 text-[10px] sm:text-xs font-bold tracking-wider uppercase">
                Live IPO Snapshot
              </h2>
              <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            
            <div className="space-y-0">
              {liveIPOs.length > 0 ? liveIPOs.map((ipo, index) => (
                <Link 
                  key={ipo.id} 
                  href={`/ipo/${ipo.slug}`}
                  className={`flex items-center gap-2.5 sm:gap-3 py-2.5 sm:py-3 group ${index < liveIPOs.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <div 
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-bold font-heading shrink-0"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {ipo.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[12px] sm:text-[13px] font-semibold truncate group-hover:text-violet-400 transition-colors">
                      {ipo.name}
                    </div>
                    <div className="text-white/40 text-[9px] sm:text-[10px] mt-0.5">
                      {ipo.sector} · {ipo.exchange}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-heading text-xs sm:text-sm font-extrabold ${ipo.aiPrediction >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
                    </div>
                    <div className="text-white/50 text-[9px] sm:text-[10px] mt-0.5">
                      GMP: <span className={ipo.gmp >= 0 ? 'text-emerald-400' : 'text-red-400'}>₹{ipo.gmp}</span>
                      <span className="text-white/30 mx-0.5">|</span>
                      <span className={ipo.gmpPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {ipo.gmpPercent >= 0 ? '+' : ''}{ipo.gmpPercent}%
                      </span>
                    </div>
                  </div>
                </Link>
              )) : (
                <div className="text-center py-6 text-white/40 text-sm">
                  No live IPOs at the moment
                </div>
              )}
            </div>
            
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <Link 
                href="#current" 
                className="flex items-center justify-center gap-2 text-violet-400 hover:text-violet-300 text-[11px] sm:text-[12px] font-semibold transition-colors"
              >
                View all live IPOs
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
