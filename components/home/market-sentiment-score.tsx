'use client';

interface MarketSentimentScoreProps {
  score?: number;
  sentiment?: string;
  description?: string;
}

const statsData = [
  { label: 'Finfluencers', value: '78%' },
  { label: 'News & Media', value: '65%' },
  { label: 'Big Firms', value: '52%' },
  { label: 'Retail Mood', value: '41%' },
];

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
  if (score >= 70) return 'rgb(21, 128, 61)'; // emerald
  if (score >= 50) return 'rgb(245, 158, 11)'; // gold-mid
  if (score >= 30) return 'rgb(180, 83, 9)'; // gold
  return 'rgb(220, 38, 38)'; // destructive
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
    <div className="w-full bg-card border border-border rounded-xl p-3 sm:p-5 shadow-sm mb-4">
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
                stroke="rgb(229, 231, 235)"
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
              <span className="bg-primary-bg text-primary text-[9px] sm:text-[10px] font-bold px-2.5 py-1 rounded-full">
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
                className="bg-secondary border border-border rounded-lg p-3 sm:p-4 text-center shadow-sm hover:shadow-md hover:border-primary transition-all"
              >
                <div className="text-lg sm:text-2xl font-bold text-primary">
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
