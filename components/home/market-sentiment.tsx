export function MarketSentiment() {
  return (
    <div className="bg-gradient-to-br from-[#1a1520] to-[#0f172a] rounded-2xl p-6 flex flex-wrap gap-6 items-center mb-7 relative overflow-hidden">
      {/* Background glow - more muted for cautious sentiment */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_50%,rgba(234,179,8,.15)_0%,transparent_65%)] pointer-events-none" />
      
      {/* Left content */}
      <div className="relative flex-1 min-w-[200px]">
        <div className="text-[10.5px] font-extrabold tracking-wider text-[#fbbf24] uppercase mb-2">
          IPOGyani AI - Market Pulse
        </div>
        <h2 className="font-[family-name:var(--font-sora)] text-lg font-extrabold text-white mb-1">
          Overall Market Sentiment
        </h2>
        <p className="text-[11.5px] text-white/40 max-w-[280px] leading-relaxed">
          FY26 IPO returns disappoint - investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution.
        </p>
      </div>

      {/* Score Circle - lowered to 38 reflecting cautious market */}
      <div className="relative shrink-0">
        <svg width="106" height="106" viewBox="0 0 106 106" aria-label="Market sentiment score: 38 out of 100">
          <circle cx="53" cy="53" r="42" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="10"/>
          <circle 
            cx="53" cy="53" r="42" fill="none" 
            stroke="url(#sentGrad)" strokeWidth="10" 
            strokeDasharray="100 263" strokeDashoffset="66" 
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="sentGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#fbbf24"/>
              <stop offset="100%" stopColor="#f97316"/>
            </linearGradient>
          </defs>
          <text x="53" y="48" textAnchor="middle" fill="#fff" fontFamily="var(--font-sora)" fontSize="25" fontWeight="800">38</text>
          <text x="53" y="63" textAnchor="middle" fill="rgba(176,184,212,.7)" fontFamily="var(--font-dm-sans)" fontSize="11">/100</text>
        </svg>
        <div className="text-center text-[11px] font-extrabold text-[#fbbf24] tracking-wide mt-1">
          CAUTIOUS
        </div>
      </div>

      {/* Score Breakdown - reflecting weak market conditions */}
      <div className="flex gap-4 shrink-0 relative">
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#f97316]">32</div>
          <div className="text-[9.5px] text-white/40 mt-1">Finfluencers</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#fbbf24]">41</div>
          <div className="text-[9.5px] text-white/40 mt-1">News & Media</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#f97316]">35</div>
          <div className="text-[9.5px] text-white/40 mt-1">Big Firms</div>
        </div>
        <div className="text-center">
          <div className="font-[family-name:var(--font-sora)] text-[22px] font-black leading-none text-[#ef4444]">28</div>
          <div className="text-[9.5px] text-white/40 mt-1">Retail Mood</div>
        </div>
      </div>
    </div>
  );
}
