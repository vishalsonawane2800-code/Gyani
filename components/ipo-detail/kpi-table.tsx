'use client';

import { useState } from 'react';
import { Activity, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { KPIData } from '@/lib/data';
import Link from 'next/link';

interface KPITableProps {
  kpi: KPIData;
  ipoSlug: string;
  // Admin-typed overrides (e.g. "NA", "-") keyed as
  // "kpi.<metric>.<slot>" — e.g. "kpi.roe.0", "kpi.pe.post". When
  // present for a given cell, the literal string is rendered instead of
  // coercing a missing numeric value to "-" or "0".
  textOverrides?: Record<string, string>;
}

function formatPercent(value: number | undefined, override?: string): string {
  if (override) return override;
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(2)}%`;
}

function formatNumber(value: number | undefined, suffix = '', override?: string): string {
  if (override) return override;
  if (value === undefined || value === null) return '-';
  return `${value.toFixed(2)}${suffix}`;
}

function formatCurrency(value: number | undefined, override?: string): string {
  if (override) return override;
  if (value === undefined || value === null) return '-';
  return `Rs ${value.toFixed(2)} Cr.`;
}

export function KPITable({ kpi, ipoSlug, textOverrides }: KPITableProps) {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const { dated, prePost, promoters, disclaimer } = kpi;

  // Get values at index positions
  const getVal = (arr: number[] | undefined, idx: number) => arr?.[idx];
  // Resolve a "kpi.<metric>.<slot>" override if present.
  const ov = (key: string) => textOverrides?.[key];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4 text-primary-mid" />
        Key Performance Indicator (KPI)
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Table - Dated KPIs */}
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left py-2.5 px-4 font-semibold text-primary-mid">KPI</th>
                {dated.dateLabels.map((label, i) => (
                  <th key={i} className="text-right py-2.5 px-4 font-semibold text-ink2">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">ROE</td>
                <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.roe, 0), ov('kpi.roe.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.roe, 1), ov('kpi.roe.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">ROCE</td>
                <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.roce, 0), ov('kpi.roce.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.roce, 1), ov('kpi.roce.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">Debt/Equity</td>
                <td className="text-right py-2.5 px-4">{formatNumber(getVal(dated.debtEquity, 0), '', ov('kpi.debt_equity.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatNumber(getVal(dated.debtEquity, 1), '', ov('kpi.debt_equity.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">RoNW</td>
                <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.ronw, 0), ov('kpi.ronw.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.ronw, 1), ov('kpi.ronw.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">PAT Margin</td>
                <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.patMargin, 0), ov('kpi.pat_margin.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.patMargin, 1), ov('kpi.pat_margin.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">EBITDA Margin</td>
                <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.ebitdaMargin, 0), ov('kpi.ebitda_margin.0'))}</td>
                {dated.dateLabels.length > 1 && (
                  <td className="text-right py-2.5 px-4">{formatPercent(getVal(dated.ebitdaMargin, 1), ov('kpi.ebitda_margin.1'))}</td>
                )}
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">Price to Book Value</td>
                <td className="text-right py-2.5 px-4" colSpan={dated.dateLabels.length}>
                  {formatNumber(dated.priceToBook, '', ov('kpi.price_to_book.value'))}
                </td>
              </tr>
            </tbody>
          </table>
          
          {/* Peer Comparison Link */}
          <div className="px-4 py-3 border-t border-border bg-secondary/50">
            <Link 
              href={`/ipo/${ipoSlug}#peer-comparison`}
              className="text-primary-mid text-[12px] font-medium hover:underline"
            >
              Check IPO Peer Comparison here.
            </Link>
          </div>
        </div>

        {/* Right Table - Pre/Post IPO */}
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left py-2.5 px-4 font-semibold text-ink2"></th>
                <th className="text-right py-2.5 px-4 font-semibold text-ink2">Pre IPO</th>
                <th className="text-right py-2.5 px-4 font-semibold text-ink2">Post IPO</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">EPS (Rs)</td>
                <td className="text-right py-2.5 px-4">{formatNumber(prePost.eps.pre, '', ov('kpi.eps.pre'))}</td>
                <td className="text-right py-2.5 px-4">{formatNumber(prePost.eps.post, '', ov('kpi.eps.post'))}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">P/E (x)</td>
                <td className="text-right py-2.5 px-4">{formatNumber(prePost.pe.pre, '', ov('kpi.pe.pre'))}</td>
                <td className="text-right py-2.5 px-4">{formatNumber(prePost.pe.post, '', ov('kpi.pe.post'))}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">Promoter Holding</td>
                <td className="text-right py-2.5 px-4">{formatPercent(prePost.promoterHolding.pre, ov('kpi.promoter_holding.pre'))}</td>
                <td className="text-right py-2.5 px-4">{formatPercent(prePost.promoterHolding.post, ov('kpi.promoter_holding.post'))}</td>
              </tr>
              <tr className="border-t border-border">
                <td className="py-2.5 px-4 text-primary-mid font-medium">Market Cap</td>
                <td className="text-right py-2.5 px-4" colSpan={2}>
                  {formatCurrency(prePost.marketCap, ov('kpi.market_cap.value'))}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Promoters Info */}
          {promoters && (
            <div className="px-4 py-3 border-t border-border">
              <p className="text-[12px] text-ink2 leading-relaxed">{promoters}</p>
            </div>
          )}

          {/* Disclaimer */}
          {disclaimer && (
            <div className="px-4 py-3 border-t border-border bg-secondary/50">
              <button
                onClick={() => setShowDisclaimer(!showDisclaimer)}
                className="flex items-center gap-2 text-[12px] font-bold text-ink2"
              >
                Disclaimer
                <span className="text-primary-mid flex items-center gap-0.5">
                  + Show {showDisclaimer ? 'less' : 'more'}
                  {showDisclaimer ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </button>
              {showDisclaimer && (
                <p className="text-[11px] text-ink3 mt-2 leading-relaxed">{disclaimer}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
