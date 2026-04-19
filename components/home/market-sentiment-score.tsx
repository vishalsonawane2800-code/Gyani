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

const ZONES: Record<
  ZoneKey,
  { label: string; stroke: string; soft: string; text: string }
> = {
  bearish: {
    label: 'BEARISH',
    stroke: 'var(--destructive)',
    soft: 'var(--destructive-bg)',
    text: 'var(--destructive)',
  },
  cautious: {
    label: 'CAUTIOUS',
    stroke: 'var(--gold)',
    soft: 'var(--gold-bg)',
    text: 'var(--gold)',
  },
  neutral: {
    label: 'NEUTRAL',
    stroke: 'var(--gold-mid)',
    soft: 'var(--gold-bg)',
    text: 'var(--gold)',
  },
  bullish: {
    label: 'BULLISH',
    stroke: 'var(--emerald)',
    soft: 'var(--emerald-bg)',
    text: 'var(--emerald)',
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

// Gauge geometry: a 270deg arc (gap at the bottom).
const GAUGE_SIZE = 180;
const GAUGE_RADIUS = 72;
const GAUGE_STROKE = 14;
const GAUGE_CENTER = GAUGE_SIZE / 2;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_RADIUS;
const GAUGE_ARC_FRACTION = 0.75; // 270 of 360 deg
const GAUGE_ARC_LEN = GAUGE_CIRC * GAUGE_ARC_FRACTION;

export function MarketSentimentScore({
  score = 38,
  description = 'FY26 IPO returns disappoint — investors lost money in 2 out of 3 issues. Retail applications are down 40%. Exercise caution.',
  signals = DEFAULT_SIGNALS,
  updatedAt = 'Updated today',
}: MarketSentimentScoreProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const zoneKey = getZone(clamped);
  const zone = ZONES[zoneKey];

  const progressLen = (clamped / 100) * GAUGE_ARC_LEN;

  return (
    <section
      aria-label="IPO market sentiment"
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm mb-4"
    >
      <div className="relative flex flex-col gap-4 p-4 sm:p-5">
        {/* Top row: AI badge + meta */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" aria-hidden />
            IPOGyani AI · Market Pulse
          </span>
          <span className="text-[10px] font-medium text-ink4">{updatedAt}</span>
        </div>

        {/* Title */}
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold leading-tight text-ink text-balance sm:text-[17px]">
            Overall Market Sentiment
          </h2>
        </div>

        {/* Main row: circular gauge + description */}
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
          {/* Circular gauge */}
          <div
            className="relative shrink-0"
            style={{ width: GAUGE_SIZE, height: GAUGE_SIZE }}
            role="img"
            aria-label={`Sentiment score ${clamped} out of 100, ${zone.label.toLowerCase()}`}
          >
            <svg
              width={GAUGE_SIZE}
              height={GAUGE_SIZE}
              viewBox={`0 0 ${GAUGE_SIZE} ${GAUGE_SIZE}`}
              className="-rotate-[135deg]"
            >
              {/* Track */}
              <circle
                cx={GAUGE_CENTER}
                cy={GAUGE_CENTER}
                r={GAUGE_RADIUS}
                fill="none"
                stroke="var(--muted)"
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${GAUGE_ARC_LEN} ${GAUGE_CIRC}`}
              />
              {/* Progress */}
              <circle
                cx={GAUGE_CENTER}
                cy={GAUGE_CENTER}
                r={GAUGE_RADIUS}
                fill="none"
                stroke={zone.stroke}
                strokeWidth={GAUGE_STROKE}
                strokeLinecap="round"
                strokeDasharray={`${progressLen} ${GAUGE_CIRC}`}
                style={{ transition: 'stroke-dasharray 0.8s ease, stroke 0.4s ease' }}
              />
            </svg>

            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="font-[family-name:var(--font-sora)] text-[44px] font-black leading-none tabular-nums"
                style={{ color: zone.text }}
              >
                {clamped}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-ink3">
                / 100
              </span>
              <span
                className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider"
                style={{ background: zone.soft, color: zone.text }}
              >
                <span
                  className="inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ background: zone.stroke }}
                />
                {zone.label}
              </span>
            </div>
          </div>

          {/* Description on the right (below on mobile) */}
          <p className="text-[12.5px] leading-relaxed text-ink2 text-pretty sm:text-[13.5px]">
            {description}
          </p>
        </div>

        {/* Signal chips */}
        {signals.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {signals.map((signal) => {
              const Icon =
                signal.tone === 'negative'
                  ? TrendingDown
                  : signal.tone === 'positive'
                    ? TrendingUp
                    : Minus;
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1"
                >
                  <Icon
                    className="h-3 w-3"
                    style={{ color: toneColor }}
                    aria-hidden
                  />
                  <span className="text-[11px] font-medium text-ink3">
                    {signal.label}
                  </span>
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
    </section>
  );
}
