'use client';

import { useMemo, useState } from 'react';
import { Calculator, Info } from 'lucide-react';

// Retail allotment probability calculator.
//
// Formula (as requested):
//   allotment_probability = 1 / retail_subscription   (capped at 100%)
//
// Intuition: if retail category is subscribed e.g. 4x, each applicant has
// roughly a 1-in-4 (25%) chance of allotment via the lottery system. Any
// subscription below 1x guarantees allotment, so we clamp the result to
// 100%. Users can slide or type to explore different scenarios, and we
// surface a qualitative label next to the number so the result is easy to
// read at a glance.

const MIN_SUB = 0;
const MAX_SUB = 200; // 200x is plenty for retail in real-world SME/mainboard IPOs
const DEFAULT_SUB = 4;

function probabilityFor(sub: number): number {
  if (!Number.isFinite(sub) || sub <= 0) return 100;
  const pct = (1 / sub) * 100;
  return Math.min(100, Math.max(0, pct));
}

function labelFor(pct: number): { text: string; tone: 'emerald' | 'gold' | 'destructive' } {
  if (pct >= 75) return { text: 'Very high — allotment almost certain', tone: 'emerald' };
  if (pct >= 40) return { text: 'Good — decent chance of allotment', tone: 'emerald' };
  if (pct >= 20) return { text: 'Moderate — lottery likely', tone: 'gold' };
  if (pct >= 5) return { text: 'Low — oversubscribed retail', tone: 'destructive' };
  return { text: 'Very low — heavily oversubscribed', tone: 'destructive' };
}

export function ProbabilityCalculator() {
  const [sub, setSub] = useState<number>(DEFAULT_SUB);
  // Keep a separate string for the input so users can freely type decimals
  // (e.g. "2.5") without the state immediately rounding mid-edit.
  const [subInput, setSubInput] = useState<string>(String(DEFAULT_SUB));

  const probability = useMemo(() => probabilityFor(sub), [sub]);
  const meta = useMemo(() => labelFor(probability), [probability]);

  const handleTextChange = (raw: string) => {
    setSubInput(raw);
    const parsed = Number.parseFloat(raw);
    if (Number.isFinite(parsed)) setSub(parsed);
    else if (raw.trim() === '') setSub(0);
  };

  const handleSliderChange = (v: number) => {
    setSub(v);
    setSubInput(String(v));
  };

  const toneClass =
    meta.tone === 'emerald'
      ? 'text-emerald'
      : meta.tone === 'gold'
      ? 'text-gold'
      : 'text-destructive';
  const toneBg =
    meta.tone === 'emerald'
      ? 'bg-emerald-bg'
      : meta.tone === 'gold'
      ? 'bg-gold-bg'
      : 'bg-destructive-bg';

  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center shrink-0">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg md:text-xl font-bold text-ink">
            Retail Allotment Probability Calculator
          </h2>
          <p className="text-sm text-ink3 mt-0.5">
            Enter the retail subscription multiple and see your chance of
            allotment per application.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-5 md:gap-6 items-stretch">
        {/* Input side */}
        <div className="flex flex-col gap-3">
          <label
            htmlFor="prob-sub-input"
            className="text-xs font-semibold uppercase tracking-wide text-ink3"
          >
            Retail Subscription (x)
          </label>
          <div className="relative">
            <input
              id="prob-sub-input"
              type="number"
              inputMode="decimal"
              min={MIN_SUB}
              max={MAX_SUB}
              step="0.1"
              value={subInput}
              onChange={(e) => handleTextChange(e.target.value)}
              className="w-full text-3xl font-extrabold text-ink bg-secondary rounded-xl border border-border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/40"
              aria-describedby="prob-sub-hint"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-bold text-ink3 pointer-events-none">
              x
            </span>
          </div>
          <input
            type="range"
            aria-label="Retail subscription slider"
            min={MIN_SUB}
            max={MAX_SUB}
            step="0.1"
            value={Math.min(sub, MAX_SUB)}
            onChange={(e) => handleSliderChange(Number.parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex items-center justify-between text-[11px] text-ink3 font-medium">
            <span>0x (undersubscribed)</span>
            <span>{MAX_SUB}x</span>
          </div>
          <div
            id="prob-sub-hint"
            className="flex items-start gap-2 text-xs text-ink3 leading-relaxed mt-1"
          >
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Use the live retail subscription figure from the IPO detail
              page. Anything under 1x means the retail category is
              undersubscribed and allotment is guaranteed.
            </span>
          </div>
        </div>

        {/* Divider for desktop, hidden on mobile */}
        <div className="hidden md:flex items-center justify-center">
          <div className="w-px h-full bg-border" />
        </div>

        {/* Output side */}
        <div
          className={`flex flex-col items-center justify-center rounded-xl border border-border p-5 ${toneBg}`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-ink3 mb-2">
            Allotment Probability
          </p>
          <p className={`text-5xl md:text-6xl font-extrabold ${toneClass} leading-none`}>
            {probability.toFixed(1)}
            <span className="text-3xl md:text-4xl align-top">%</span>
          </p>
          <p className={`mt-3 text-sm font-semibold ${toneClass} text-center`}>
            {meta.text}
          </p>
          <p className="mt-3 text-[11px] text-ink3 font-medium">
            Formula: 1 / retail sub, capped at 100%
          </p>
        </div>
      </div>
    </section>
  );
}
