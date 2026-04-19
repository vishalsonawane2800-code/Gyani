'use client';

import { Sparkles, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface SentimentSignal {
  label: string;
  value: string;
  tone?: 'negative' | 'positive' | 'neutral';
}

interface MarketSentimentScoreProps {
  score?: number;
  sentiment?: string;
  description?: string;
  signals?: SentimentSignal[];
  updatedAt?: string;
}

type ZoneKey = 'bearish' | 'cautious' | 'neutral' | 'bullish';

const ZONES: Record<ZoneKey, { label: string; stroke: string; soft: string; text: string; ring: string }> = {
  bearish: {
    label: 'BEARISH',
    stroke: 'var(--destructive)',
    soft: 'var(--destructive-bg)',
    text: 'var(--destructive)',
    ring: 'rgba(220, 38, 38, 0.15)',
  },
  cautious: {
    label: 'CAUTIOUS',
    stroke: 'var(--gold)',
    soft: 'var(--gold-bg)',
    text: 'var(--gold)',
    ring: 'rgba(180, 83, 9, 0.15)',
  },
  neutral: {
    label: 'NEUTRAL',
    stroke: 'var(--gold-mid)',
    soft: 'var(--gold-bg)',
    text: 'var(--gold)',
    ring: 'rgba(245, 158, 11, 0.15)',
  },
  bullish: {
    label: 'BULLISH',
    stroke: 'var(--emerald)',
    soft: 'var(--emerald-bg)',
    text: 'var(--emerald)',
    ring: 'rgba(21, 128, 61, 0.15)',
  },
};

function getZone(score: number): ZoneKey {
  if (score >= 70) return 'bullish';
  if (score >= 50) return 'neutral';
  if (score >= 30) return 'cautious';
  return 'bearish';
}

const DEFAULT_SIGNALS: SentimentSignal[] = [
  { label: 'Negative returns', value: '2 of 3', tone: 'negative' },
  { label: 'Retail apps', value: '-40%', tone: 'negative' },
  { label: 'Avg listing gain', value: '+3.2%', tone: 'neutral' },
];

export function MarketSentimentScore({
  score = 38,
  description = 'FY26 IPO returns disappoint — investors lost money in 2 out of 3 issues. Retail applications are down 40%. Exercise caution.',
  signals = DEFAULT_SIGNALS,
  updatedAt = 'Updated today',
}: MarketSentimentScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const zoneKey = getZone(clamped);
  const zone = ZONES[zoneKey];

  // SVG gauge maths — 3/4 circle arc (from 135deg around to 45deg = 270deg sweep).
  const radius = 54;
  const sweep = 270; // degrees of visible arc
  const circumference = 2 * Math.PI * radius;
  const visibleLength = (sweep / 360) * circumference;
  const progressLength = (clamped / 100) * visibleLength;

  // Needle angle: map [0, 100] -> [-135deg, +135deg]
  const needleAngle = (clamped / 100) * sweep - sweep / 2;

  // Tick marks every 25 to visually anchor zones.
  const ticks = [0, 25, 50, 75, 100];

  return (
    <section
      aria-label="IPO market sentiment"
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm mb-4"
    >
      {/* Soft tinted backdrop tied to current zone */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, ${zone.soft} 0%, transparent 55%)`,
        }}
      />

      <div className="relative flex flex-col gap-4 p-4 sm:p-5 md:flex-row md:items-stretch md:gap-6">
        {/* LEFT: Gauge */}
        <div className="flex flex-row items-center justify-center gap-4 md:flex-col md:justify-center md:gap-3">
          <div className="relative h-32 w-32 sm:h-36 sm:w-36">
            <svg viewBox="0 0 140 140" className="h-full w-full -rotate-[135deg]">
              {/* Track */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${visibleLength} ${circumference}`}
              />
              {/* Progress */}
              <circle
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={zone.stroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${progressLength} ${circumference}`}
                style={{ transition: 'stroke-dasharray 0.8s ease' }}
              />
              {/* Tick marks */}
              {ticks.map((t) => {
                const angle = (t / 100) * sweep;
                const rad = (angle * Math.PI) / 180;
                const inner = radius - 14;
                const outer = radius - 6;
                const x1 = 70 + Math.cos(rad) * inner;
                const y1 = 70 + Math.sin(rad) * inner;
                const x2 = 70 + Math.cos(rad) * outer;
                const y2 = 70 + Math.sin(rad) * outer;
                return (
                  <line
                    key={t}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="var(--border-secondary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {/* Needle + center */}
            <div
              className="absolute left-1/2 top-1/2 h-16 w-[3px] origin-bottom -translate-x-1/2 -translate-y-full rounded-full"
              style={{
                background: zone.stroke,
                transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
                transformOrigin: '50% 100%',
                transition: 'transform 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                boxShadow: `0 0 0 3px ${zone.ring}`,
              }}
            />
            <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-card ring-2" style={{ boxShadow: `0 0 0 3px ${zone.stroke}` }} />

            {/* Score readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2">
              <div
                className="font-[family-name:var(--font-sora)] text-[28px] font-black leading-none"
                style={{ color: zone.text }}
              >
                {clamped}
              </div>
              <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink3">
                / 100
              </div>
            </div>
          </div>

          {/* Zone pill */}
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider shadow-sm md:mt-1"
            style={{
              background: zone.soft,
              color: zone.text,
              border: `1px solid ${zone.ring}`,
            }}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ background: zone.stroke }}
              />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: zone.stroke }} />
            </span>
            {zone.label}
          </div>
        </div>

        {/* RIGHT: Content */}
        <div className="flex flex-1 flex-col justify-center gap-3">
          {/* Top row: AI badge + meta */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <Sparkles className="h-3 w-3" aria-hidden />
              IPOGyani AI · Market Pulse
            </span>
            <span className="text-[10px] font-medium text-ink4">{updatedAt}</span>
          </div>

          {/* Title */}
          <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold leading-tight text-ink text-balance sm:text-[17px]">
            Overall Market Sentiment
          </h2>

          {/* Description */}
          <p className="text-[12.5px] leading-relaxed text-ink2 text-pretty sm:text-[13.5px]">
            {description}
          </p>

          {/* Signal chips */}
          {signals.length > 0 && (
            <ul className="mt-1 flex flex-wrap gap-2">
              {signals.map((signal) => {
                const Icon =
                  signal.tone === 'negative' ? TrendingDown : signal.tone === 'positive' ? TrendingUp : Minus;
                const toneColor =
                  signal.tone === 'negative'
                    ? 'var(--destructive)'
                    : signal.tone === 'positive'
                      ? 'var(--emerald)'
                      : 'var(--ink3)';
                const toneBg =
                  signal.tone === 'negative'
                    ? 'var(--destructive-bg)'
                    : signal.tone === 'positive'
                      ? 'var(--emerald-bg)'
                      : 'var(--muted)';
                return (
                  <li
                    key={signal.label}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/70 px-2.5 py-1 backdrop-blur-sm"
                  >
                    <Icon className="h-3 w-3" style={{ color: toneColor }} aria-hidden />
                    <span className="text-[11px] font-medium text-ink3">{signal.label}</span>
                    <span
                      className="rounded-md px-1.5 py-px text-[11px] font-bold tabular-nums"
                      style={{ color: toneColor, background: toneBg }}
                    >
                      {signal.value}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
