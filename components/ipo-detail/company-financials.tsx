'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Area, AreaChart } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { IPO } from '@/lib/data';

interface CompanyFinancialsProps {
  ipo: IPO;
}

export function CompanyFinancials({ ipo }: CompanyFinancialsProps) {
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'profit'>('revenue');
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

  // Prepare chart data based on active metric
  const revenueChartData = [
    { year: 'FY23', value: revenue.fy23 },
    { year: 'FY24', value: revenue.fy24 },
    { year: 'FY25', value: revenue.fy25 },
  ];

  const profitChartData = [
    { year: 'FY23', value: pat.fy23 },
    { year: 'FY24', value: pat.fy24 },
    { year: 'FY25', value: pat.fy25 },
  ];

  const chartData = activeMetric === 'revenue' ? revenueChartData : profitChartData;

  const chartConfig = {
    value: {
      label: activeMetric === 'revenue' ? 'Revenue' : 'Net Profit',
      color: activeMetric === 'revenue' ? 'var(--cobalt-mid)' : 'var(--emerald-mid)',
    },
  };

  // Calculate growth rates
  const revenueGrowth = revenue.fy24 > 0 
    ? (((revenue.fy25 - revenue.fy24) / revenue.fy24) * 100).toFixed(1) 
    : '0';
  const profitGrowth = pat.fy24 > 0 
    ? (((pat.fy25 - pat.fy24) / pat.fy24) * 100).toFixed(1) 
    : '0';
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

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Company Financials</h2>
      
      {/* Toggle Buttons */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveMetric('revenue')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-[12px] font-bold transition-all ${
            activeMetric === 'revenue'
              ? 'bg-cobalt text-white'
              : 'bg-secondary text-ink3 hover:bg-secondary/80'
          }`}
        >
          Revenue
        </button>
        <button
          onClick={() => setActiveMetric('profit')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-[12px] font-bold transition-all ${
            activeMetric === 'profit'
              ? 'bg-emerald text-white'
              : 'bg-secondary text-ink3 hover:bg-secondary/80'
          }`}
        >
          Net Profit
        </button>
      </div>

      {/* Chart */}
      <div className="bg-secondary rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[12px] font-semibold text-ink2">
            {activeMetric === 'revenue' ? 'Revenue Growth' : 'Net Profit Growth'}
          </p>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg ${activeMetric === 'revenue' ? 'bg-cobalt-bg' : 'bg-emerald-bg'}`}>
            {getGrowthIcon(activeMetric === 'revenue' ? revenueGrowth : profitGrowth)}
            <span className={`text-[11px] font-bold ${activeMetric === 'revenue' ? 'text-cobalt' : 'text-emerald'}`}>
              {activeMetric === 'revenue' ? revenueGrowth : profitGrowth}% YoY
            </span>
          </div>
        </div>
        <ChartContainer config={chartConfig} className="h-[160px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--cobalt-mid)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--cobalt-mid)" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--emerald-mid)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--emerald-mid)" stopOpacity={0}/>
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
              formatter={(value: number) => [`Rs ${value} Cr`, activeMetric === 'revenue' ? 'Revenue' : 'Net Profit']}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke={activeMetric === 'revenue' ? 'var(--cobalt-mid)' : 'var(--emerald-mid)'} 
              strokeWidth={2}
              fill={activeMetric === 'revenue' ? 'url(#colorRevenue)' : 'url(#colorProfit)'}
            />
          </AreaChart>
        </ChartContainer>
        
        {/* Quick Stats below chart */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border/50">
          <div className="text-center">
            <p className="text-[10px] text-ink4 mb-0.5">FY23</p>
            <p className="text-[13px] font-bold">Rs {activeMetric === 'revenue' ? revenue.fy23 : pat.fy23} Cr</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-ink4 mb-0.5">FY24</p>
            <p className="text-[13px] font-bold">Rs {activeMetric === 'revenue' ? revenue.fy24 : pat.fy24} Cr</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-ink4 mb-0.5">FY25</p>
            <p className={`text-[13px] font-bold ${activeMetric === 'revenue' ? 'text-cobalt-mid' : 'text-emerald-mid'}`}>
              Rs {activeMetric === 'revenue' ? revenue.fy25 : pat.fy25} Cr
            </p>
          </div>
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
