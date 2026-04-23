import { TrendingUp } from 'lucide-react';

// Compact summary of avg / median listing gain for Mainboard and SME IPOs,
// computed from the listed IPO excel sheet. This replaces the old full
// stats dashboard on the Subscription page with a much leaner strip so the
// focus stays on the live subscription data + allotment calculator below.

interface Props {
  // Pre-computed to keep the component purely presentational. Values are
  // percentages; null when no listings exist for the given segment so we
  // can render a dash instead of misleading "+0%".
  mainboard: { count: number; avg: number | null; median: number | null };
  sme: { count: number; avg: number | null; median: number | null };
  // Range of years covered by the underlying data (e.g. "2020 - 2026").
  // Rendered in the header to make the denominator obvious.
  yearsLabel: string;
}

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '-';
  const rounded = Number.isInteger(n) ? n : Number(n.toFixed(2));
  return `${rounded >= 0 ? '+' : ''}${rounded}%`;
}

function toneFor(n: number | null): string {
  if (n === null) return 'text-ink3';
  return n >= 0 ? 'text-emerald' : 'text-destructive';
}

export function ListingGainSummary({ mainboard, sme, yearsLabel }: Props) {
  return (
    <section className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-sm md:text-base font-bold text-ink">
          Listing Gains (from listed IPO history)
        </h2>
        <span className="ml-auto text-[11px] text-ink3 font-medium">
          {yearsLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Segment
          title="Mainboard"
          count={mainboard.count}
          avg={mainboard.avg}
          median={mainboard.median}
        />
        <Segment
          title="SME"
          count={sme.count}
          avg={sme.avg}
          median={sme.median}
          isSme
        />
      </div>
    </section>
  );
}

function Segment({
  title,
  count,
  avg,
  median,
  isSme = false,
}: {
  title: string;
  count: number;
  avg: number | null;
  median: number | null;
  isSme?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        isSme
          ? 'border-destructive/30 bg-destructive-bg/30'
          : 'border-gold/30 bg-gold-bg/30'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-ink">{title}</p>
          {isSme && (
            <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-destructive-bg text-destructive border border-destructive/40">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-destructive" />
              SME IPO
            </span>
          )}
        </div>
        <p className="text-xs text-ink3 font-medium">
          {count} listed
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-[11px] text-ink3 font-medium uppercase tracking-wide mb-1">
            Avg Listing Gain
          </p>
          <p className={`text-2xl font-extrabold ${toneFor(avg)}`}>
            {fmtPct(avg)}
          </p>
        </div>
        <div className="rounded-lg bg-card border border-border p-3 text-center">
          <p className="text-[11px] text-ink3 font-medium uppercase tracking-wide mb-1">
            Median Listing Gain
          </p>
          <p className={`text-2xl font-extrabold ${toneFor(median)}`}>
            {fmtPct(median)}
          </p>
        </div>
      </div>
    </div>
  );
}
