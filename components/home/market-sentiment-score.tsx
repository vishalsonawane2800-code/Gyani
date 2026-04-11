'use client';

interface MarketSentimentScoreProps {
  score?: number;
  sentiment?: string;
  description?: string;
}

const getSentimentColor = (score: number) => {
  if (score >= 70) return 'text-emerald';
  if (score >= 50) return 'text-amber-500';
  if (score >= 30) return 'text-orange-500';
  return 'text-destructive';
};

const getSentimentLabel = (score: number) => {
  if (score >= 70) return 'BULLISH';
  if (score >= 50) return 'NEUTRAL';
  if (score >= 30) return 'CAUTIOUS';
  return 'BEARISH';
};

const getArcStroke = (score: number) => {
  if (score >= 70) return '#10b981';
  if (score >= 50) return '#f59e0b';
  if (score >= 30) return '#f97316';
  return '#ef4444';
};

const statsData = [
  { label: 'Finfluencers', value: '78%' },
  { label: 'News & Media', value: '65%' },
  { label: 'Big Firms', value: '52%' },
  { label: 'Retail Mood', value: '41%' },
];

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
        {/* LEFT SECTION - Score Gauge */}
        <div className="flex flex-col items-center justify-center flex-shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              {/* Background arc */}
              <circle
                cx="60"
                cy="60"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="6"
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
                strokeWidth="6"
                strokeDasharray={`${circumference} ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dashoffset 0.6s ease' }}
              />
              {/* Center text */}
              <text x="60" y="55" textAnchor="middle" className="text-xs sm:text-sm font-bold fill-ink" fontSize="16">
                {score}
              </text>
              <text x="60" y="68" textAnchor="middle" className="text-[10px] fill-ink3" fontSize="10">
                / 100
              </text>
            </svg>
          </div>
          <div className={`mt-2 text-xs sm:text-sm font-bold uppercase tracking-wide ${sentimentColor}`}>
            {sentimentLabel}
          </div>
        </div>

        {/* RIGHT SECTION - Content */}
        <div className="flex-1 flex flex-col justify-between gap-3 sm:gap-4 w-full">
          {/* Top content */}
          <div className="flex flex-col gap-2 sm:gap-3">
            {/* Badge */}
            <div className="inline-flex w-fit">
              <span className="bg-purple-100 text-purple-700 text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full">
                IPOGYANI AI - MARKET PULSE
              </span>
            </div>

            {/* Title */}
            <h2 className="text-sm sm:text-lg font-bold text-ink leading-tight">
              Overall Market Sentiment
            </h2>

            {/* Description */}
            <p className="text-[11px] sm:text-sm text-ink3 leading-relaxed max-w-sm">
              {description}
            </p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full">
            {statsData.map((stat, index) => (
              <div
                key={index}
                className="bg-white/60 border border-white/50 rounded-xl p-3 sm:p-4 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="text-lg sm:text-2xl font-bold text-ink">
                  {stat.value}
                </div>
                <div className="text-[9px] sm:text-sm text-ink3 mt-1 leading-tight font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
