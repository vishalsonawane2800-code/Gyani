'use client';

import { Activity, BarChart2, TrendingUp, Zap } from 'lucide-react';

// Sentiment score: 0–100. 0–30 = Fear, 31–55 = Caution, 56–75 = Optimism, 76–100 = Greed
const SENTIMENT_SCORE = 42;

const ZONES = [
  { label: 'Extreme Fear', range: [0, 20],   color: '#ef4444' },
  { label: 'Fear',         range: [21, 40],  color: '#f97316' },
  { label: 'Caution',      range: [41, 55],  color: '#eab308' },
  { label: 'Optimism',     range: [56, 75],  color: '#84cc16' },
  { label: 'Greed',        range: [76, 100], color: '#22c55e' },
];

function getZone(score: number) {
  return ZONES.find(z => score >= z.range[0] && score <= z.range[1]) ?? ZONES[2];
}

/**
 * Renders a half-circle gauge SVG.
 * Arcs span 180° from left (0) to right (100).
 * Needle points from center to the score position on the arc.
 */
function SentimentGauge({ score }: { score: number }) {
  const cx = 110;
  const cy = 100;
  const r  = 80;

  // Convert score 0–100 to angle -180° to 0° (left to right half-circle)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const scoreAngle = -180 + (score / 100) * 180; // degrees from positive x-axis

  // Needle tip
  const needleLen = 68;
  const nx = cx + needleLen * Math.cos(toRad(scoreAngle));
  const ny = cy + needleLen * Math.sin(toRad(scoreAngle));

  // Build coloured arc segments
  const segments = ZONES.map(zone => {
    const startDeg = -180 + (zone.range[0] / 100) * 180;
    const endDeg   = -180 + (zone.range[1] / 100) * 180;
    const startRad = toRad(startDeg);
    const endRad   = toRad(endDeg);
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return { d: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`, color: zone.color };
  });

  const zone = getZone(score);

  return (
    <svg viewBox="0 0 220 115" className="w-full max-w-[260px] mx-auto select-none">
      {/* Track background */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke="currentColor" strokeWidth="18"
        className="text-border opacity-40"
      />
      {/* Coloured zone arcs */}
      {segments.map((seg, i) => (
        <path key={i} d={seg.d} fill="none" stroke={seg.color} strokeWidth="18" strokeLinecap="butt" />
      ))}
      {/* Needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Centre dot */}
      <circle cx={cx} cy={cy} r="6" fill="white" />
      <circle cx={cx} cy={cy} r="3.5" fill={zone.color} />
      {/* Score label */}
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="22" fontWeight="900" fill="white" fontFamily="inherit">
        {score}
      </text>
      {/* Zone label */}
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="10" fontWeight="700" fill={zone.color} fontFamily="inherit">
        {zone.label.toUpperCase()}
      </text>
      {/* Left / Right labels */}
      <text x={cx - r - 4} y={cy + 5} textAnchor="end" fontSize="8" fill="#6b7280" fontFamily="inherit">FEAR</text>
      <text x={cx + r + 4} y={cy + 5} textAnchor="start" fontSize="8" fill="#6b7280" fontFamily="inherit">GREED</text>
    </svg>
  );
}

const signals = [
  { label: 'Active IPOs',  value: '12',     icon: Activity,   color: 'text-violet-400', bg: 'bg-violet-500/10' },
  { label: 'Avg GMP',      value: '+8.4%',  icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  { label: 'IPO Mood',     value: 'Cautious', icon: Zap,      color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  { label: 'Retail Apps',  value: '-40%',   icon: BarChart2,  color: 'text-red-400',    bg: 'bg-red-500/10' },
];

export function MarketPulse() {
  const zone = getZone(SENTIMENT_SCORE);

  return (
    <div className="mb-7 bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-wider text-ink3 uppercase">
            Market Pulse
          </span>
        </div>
        <span className="text-[10px] text-ink4 font-medium">IPO Sentiment Index</span>
      </div>

      <div className="p-4">
        {/* Gauge + Signals side by side on larger screens */}
        <div className="flex flex-col sm:flex-row items-center gap-4">

          {/* Gauge */}
          <div className="w-full sm:w-auto sm:flex-shrink-0 sm:w-[240px]">
            <SentimentGauge score={SENTIMENT_SCORE} />
          </div>

          {/* Signals */}
          <div className="w-full grid grid-cols-2 gap-2">
            {signals.map((sig) => (
              <div key={sig.label} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${sig.bg}`}>
                <sig.icon className={`w-4 h-4 shrink-0 ${sig.color}`} />
                <div className="min-w-0">
                  <div className={`text-[13px] font-black ${sig.color} leading-tight`}>
                    {sig.value}
                  </div>
                  <div className="text-[9px] text-ink4 font-semibold leading-tight mt-0.5">{sig.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Commentary strip */}
        <div className="mt-3 flex items-start gap-2 bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5">
          <span className="text-[9.5px] font-extrabold text-primary uppercase tracking-wider shrink-0 mt-0.5">
            IPOGyani AI
          </span>
          <p className="text-[10.5px] text-ink3 leading-relaxed">
            FY26 IPO returns disappoint — investors lost money in 2 out of 3 issues. Retail applications down 40%. Exercise caution before applying.
          </p>
        </div>
      </div>
    </div>
  );
}
