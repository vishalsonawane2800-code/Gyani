export function MarketSentiment() {
  return (
    <div className="bg-gradient-to-br from-[#F8FAFF] via-[#F0F4FF] to-[#EEF2FF] border border-primary/15 rounded-2xl p-4 sm:p-5 mb-7 relative overflow-hidden shadow-[0_4px_20px_rgba(79,70,229,0.08)]">
      
      {/* Subtle decorative glow */}
      <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      {/* Main 2-column layout: Score on left, Content on right */}
      <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 relative">
        
        {/* LEFT: Score Circle */}
        <div className="shrink-0 flex flex-col items-center">
          <svg width="90" height="90" viewBox="0 0 106 106" aria-label="Market sentiment score: 38 out of 100">
            <circle cx="53" cy="53" r="42" fill="none" stroke="#E5E7EB" strokeWidth="10"/>
            <circle 
              cx="53" cy="53" r="42" fill="none" 
              stroke="#F59E0B" strokeWidth="10" 
              strokeDasharray="100 263" strokeDashoffset="66" 
              strokeLinecap="round"
            />
            <text x="53" y="48" textAnchor="middle" fill="#111827" fontFamily="var(--font-sora)" fontSize="25" fontWeight="800">38</text>
            <text x="53" y="63" textAnchor="middle" fill="#6B7280" fontFamily="var(--font-dm-sans)" fontSize="11">/100</text>
          </svg>
          <div className="text-center text-[11px] font-extrabold text-gold-mid tracking-wide mt-1">
            CAUTIOUS
          </div>
        </div>

        {/* RIGHT: Text content */}
        <div className="flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold tracking-wider text-primary uppercase mb-2 bg-primary/10 px-2.5 py-1 rounded-full">
            IPOGyani AI - Market Pulse
          </div>
          <h2 className="font-[family-name:var(--font-sora)] text-lg font-extrabold text-foreground mb-1">
            Overall Market Sentiment
          </h2>
          <p className="text-[11.5px] text-ink3 max-w-[320px] leading-relaxed mx-auto sm:mx-0">
            FY26 IPO returns disappoint - investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution.
          </p>
        </div>
      </div>

      {/* Score Breakdown - Responsive grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4 relative px-1">
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-sm border border-white/50">
          <div className="font-[family-name:var(--font-sora)] text-xl sm:text-[22px] font-black leading-none text-destructive">32</div>
          <div className="text-[9px] sm:text-[9.5px] text-ink3 mt-1">Finfluencers</div>
        </div>
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-sm border border-white/50">
          <div className="font-[family-name:var(--font-sora)] text-xl sm:text-[22px] font-black leading-none text-gold-mid">41</div>
          <div className="text-[9px] sm:text-[9.5px] text-ink3 mt-1">News & Media</div>
        </div>
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-sm border border-white/50">
          <div className="font-[family-name:var(--font-sora)] text-xl sm:text-[22px] font-black leading-none text-destructive">35</div>
          <div className="text-[9px] sm:text-[9.5px] text-ink3 mt-1">Big Firms</div>
        </div>
        <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2.5 shadow-sm border border-white/50">
          <div className="font-[family-name:var(--font-sora)] text-xl sm:text-[22px] font-black leading-none text-destructive">28</div>
          <div className="text-[9px] sm:text-[9.5px] text-ink3 mt-1">Retail Mood</div>
        </div>
      </div>
    </div>
  );
}
