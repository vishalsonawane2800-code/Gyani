import { listedIPOs } from '@/lib/data';

export function ListedHero() {
  // Calculate stats
  const totalIPOs = listedIPOs.length;
  const positiveIPOs = listedIPOs.filter(ipo => ipo.gainPct > 0).length;
  const avgGain = listedIPOs.reduce((acc, ipo) => acc + ipo.gainPct, 0) / totalIPOs;
  const avgAccuracy = 100 - (listedIPOs.reduce((acc, ipo) => acc + ipo.aiErr, 0) / totalIPOs);
  
  const stats = [
    { value: totalIPOs.toString(), label: 'IPOs Listed', color: 'text-white' },
    { value: `${((positiveIPOs / totalIPOs) * 100).toFixed(0)}%`, label: 'Positive Listings', color: 'text-emerald-mid' },
    { value: `${avgGain.toFixed(1)}%`, label: 'Avg Listing Gain', color: 'text-[#60a5fa]' },
    { value: `${avgAccuracy.toFixed(0)}%`, label: 'AI Accuracy', color: 'text-[#a78bfa]' },
  ];

  return (
    <div className="bg-foreground py-14 px-5 relative overflow-hidden">
      <div className="max-w-[1440px] mx-auto relative">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 text-[11px] font-bold tracking-wider uppercase text-primary bg-white/10 border border-white/20 px-3 py-1.5 rounded-full mb-4">
          Database Updated Daily
        </div>
        
        <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-black text-white leading-tight mb-3">
          Listed IPO <span className="text-primary">Database</span>
        </h1>
        
        <p className="text-[15px] text-white/60 max-w-xl mb-8">
          Complete archive of all mainboard and SME IPOs listed on BSE & NSE. Track listing gains, subscription data, 
          GMP history, and AI prediction accuracy.
        </p>
        
        {/* Stats */}
        <div className="flex flex-wrap gap-4">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-white/5 border border-white/10 rounded-xl px-5 py-4 min-w-[120px]"
            >
              <div className={`font-[family-name:var(--font-sora)] text-2xl font-black ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-[11px] text-white/40 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
