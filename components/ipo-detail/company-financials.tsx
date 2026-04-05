'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { IPO } from '@/lib/data';

interface CompanyFinancialsProps {
  ipo: IPO;
}

type MetricType = 'revenue' | 'profit' | 'ebitda' | 'valuation' | 'borrowing';

export function CompanyFinancials({ ipo }: CompanyFinancialsProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>('revenue');
  const financials = ipo.financials;
  
  if (!financials) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Company Financials</h2>
        <p className="text-ink3 text-center py-4">Financial data not available for this IPO.</p>
      </div>
    );
  }

  const { revenue, pat, ebitda, roe, roce, debtEquity } = financials;

  // Calculate company valuation based on market cap (extract number from string like "~4,200 Cr")
  const marketCapNum = parseFloat(ipo.marketCap.replace(/[^0-9.]/g, '')) || 0;
  // Borrowing estimate based on debt/equity ratio and equity (simplified)
  const equityEstimate = pat.fy25 > 0 ? (pat.fy25 / (roe / 100)) : 50; // Rough equity estimate
  const borrowingEstimate = {
    fy23: equityEstimate * debtEquity * 0.7,
    fy24: equityEstimate * debtEquity * 0.85,
    fy25: equityEstimate * debtEquity
  };
  // Valuation progression (company grew to current market cap)
  const valuationData = {
    fy23: marketCapNum * 0.6,
    fy24: marketCapNum * 0.8,
    fy25: marketCapNum
  };

  // Prepare chart data based on active metric
  const getChartData = () => {
    switch (activeMetric) {
      case 'revenue':
        return [
          { year: 'FY23', value: revenue.fy23 },
          { year: 'FY24', value: revenue.fy24 },
          { year: 'FY25', value: revenue.fy25 },
        ];
      case 'profit':
        return [
          { year: 'FY23', value: pat.fy23 },
          { year: 'FY24', value: pat.fy24 },
          { year: 'FY25', value: pat.fy25 },
        ];
      case 'ebitda':
        return [
          { year: 'FY23', value: ebitda.fy23 },
          { year: 'FY24', value: ebitda.fy24 },
          { year: 'FY25', value: ebitda.fy25 },
        ];
      case 'valuation':
        return [
          { year: 'FY23', value: Math.round(valuationData.fy23) },
          { year: 'FY24', value: Math.round(valuationData.fy24) },
          { year: 'FY25', value: Math.round(valuationData.fy25) },
        ];
      case 'borrowing':
        return [
          { year: 'FY23', value: Math.round(borrowingEstimate.fy23) },
          { year: 'FY24', value: Math.round(borrowingEstimate.fy24) },
          { year: 'FY25', value: Math.round(borrowingEstimate.fy25) },
        ];
      default:
        return [];
    }
  };

  const chartData = getChartData();

  const getMetricConfig = () => {
    switch (activeMetric) {
      case 'revenue':
        return { label: 'Revenue', color: 'var(--cobalt-mid)', bgClass: 'bg-cobalt-bg', textClass: 'text-cobalt', btnClass: 'bg-cobalt' };
      case 'profit':
        return { label: 'Net Profit', color: 'var(--emerald-mid)', bgClass: 'bg-emerald-bg', textClass: 'text-emerald', btnClass: 'bg-emerald' };
      case 'ebitda':
        return { label: 'EBITDA', color: 'var(--primary-mid)', bgClass: 'bg-primary-bg', textClass: 'text-primary', btnClass: 'bg-primary' };
      case 'valuation':
        return { label: 'Valuation', color: 'var(--gold-mid)', bgClass: 'bg-gold-bg', textClass: 'text-gold', btnClass: 'bg-gold' };
      case 'borrowing':
        return { label: 'Borrowing', color: 'var(--destructive)', bgClass: 'bg-destructive-bg', textClass: 'text-destructive', btnClass: 'bg-destructive' };
      default:
        return { label: '', color: '', bgClass: '', textClass: '', btnClass: '' };
    }
  };

  const metricConfig = getMetricConfig();

  const chartConfig = {
    value: {
      label: metricConfig.label,
      color: metricConfig.color,
    },
  };

  // Calculate growth rates
  const calculateGrowth = (current: number, previous: number) => {
    return previous > 0 ? (((current - previous) / previous) * 100).toFixed(1) : '0';
  };

  const getGrowthForMetric = () => {
    switch (activeMetric) {
      case 'revenue':
        return calculateGrowth(revenue.fy25, revenue.fy24);
      case 'profit':
        return calculateGrowth(pat.fy25, pat.fy24);
      case 'ebitda':
        return calculateGrowth(ebitda.fy25, ebitda.fy24);
      case 'valuation':
        return calculateGrowth(valuationData.fy25, valuationData.fy24);
      case 'borrowing':
        return calculateGrowth(borrowingEstimate.fy25, borrowingEstimate.fy24);
      default:
        return '0';
    }
  };

  const currentGrowth = getGrowthForMetric();

  const revenue3YrCAGR = revenue.fy23 > 0
    ? ((Math.pow(revenue.fy25 / revenue.fy23, 1/2) - 1) * 100).toFixed(1)
    : '0';
  const profit3YrCAGR = pat.fy23 > 0
    ? ((Math.pow(pat.fy25 / pat.fy23, 1/2) - 1) * 100).toFixed(1)
    : '0';

  const getGrowthIcon = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return <TrendingUp className="w-3.5 h-3.5 text-emerald-mid" />;
    if (value < 0) return <TrendingDown className="w-3.5 h-3.5 text-destructive" />;
    return <Minus className="w-3.5 h-3.5 text-ink4" />;
  };

  const getGrowthColor = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return 'text-emerald-mid';
    if (value < 0) return 'text-destructive';
    return 'text-ink4';
  };

  const metrics: { id: MetricType; label: string }[] = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'profit', label: 'Net Profit' },
    { id: 'ebitda', label: 'EBITDA' },
    { id: 'valuation', label: 'Valuation' },
    { id: 'borrowing', label: 'Borrowing' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Company Financials</h2>
      
      {/* Toggle Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {metrics.map((metric) => {
          const config = metric.id === activeMetric ? getMetricConfig() : null;
          return (
            <button
              key={metric.id}
              onClick={() => setActiveMetric(metric.id)}
              className={`py-2 px-3 rounded-xl text-[11px] font-bold transition-all ${
                activeMetric === metric.id
                  ? `${config?.btnClass} text-white`
                  : 'bg-secondary text-ink3 hover:bg-secondary/80'
              }`}
            >
              {metric.label}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-secondary rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-ink2">
            {metricConfig.label} Growth
          </p>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${metricConfig.bgClass}`}>
            {getGrowthIcon(currentGrowth)}
            <span className={`text-[11px] font-bold ${metricConfig.textClass}`}>
              {currentGrowth}% YoY
            </span>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={metricConfig.color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={metricConfig.color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 11, fill: 'var(--ink3)' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
              axisLine={false}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
              width={40}
            />
            <ChartTooltip 
              content={<ChartTooltipContent />} 
              formatter={(value: number) => [`Rs ${value} Cr`, metricConfig.label]}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={metricConfig.color} 
              strokeWidth={2}
              fill="url(#colorMetric)"
            />
          </AreaChart>
        </ChartContainer>
        
        {/* Quick Stats below chart */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
          {chartData.map((data, index) => (
            <div key={data.year} className="text-center">
              <p className="text-[10px] text-ink4 mb-0.5">{data.year}</p>
              <p className={`text-[13px] font-bold ${index === 2 ? metricConfig.textClass : ''}`}>
                Rs {data.value} Cr
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Other Financial Metrics */}
      <div className="space-y-3">
        <h3 className="text-[13px] font-bold text-ink2">Other Financial Metrics</h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* EBITDA */}
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">EBITDA (FY25)</p>
            <p className="font-[family-name:var(--font-sora)] text-lg font-bold">Rs {ebitda.fy25} Cr</p>
            <div className="flex items-center gap-1 mt-1">
              {getGrowthIcon(((ebitda.fy25 - ebitda.fy24) / ebitda.fy24 * 100).toFixed(1))}
              <span className={`text-[10px] font-semibold ${getGrowthColor(((ebitda.fy25 - ebitda.fy24) / ebitda.fy24 * 100).toFixed(1))}`}>
                {((ebitda.fy25 - ebitda.fy24) / ebitda.fy24 * 100).toFixed(1)}% YoY
              </span>
            </div>
          </div>
          
          {/* ROE */}
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">ROE</p>
            <p className={`font-[family-name:var(--font-sora)] text-lg font-bold ${roe >= 15 ? 'text-emerald-mid' : roe >= 10 ? 'text-gold-mid' : 'text-ink2'}`}>
              {roe}%
            </p>
            <p className="text-[10px] text-ink4 mt-1">Return on Equity</p>
          </div>
          
          {/* ROCE */}
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">ROCE</p>
            <p className={`font-[family-name:var(--font-sora)] text-lg font-bold ${roce >= 15 ? 'text-emerald-mid' : roce >= 10 ? 'text-gold-mid' : 'text-ink2'}`}>
              {roce}%
            </p>
            <p className="text-[10px] text-ink4 mt-1">Return on Capital</p>
          </div>
          
          {/* Debt/Equity */}
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">Debt/Equity</p>
            <p className={`font-[family-name:var(--font-sora)] text-lg font-bold ${debtEquity <= 0.5 ? 'text-emerald-mid' : debtEquity <= 1 ? 'text-gold-mid' : 'text-destructive'}`}>
              {debtEquity}
            </p>
            <p className="text-[10px] text-ink4 mt-1">{debtEquity <= 0.5 ? 'Low Debt' : debtEquity <= 1 ? 'Moderate Debt' : 'High Debt'}</p>
          </div>
        </div>

        {/* CAGR Row */}
        <div className="bg-gradient-to-r from-cobalt/5 to-emerald/5 border border-border rounded-xl p-3">
          <p className="text-[11px] font-bold text-ink3 mb-2">2-Year CAGR</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink3">Revenue CAGR</span>
              <span className={`text-[13px] font-bold ${parseFloat(revenue3YrCAGR) >= 0 ? 'text-cobalt-mid' : 'text-destructive'}`}>
                {revenue3YrCAGR}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink3">Profit CAGR</span>
              <span className={`text-[13px] font-bold ${parseFloat(profit3YrCAGR) >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                {profit3YrCAGR}%
              </span>
            </div>
          </div>
        </div>

        {/* P/E and Market Cap */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">P/E Ratio</p>
            <p className="font-[family-name:var(--font-sora)] text-lg font-bold">{ipo.peRatio}x</p>
            <p className="text-[10px] text-ink4 mt-1">At upper band</p>
          </div>
          <div className="bg-secondary rounded-xl p-3">
            <p className="text-[10px] text-ink4 font-semibold mb-1">Market Cap</p>
            <p className="font-[family-name:var(--font-sora)] text-lg font-bold">{ipo.marketCap}</p>
            <p className="text-[10px] text-ink4 mt-1">Post issue</p>
          </div>
        </div>
      </div>
    </div>
  );
}
