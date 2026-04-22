'use client';

import { useMemo, useState } from 'react';
import { LayoutGrid, TrendingUp } from 'lucide-react';
import type { ListedIPO } from '@/lib/data';

type Mode = 'mainboard' | 'sme';

interface Props {
  // Full listed-IPO dataset. Filtering by year + exchange happens in this
  // client component so the tabs switch instantly without a round trip.
  listed: ListedIPO[];
  // Years to offer in the year dropdown, sorted newest first.
  years: string[];
  // IPOs that are currently listed but "open" (trading below / above
  // issue price on their listing day) - admin-populated. Empty when no
  // listings happened today.
  openToday: { listedAboveIssue: number; listedBelowIssue: number };
}

// Tabs + year chip + 6 stat cards matching the provided design reference.
// Stats are computed from the listed IPOs filtered by year & exchange type.
export function SubscriptionStats({ listed, years, openToday }: Props) {
  const [mode, setMode] = useState<Mode>('mainboard');
  const [year, setYear] = useState<string>(years[0] ?? String(new Date().getFullYear()));

  const filtered = useMemo(() => {
    return listed.filter((ipo) => {
      if (ipo.year !== year) return false;
      const isSme = ipo.exchange === 'BSE SME' || ipo.exchange === 'NSE SME';
      return mode === 'sme' ? isSme : !isSme;
    });
  }, [listed, year, mode]);

  const stats = useMemo(() => {
    const total = filtered.length;
    // Avg subscription (x). `subTimes` is already a multiple (e.g. 44.9 ->
    // 44.9x). Avg of nothing is 0 so downstream formatters behave.
    const avgSub =
      total > 0
        ? filtered.reduce((s, i) => s + (i.subTimes ?? 0), 0) / total
        : 0;
    const gains = filtered.map((i) => i.gainPct ?? 0);
    const avgGain = total > 0 ? gains.reduce((s, g) => s + g, 0) / total : 0;
    const sorted = [...gains].sort((a, b) => a - b);
    const median =
      total === 0
        ? 0
        : total % 2 === 1
        ? sorted[(total - 1) / 2]
        : (sorted[total / 2 - 1] + sorted[total / 2]) / 2;

    return {
      total,
      avgSub,
      avgGain,
      medianGain: median,
    };
  }, [filtered]);

  // Consistent number formatting: whole numbers render without decimals,
  // so e.g. 44.9x subscription keeps one decimal but 0% stays "+0%".
  const fmtPct = (n: number) =>
    `${n >= 0 ? '+' : ''}${Number.isInteger(n) ? n : n.toFixed(1)}%`;
  const fmtSub = (n: number) =>
    `${Number.isInteger(n) ? n : n.toFixed(1)}x`;

  return (
    <section className="bg-card rounded-2xl border border-border p-4 md:p-5">
      {/* Controls row */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        {/* Mainboard / SME toggle */}
        <div className="inline-flex items-center bg-secondary rounded-lg p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('mainboard')}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold py-1.5 px-3 rounded-md transition-all ${
              mode === 'mainboard'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-ink3 hover:text-foreground'
            }`}
            aria-pressed={mode === 'mainboard'}
          >
            <LayoutGrid className="w-4 h-4" />
            Mainboard
          </button>
          <button
            type="button"
            onClick={() => setMode('sme')}
            className={`inline-flex items-center gap-1.5 text-sm font-semibold py-1.5 px-3 rounded-md transition-all ${
              mode === 'sme'
                ? 'bg-primary text-white shadow-sm'
                : 'text-ink3 hover:text-foreground'
            }`}
            aria-pressed={mode === 'sme'}
          >
            <TrendingUp className="w-4 h-4" />
            SME
          </button>
        </div>

        {/* Year selector - uses <select> for zero-dep accessibility. */}
        <div className="inline-flex items-center gap-2">
          <label htmlFor="sub-stats-year" className="sr-only">
            Year
          </label>
          <select
            id="sub-stats-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="text-xs font-semibold py-1.5 px-3 rounded-lg bg-secondary text-ink2 border border-border focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y} Stats
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          value={String(stats.total)}
          label={`${mode === 'sme' ? 'SME' : 'Mainboard'} Listed`}
          tone="cobalt"
        />
        <StatCard
          value={stats.total === 0 ? '0x' : fmtSub(stats.avgSub)}
          label="Avg Subscription"
          tone="gold"
        />
        <StatCard
          value={fmtPct(stats.avgGain)}
          label="Avg Listing Gains"
          tone={stats.avgGain >= 0 ? 'emerald' : 'destructive'}
        />
        <StatCard
          value={fmtPct(stats.medianGain)}
          label="Median Listing Gains"
          tone={stats.medianGain >= 0 ? 'emerald' : 'destructive'}
        />
        <StatCard
          value={String(openToday.listedAboveIssue)}
          label="IPOs Open in Profit"
          tone="emerald"
        />
        <StatCard
          value={String(openToday.listedBelowIssue)}
          label="IPOs Open in Loss"
          tone="destructive"
        />
      </div>
    </section>
  );
}

type Tone = 'cobalt' | 'gold' | 'emerald' | 'destructive';

function StatCard({
  value,
  label,
  tone,
}: {
  value: string;
  label: string;
  tone: Tone;
}) {
  const toneClass: Record<Tone, string> = {
    cobalt: 'text-cobalt',
    gold: 'text-gold',
    emerald: 'text-emerald',
    destructive: 'text-destructive',
  };
  return (
    <div className="bg-secondary rounded-xl p-4 text-center">
      <p className={`text-2xl font-extrabold ${toneClass[tone]} mb-1`}>
        {value}
      </p>
      <p className="text-xs text-ink3 font-medium leading-tight">{label}</p>
    </div>
  );
}
