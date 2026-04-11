'use client';

interface MarketSentimentScoreProps {
  score?: number;
  sentiment?: string;
  description?: string;
}

const getSentimentColor = (score: number) => {
  if (score >= 70) return 'text-emerald';
  if (score >= 50) return 'text-gold-mid';
  if (score >= 30) return 'text-gold';
  return 'text-destructive';
};

const getSentimentLabel = (score: number) => {
  if (score >= 70) return 'BULLISH';
  if (score >= 50) return 'NEUTRAL';
  if (score >= 30) return 'CAUTIOUS';
  return 'BEARISH';
};

const getArcStroke = (score: number) => {
  if (score >= 70) return 'var(--emerald)';
  if (score >= 50) return 'var(--gold-mid)';
  if (score >= 30) return 'var(--gold)';
  return 'var(--destructive)';
};

export function MarketSentimentScore({
  score = 38,
  description = 'FY26 IPO returns disappoint - investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution.',
}: MarketSentimentScoreProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const sentimentColor = getSentimentColor(score);
  const sentimentLabel = getSentimentLabel(score);
  const arcStroke = getArcStroke(score);

  return (
    <div className="w-full bg-gradient-to-r from-sky-50/80 to-white/60 backdrop-blur-sm border border-white/80 rounded-2xl p-3 sm:p-5 shadow-sm mb-4">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        {/* LEFT SECTION - Score Gauge - Centered on mobile, left on desktop */}
        <div className="flex flex-col items-center sm:items-center justify-center flex-shrink-0 order-first sm:order-none">
          <div className="relative w-28 h-28 sm:w-32 sm:h-32">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              {/* Background arc */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px' }}
              />
              {/* Progress arc */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke={arcStroke}
                strokeWidth="8"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 0.6s ease' }}
              />
              {/* Center text */}
              <text x="60" y="55" textAnchor="middle" className="font-[family-name:var(--font-sora)]" fontSize="16" fontWeight="900" fill="var(--ink)">
                {score}
              </text>
              <text x="60" y="68" textAnchor="middle" className="font-[family-name:var(--font-sora)]" fontSize="10" fontWeight="600" fill="var(--ink3)">
                / 100
              </text>
            </svg>
          </div>
          <div className={`mt-3 text-xs sm:text-sm font-bold uppercase tracking-wide ${sentimentColor}`}>
            {sentimentLabel}
          </div>
        </div>

        {/* RIGHT SECTION - Content */}
        <div className="flex-1 flex flex-col justify-center gap-2 sm:gap-3">
          {/* Badge */}
          <div className="inline-flex w-fit">
            <span className="bg-primary-bg text-primary text-[10px] sm:text-[11px] font-bold px-2.5 py-1 rounded-full">
              IPOGYANI AI - MARKET PULSE
            </span>
          </div>

          {/* Title */}
          <h2 className="text-base sm:text-lg font-bold font-[family-name:var(--font-sora)] text-ink leading-tight">
            Overall Market Sentiment
          </h2>

          {/* Description */}
          <p className="text-sm sm:text-base text-ink3 font-[family-name:var(--font-sans)] leading-relaxed max-w-sm">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
