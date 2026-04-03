export function MarketSentiment() {
  return (
    <div className="bg-gradient-to-br from-[#1e1040] to-[#0f172a] rounded-2xl p-6 flex flex-wrap gap-6 items-center mb-7 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(91,33,182,.3)_0%,transparent_65%)] pointer-events-none" />
      
      {/* Left content */}
      <div className="relative flex-1 min-w-[200px]">
        <div className="text-[10.5px] font-extrabold tracking-wider text-[#a78bfa] uppercase mb-2">
          IPOGyani AI - Market Pulse
        </div>
        <h2 className="font-[family-name:var(--font-sora)] text-lg font-extrabold text-white mb-1">
          Overall Market Sentiment
        </h2>
        <p className="text-[11.5px] text-white/40 max-w-[260px] leading-relaxed">
          Analysed from 200+ YouTube videos, 500+ news articles, broker reports & SEBI filings - refreshed every hour
        </p>
      </div>

      {/* Score Circle */}
      <div className="relative shrink-0">
        <svg width="106" height="106" viewBox="0 0 106 106" aria-label="Market sentiment score: 72 out of 100">
          <circle cx="53" cy="53" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10"/>
          <circle 
            cx="53" cy="53" r="42" fill="none" 
            stroke="url(#sentGrad)" strokeWidth="10" 
            strokeDasharray="210 263" strokeDashoffset="66" 
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#60a5fa"/>
              <stop offset="100%" stopColor="#34d399"/>
            </linearGradient>
          </defs>
          <text x="53" y="48" textAnchor="middle" fill="#fff" fontFamily="var(--font-sora)" fontSize="25" fontWeight="800">72</text>
          <text x="53" y="63" textAnchor="middle" fill="rgba(176,184,212,.7)" fontFamily="var(--font-dm-sans)" fontSize="11">/100</text>
        </svg>
        <div className="text-center text-[11px] font-extrabold text-[#34d399] tracking-wide mt-1">
          POSITIVE
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="flex gap-4 shrink-0 relative">
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#4ade80]">68</div>
          <div className="text-[9.5px] text-white/40 mt-1">Finfluencers</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#60a5fa]">74</div>
          <div className="text-[9.5px] text-white/40 mt-1">News & Media</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#c4b5fd]">76</div>
          <div className="text-[9.5px] text-white/40 mt-1">Big Firms</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#fbbf24]">71</div>
          <div className="text-[9.5px] text-white/40 mt-1">Retail Mood</div>
        </div>
      </div>
    </div>
  );
}
