import Link from 'next/link';
import { TrendingUp, ArrowRight, Check } from 'lucide-react';
import { currentIPOs } from '@/lib/data';

const liveIPOs = currentIPOs.filter(ipo => 
  ipo.status === 'open' || ipo.status === 'lastday'
).slice(0, 4);

const stats = [
  { value: '85%+', label: 'AI Accuracy', color: 'text-emerald-400' },
  { value: '500+', label: 'IPOs Tracked', color: 'text-purple-400' },
  { value: '25+', label: 'AI Signals', color: 'text-cyan-400' },
  { value: 'Live', label: 'GMP Data', color: 'text-white' },
];

export function HeroSection() {
  return (
    <section className="bg-[#0f1629] relative overflow-hidden">
      {/* Background gradient effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20 pointer-events-none" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-[1440px] mx-auto px-5 py-10 lg:py-14 relative">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start">
          
          {/* Left Content */}
          <div className="space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] sm:text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              India&apos;s AI-Powered IPO Intelligence
            </div>
            
            {/* Headline */}
            <div className="space-y-2">
              <h1 className="font-[family-name:var(--font-sora)] text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Should You Apply for
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">This IPO?</span>
              </h1>
            </div>
            
            {/* Subtext */}
            <p className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed">
              Get AI-based listing gain prediction, GMP, and subscription signals in one place.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link 
                href="#current" 
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                View Live IPOs
              </Link>
              <Link 
                href="/accuracy" 
                className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-500 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
              >
                See AI Track Record
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            {/* Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
                  <div className={`font-[family-name:var(--font-sora)] text-xl sm:text-2xl font-extrabold ${stat.color}`}>
                    {stat.value}
                  </div>
                  <div className="text-slate-500 text-[10px] sm:text-xs mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-4 text-slate-500 text-xs pt-2">
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Free to use
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                No registration needed
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                Updated daily
              </span>
            </div>
          </div>
          
          {/* Right: Live IPO Snapshot */}
          <div className="bg-slate-800/40 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 lg:mt-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-slate-300 text-xs font-bold tracking-wider uppercase">
                Live IPO Snapshot
              </h2>
              <span className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            
            <div className="space-y-3">
              {liveIPOs.length > 0 ? liveIPOs.map((ipo) => (
                <Link 
                  key={ipo.id} 
                  href={`/ipo/${ipo.slug}`}
                  className="flex items-center gap-3 group"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {ipo.abbr}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate group-hover:text-emerald-400 transition-colors">
                      {ipo.name}
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {ipo.sector} · {ipo.exchange}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className={`text-sm font-bold ${ipo.aiPrediction >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
                    </div>
                    <div className="text-slate-500 text-[10px]">AI Prediction</div>
                  </div>
                </Link>
              )) : (
                <div className="text-center py-6 text-slate-500 text-sm">
                  No live IPOs at the moment
                </div>
              )}
            </div>
            
            <Link 
              href="#current" 
              className="flex items-center justify-center gap-1.5 text-emerald-400 hover:text-emerald-300 text-xs font-medium mt-4 pt-3 border-t border-slate-700/50 transition-colors"
            >
              View all live IPOs
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
