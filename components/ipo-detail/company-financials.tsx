'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { IPO } from '@/lib/data';

interface CompanyFinancialsProps {
  ipo: IPO;
}

export function CompanyFinancials({ ipo }: CompanyFinancialsProps) {
  const financials = ipo.financials;
  
  if (!financials) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Company Financials</h2>
        <p className="text-ink3 text-center py-4">Financial data not available for this IPO.</p>
      </div>
    );
  }

  const { revenue, pat } = financials;

  // Prepare chart data
  const chartData = [
    { year: 'FY23', Revenue: revenue.fy23, Profit: pat.fy23 },
    { year: 'FY24', Revenue: revenue.fy24, Profit: pat.fy24 },
    { year: 'FY25', Revenue: revenue.fy25, Profit: pat.fy25 },
  ];

  const chartConfig = {
    Revenue: {
      label: 'Revenue',
      color: 'var(--cobalt-mid)',
    },
    Profit: {
      label: 'Net Profit',
      color: 'var(--emerald-mid)',
    },
  };

  // Calculate growth rates
  const revenueGrowth = revenue.fy24 > 0 
    ? (((revenue.fy25 - revenue.fy24) / revenue.fy24) * 100).toFixed(1) 
    : '0';
  const profitGrowth = pat.fy24 > 0 
    ? (((pat.fy25 - pat.fy24) / pat.fy24) * 100).toFixed(1) 
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
      <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Company Financials (3 Years)</h2>
      
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4">Revenue (FY25)</p>
            <div className={`flex items-center gap-1 ${getGrowthColor(revenueGrowth)}`}>
              {getGrowthIcon(revenueGrowth)}
              <span className="text-[11px] font-semibold">{revenueGrowth}%</span>
            </div>
          </div>
          <p className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-cobalt-mid">
            Rs {revenue.fy25} Cr
          </p>
          <p className="text-[10px] text-ink3 mt-1">YoY Growth</p>
        </div>
        
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4">Net Profit (FY25)</p>
            <div className={`flex items-center gap-1 ${getGrowthColor(profitGrowth)}`}>
              {getGrowthIcon(profitGrowth)}
              <span className="text-[11px] font-semibold">{profitGrowth}%</span>
            </div>
          </div>
          <p className={`font-[family-name:var(--font-sora)] text-xl font-extrabold ${pat.fy25 >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            Rs {pat.fy25} Cr
          </p>
          <p className="text-[10px] text-ink3 mt-1">YoY Growth</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-secondary rounded-xl p-4 mb-4">
        <p className="text-[11px] font-semibold text-ink3 mb-3">Revenue vs Net Profit (Rs Cr)</p>
        <ChartContainer config={chartConfig} className="h-[180px] w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="year" 
              tick={{ fontSize: 11, fill: 'var(--ink3)' }} 
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              tickFormatter={(value) => `${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="Revenue" fill="var(--cobalt-mid)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Profit" fill="var(--emerald-mid)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2.5 px-3 font-bold text-ink3">Metric</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">FY23</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">FY24</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">FY25</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2.5 px-3 font-medium">Revenue</td>
              <td className="py-2.5 px-3 text-right">Rs {revenue.fy23} Cr</td>
              <td className="py-2.5 px-3 text-right">Rs {revenue.fy24} Cr</td>
              <td className="py-2.5 px-3 text-right font-semibold text-cobalt-mid">Rs {revenue.fy25} Cr</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 font-medium">Net Profit (PAT)</td>
              <td className="py-2.5 px-3 text-right">Rs {pat.fy23} Cr</td>
              <td className="py-2.5 px-3 text-right">Rs {pat.fy24} Cr</td>
              <td className={`py-2.5 px-3 text-right font-semibold ${pat.fy25 >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                Rs {pat.fy25} Cr
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
