import Link from 'next/link';
import { TrendingUp, ArrowRight, Check } from 'lucide-react';
import { currentIPOs } from '@/lib/data';

const liveIPOs = currentIPOs.filter(ipo => 
  ipo.status === 'open' || ipo.status === 'lastday'
).slice(0, 4);

const stats = [
  { value: '85%+', label: 'AI Accuracy', color: 'text-emerald-400' },
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
      
      <div className="max-w-[1440px] mx-auto px-5 py-12 lg:py-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 lg:gap-12 items-center">
          
          {/* Left Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 text-violet-300 text-[11px] font-bold tracking-wider uppercase px-4 py-1.5 rounded-full border border-violet-500/30" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              India&apos;s AI-Powered IPO Intelligence
            </div>
            
            {/* Headline */}
            <div className="space-y-1">
              <h1 className="font-heading text-4xl sm:text-[46px] font-black text-white leading-[1.1] tracking-tight">
                Should You Apply for
                <br />
                <em className="not-italic text-violet-400">This IPO?</em>
              </h1>
            </div>
            
            {/* Subtext */}
            <p className="text-white/55 text-[15.5px] max-w-[500px] leading-relaxed">
              Get AI-based listing gain prediction, GMP, and subscription signals in one place.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link 
                href="#current" 
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm px-7 py-3 rounded-xl transition-all hover:-translate-y-0.5 shadow-[0_0_0_0_rgba(124,58,237,0.4)] hover:shadow-[0_8px_24px_rgba(124,58,237,0.35)]"
              >
                <TrendingUp className="w-4 h-4" />
                View Live IPOs
              </Link>
              <Link 
                href="/accuracy" 
                className="inline-flex items-center gap-2 border border-white/15 hover:border-white/25 bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white font-semibold text-[13.5px] px-6 py-3 rounded-xl transition-all"
              >
                See AI Track Record
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {/* KPI Stats Row */}
            <div className="flex flex-wrap gap-3 pt-6">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="flex-1 min-w-[105px] backdrop-blur-xl rounded-2xl px-5 py-4 border border-white/10"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className={`font-heading text-[26px] font-black ${stat.color} leading-none mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-[10.5px] font-semibold tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-3 text-white/40 text-xs pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Free to use
              </span>
              <span className="w-px h-3 bg-white/15" />
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                No registration needed
              </span>
              <span className="w-px h-3 bg-white/15" />
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Updated daily
              </span>
            </div>
          </div>
          
          {/* Right: Live IPO Snapshot Card */}
          <div 
            className="backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.12]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/50 text-xs font-bold tracking-wider uppercase">
                Live IPO Snapshot
              </h2>
              <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            
            <div className="space-y-0">
              {liveIPOs.length > 0 ? liveIPOs.map((ipo, index) => (
                <Link 
                  key={ipo.id} 
                  href={`/ipo/${ipo.slug}`}
                  className={`flex items-center gap-3 py-3 group ${index < liveIPOs.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <div 
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold font-heading shrink-0"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {ipo.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-[13px] font-semibold truncate group-hover:text-violet-400 transition-colors">
                      {ipo.name}
                    </div>
                    <div className="text-white/40 text-[10.5px] mt-0.5">
                      {ipo.sector} · {ipo.exchange}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`font-heading text-sm font-extrabold ${ipo.aiPrediction >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
                    </div>
                    <div className="text-white/40 text-[10px] mt-0.5">AI Prediction</div>
                  </div>
                </Link>
              )) : (
                <div className="text-center py-8 text-white/40 text-sm">
                  No live IPOs at the moment
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <Link 
                href="#current" 
                className="flex items-center justify-center gap-2 text-violet-400 hover:text-violet-300 text-[12.5px] font-semibold transition-colors"
              >
                View all live IPOs
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
