import Link from 'next/link';
import { TrendingUp, ArrowRight } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface HeroSectionProps {
  ipos: IPO[];
}

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

const stats = [
  { value: '95%+', label: 'AI Accuracy', color: 'text-emerald-400' },
  { value: '500+', label: 'IPOs Tracked', color: 'text-violet-400' },
  { value: '25+', label: 'AI Signals', color: 'text-amber-400' },
  { value: 'Live', label: 'GMP Data', color: 'text-white' },
];

export function HeroSection({ ipos }: HeroSectionProps) {
  // Prefer live (open / lastday) IPOs. When there are none, fall back to
  // upcoming IPOs so the hero card never goes empty between IPO windows.
  const openLiveIPOs = ipos.filter(
    (ipo) => ipo.status === 'open' || ipo.status === 'lastday'
  );
  const hasLive = openLiveIPOs.length > 0;
  const displayIPOs = (hasLive
    ? openLiveIPOs
    : ipos.filter((ipo) => ipo.status === 'upcoming')
  ).slice(0, 3);

  const snapshotHeading = hasLive ? 'Live IPO Snapshot' : 'Upcoming IPO Snapshot';
  const pillLabel = hasLive ? 'Live' : 'Upcoming';
  const pillColor = hasLive ? 'text-emerald-400' : 'text-amber-300';
  const pillDotColor = hasLive ? 'bg-emerald-400' : 'bg-amber-300';
  const viewAllLabel = hasLive ? 'View all live IPOs' : 'View upcoming IPOs';
  const emptyLabel = hasLive
    ? 'No live IPOs at the moment'
    : 'No upcoming IPOs scheduled';

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
            <div className="inline-flex items-center gap-2 text-violet-300 text-xs sm:text-sm font-bold tracking-wider uppercase px-3 py-1 sm:px-4 sm:py-2 rounded-full border border-violet-500/30" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
              India&apos;s AI-Powered IPO Intelligence
            </div>
            
            {/* Headline */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-tight tracking-tight">
                Should You Apply for
                <br />
                <em className="not-italic text-violet-400">This IPO?</em>
              </h1>
            </div>
            
            {/* Subtext */}
            <p className="text-white/55 text-sm sm:text-base max-w-xl leading-relaxed">
              Get AI-based listing gain prediction, GMP, and subscription signals in one place.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link 
                href="#current" 
                className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm sm:text-base px-6 sm:px-7 py-3 sm:py-3 rounded-lg transition-all hover:-translate-y-0.5 shadow-lg hover:shadow-xl"
              >
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                View Live IPOs
              </Link>
              <Link 
                href="/accuracy" 
                className="inline-flex items-center gap-2 border border-white/15 hover:border-white/25 bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white font-semibold text-sm px-5 sm:px-6 py-3 rounded-lg transition-all"
              >
                AI Track Record
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </Link>
            </div>
            
            {/* KPI Stats Row - always 4 cols in single line */}
            <div className="flex gap-2 sm:gap-3 pt-4 sm:pt-6">
              {stats.map((stat) => (
                <div 
                  key={stat.label} 
                  className="flex-1 backdrop-blur-xl rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 sm:py-3 border border-white/10 text-center"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <div className={`text-lg sm:text-2xl font-black ${stat.color} leading-none mb-1`}>
                    {stat.value}
                  </div>
                  <div className="text-white/40 text-xs sm:text-sm font-semibold tracking-wide leading-tight">{stat.label}</div>
                </div>
              ))}
            </div>
            
          </div>
          
          {/* Right: Live IPO Snapshot Card */}
          <div 
            className="backdrop-blur-2xl rounded-lg sm:rounded-xl p-4 sm:p-5 border border-white/[0.12]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white/50 text-xs font-bold tracking-wider uppercase">
                {snapshotHeading}
              </h2>
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${pillColor}`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${pillDotColor}`} />
                {pillLabel}
              </span>
            </div>
            
            <div className="space-y-0">
              {displayIPOs.length > 0 ? displayIPOs.map((ipo, index) => (
                <Link 
                  key={ipo.id} 
                  href={`/ipo/${ipo.slug}`}
                  className={`flex items-center gap-3 py-3 group ${index < displayIPOs.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
                >
                  <div 
                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-xs sm:text-sm font-bold shrink-0"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {generateAbbr(ipo.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm sm:text-base font-semibold truncate group-hover:text-violet-400 transition-colors">
                      {ipo.name}
                    </div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {ipo.sector} · {ipo.exchange}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm sm:text-base font-extrabold ${ipo.aiPrediction >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
                    </div>
                    {hasLive ? (
                      <div className="text-white/50 text-xs mt-0.5">
                        GMP: <span className={ipo.gmp >= 0 ? 'text-emerald-400' : 'text-red-400'}>Rs {ipo.gmp}</span>
                        <span className="text-white/30 mx-0.5">|</span>
                        <span className={ipo.gmpPercent >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {ipo.gmpPercent >= 0 ? '+' : ''}{ipo.gmpPercent}%
                        </span>
                      </div>
                    ) : (
                      <div className="text-white/40 text-xs mt-0.5">
                        Opens {ipo.openDate || 'TBD'}
                      </div>
                    )}
                  </div>
                </Link>
              )) : (
                <div className="text-center py-6 text-white/40 text-sm">
                  {emptyLabel}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <Link 
                href="#current" 
                className="flex items-center justify-center gap-2 text-violet-400 hover:text-violet-300 text-xs sm:text-sm font-semibold transition-colors"
              >
                {viewAllLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
