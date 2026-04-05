'use client';

import { useState } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';

interface IPOTabsProps {
  ipo: IPO;
}

type TabType = 'overview' | 'financials' | 'gmp' | 'subscription';

export function IPOTabs({ ipo }: IPOTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'financials', label: 'Financials' },
    { id: 'gmp', label: 'GMP History' },
    { id: 'subscription', label: 'Subscription' },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Hidden anchors for scroll navigation */}
      <div id="gmp-history-section" className="scroll-mt-20" />
      <div id="subscription-section" className="scroll-mt-20" />
      
      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-[13px] font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'text-primary-mid border-primary-mid bg-primary-bg/30'
                : 'text-ink3 border-transparent hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab ipo={ipo} />}
        {activeTab === 'financials' && <FinancialsTab ipo={ipo} />}
        {activeTab === 'gmp' && <GMPHistoryTab ipo={ipo} />}
        {activeTab === 'subscription' && <SubscriptionTab ipo={ipo} />}
      </div>
    </div>
  );
}

function OverviewTab({ ipo }: { ipo: IPO }) {
  const minInvestment = ipo.priceMax * ipo.lotSize;
  
  const ipoDetails = [
    ['Open Date', formatDate(ipo.openDate)],
    ['Close Date', formatDate(ipo.closeDate)],
    ['Allotment Date', formatDate(ipo.allotmentDate)],
    ['Listing Date', formatDate(ipo.listDate)],
    ['Issue Type', 'Book Build Issue'],
    ['Issue Size', `Rs ${ipo.issueSize}`],
    ['Fresh Issue', ipo.freshIssue],
    ['OFS', ipo.ofs],
    ['Face Value', 'Rs 10 per share'],
    ['Price Band', `Rs ${ipo.priceMin} - ${ipo.priceMax}`],
    ['Lot Size', `${ipo.lotSize.toLocaleString()} shares`],
    ['Min Investment (Retail)', `Rs ${minInvestment >= 100000 ? `${(minInvestment / 100000).toFixed(2)}L` : minInvestment.toLocaleString()}`],
    ['Listing Exchange', ipo.exchange],
  ];

  const companyInfo = [
    ['Company Name', `${ipo.name} Ltd`],
    ['Industry', ipo.sector],
    ['Registrar', ipo.registrar],
    ['Lead Manager', ipo.leadManager],
    ['Market Cap (Upper)', ipo.marketCap],
    ['P/E (Upper Band)', ipo.peRatio > 0 ? `${ipo.peRatio}x` : 'N/A'],
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mb-4">IPO Details</h3>
        <table className="w-full text-[13px]">
          <tbody>
            {ipoDetails.map(([label, value], index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className="py-2.5 text-ink3">{label}</td>
                <td className="py-2.5 font-medium text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div>
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mb-4">Company Information</h3>
        <table className="w-full text-[13px]">
          <tbody>
            {companyInfo.map(([label, value], index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className="py-2.5 text-ink3">{label}</td>
                <td className="py-2.5 font-medium text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mt-6 mb-3">About the Company</h3>
        <p className="text-[13px] text-ink2 leading-relaxed">
          {ipo.aboutCompany}
        </p>
      </div>
    </div>
  );
}

function FinancialsTab({ ipo }: { ipo: IPO }) {
  if (!ipo.financials) {
    return (
      <p className="text-ink3 text-center py-8">Financial data not available for this IPO.</p>
    );
  }

  const { revenue, pat, ebitda, roe, roce, debtEquity } = ipo.financials;

  return (
    <div>
      <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mb-4">Profit & Loss (Rs Cr)</h3>
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
              <td className="py-2.5 px-3">Revenue</td>
              <td className="py-2.5 px-3 text-right">Rs {revenue.fy23}</td>
              <td className="py-2.5 px-3 text-right">Rs {revenue.fy24}</td>
              <td className="py-2.5 px-3 text-right font-medium text-emerald-mid">Rs {revenue.fy25}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2.5 px-3">EBITDA</td>
              <td className="py-2.5 px-3 text-right">Rs {ebitda.fy23}</td>
              <td className="py-2.5 px-3 text-right">Rs {ebitda.fy24}</td>
              <td className="py-2.5 px-3 text-right font-medium text-emerald-mid">Rs {ebitda.fy25}</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2.5 px-3">PAT (Net Profit)</td>
              <td className="py-2.5 px-3 text-right">Rs {pat.fy23}</td>
              <td className="py-2.5 px-3 text-right">Rs {pat.fy24}</td>
              <td className="py-2.5 px-3 text-right font-medium text-emerald-mid">Rs {pat.fy25}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mt-6 mb-4">Key Valuation Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-gold-mid">{ipo.peRatio}x</div>
          <div className="text-[11px] text-ink3 mt-1">P/E (Upper Band)</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-foreground">{(ipo.issueSizeCr / revenue.fy25).toFixed(1)}x</div>
          <div className="text-[11px] text-ink3 mt-1">P/Sales</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-emerald-mid">{roe}%</div>
          <div className="text-[11px] text-ink3 mt-1">ROE (FY25)</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-emerald-mid">{debtEquity}</div>
          <div className="text-[11px] text-ink3 mt-1">Debt/Equity</div>
        </div>
      </div>
    </div>
  );
}

function GMPHistoryTab({ ipo }: { ipo: IPO }) {
  // Use actual GMP history data if available, otherwise generate mock
  const gmpHistory = ipo.gmpHistory || [
    { date: 'Today', gmp: ipo.gmp, gmpPercent: ipo.gmpPercent, source: 'IPOWatch' },
  ];

  // Prepare data for chart (reverse to show chronological order)
  const chartData = [...gmpHistory].reverse().map((entry, index) => ({
    name: entry.date.includes('2026') ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : entry.date,
    gmp: entry.gmp,
    percent: entry.gmpPercent,
    source: entry.source,
  }));

  const chartConfig = {
    gmp: {
      label: 'GMP (Rs)',
      color: 'var(--emerald-mid)',
    },
    percent: {
      label: 'GMP %',
      color: 'var(--primary-mid)',
    },
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold">GMP Trend</h3>
        <span className="text-[12px] font-bold px-3 py-1 rounded-lg bg-emerald-bg text-emerald">
          Latest: +Rs {ipo.gmp} (+{ipo.gmpPercent}%)
        </span>
      </div>

      {/* GMP Chart */}
      <div className="bg-secondary rounded-xl p-4 mb-4">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gmpGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--emerald-mid)" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="var(--emerald-mid)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
              axisLine={{ stroke: 'var(--border)' }}
              tickLine={false}
              tickFormatter={(value) => `Rs ${value}`}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area 
              type="monotone" 
              dataKey="gmp" 
              stroke="var(--emerald-mid)" 
              strokeWidth={2}
              fill="url(#gmpGradient)" 
            />
          </AreaChart>
        </ChartContainer>
      </div>

      {/* GMP History Table */}
      <h4 className="font-semibold text-[13px] mb-3">Historical Data</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2.5 px-3 font-bold text-ink3">Date</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">GMP (Rs)</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Premium %</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Est. Listing (Rs)</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Source</th>
            </tr>
          </thead>
          <tbody>
            {gmpHistory.map((entry, index) => {
              const estListing = ipo.priceMax + entry.gmp;
              return (
                <tr key={index} className="border-b border-border last:border-b-0">
                  <td className={`py-2.5 px-3 ${index === 0 ? 'font-bold text-emerald-mid' : ''}`}>
                    {entry.date.includes('2026') 
                      ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : entry.date
                    }
                    {index === 0 && ' (Latest)'}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-mid">+Rs {entry.gmp}</td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-mid">+{entry.gmpPercent.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-medium">Rs {estListing.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right text-ink3">{entry.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-ink4 mt-4">
        * GMP (Grey Market Premium) is scraped from multiple sources for accuracy. Data is updated multiple times daily.
      </p>
    </div>
  );
}

function SubscriptionTab({ ipo }: { ipo: IPO }) {
  // Use actual subscription history if available
  const subHistory = ipo.subscriptionHistory || [];

  // Get last updated time from subscription history or use current time
  const lastUpdated = subHistory.length > 0 
    ? `${new Date(subHistory[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${subHistory[0].time}`
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Prepare data for chart
  const chartData = [...subHistory].reverse().map((entry) => ({
    name: entry.date.includes('2026') 
      ? `${new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${entry.time}`
      : `Day ${subHistory.indexOf(entry) + 1}`,
    Retail: entry.retail,
    NII: entry.nii,
    QIB: entry.qib,
    Total: entry.total,
  }));

  const chartConfig = {
    Retail: {
      label: 'Retail',
      color: 'var(--cobalt-mid)',
    },
    NII: {
      label: 'NII (HNI)',
      color: 'var(--primary-mid)',
    },
    QIB: {
      label: 'QIB',
      color: 'var(--emerald-mid)',
    },
    Total: {
      label: 'Total',
      color: 'var(--gold-mid)',
    },
  };

  return (
    <div>
      {/* Category Breakdown */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold">
          Subscription by Category {ipo.subscription.isFinal ? '(Final)' : '(Live)'}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-ink3 bg-secondary px-2.5 py-1 rounded-lg">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last Updated: <span className="font-semibold text-foreground">{lastUpdated}</span></span>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className={`font-[family-name:var(--font-sora)] text-xl font-extrabold ${ipo.subscription.total > 1 ? 'text-emerald-mid' : 'text-gold-mid'}`}>
            {ipo.subscription.total > 0 ? `${ipo.subscription.total}x` : '-'}
          </div>
          <div className="text-[11px] text-ink3 mt-1">Total</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-cobalt-mid">
            {ipo.subscription.retail || '-'}
          </div>
          <div className="text-[11px] text-ink3 mt-1">Retail</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-primary-mid">
            {ipo.subscription.nii || '-'}
          </div>
          <div className="text-[11px] text-ink3 mt-1">NII (HNI)</div>
        </div>
        <div className="bg-secondary rounded-xl p-4 text-center">
          <div className="font-[family-name:var(--font-sora)] text-xl font-extrabold text-emerald-mid">
            {ipo.subscription.qib || '-'}
          </div>
          <div className="text-[11px] text-ink3 mt-1">QIB</div>
        </div>
      </div>

      {/* Subscription Chart */}
      {subHistory.length > 0 && (
        <>
          <h4 className="font-semibold text-[13px] mb-3">Subscription Trend</h4>
          <div className="bg-secondary rounded-xl p-4 mb-4">
            <ChartContainer config={chartConfig} className="h-[200px] w-full">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: 'var(--ink3)' }} 
                  axisLine={{ stroke: 'var(--border)' }}
                  tickLine={false}
                  tickFormatter={(value) => `${value}x`}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend 
                  wrapperStyle={{ fontSize: '11px' }}
                  iconSize={8}
                />
                <Bar dataKey="Retail" fill="var(--cobalt-mid)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="NII" fill="var(--primary-mid)" radius={[2, 2, 0, 0]} />
                <Bar dataKey="QIB" fill="var(--emerald-mid)" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Day-wise Table */}
          <h4 className="font-semibold text-[13px] mb-3">Day-wise Subscription</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left py-2.5 px-3 font-bold text-ink3">Date</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">Time</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">Retail</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">NII</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">QIB</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">Total</th>
                </tr>
              </thead>
              <tbody>
                {subHistory.map((entry, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className={`py-2.5 px-3 ${index === 0 ? 'font-bold' : ''}`}>
                      {entry.date.includes('2026') 
                        ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : entry.date
                      }
                      {index === 0 && !ipo.subscription.isFinal && ' (Live)'}
                      {index === 0 && ipo.subscription.isFinal && ' (Final)'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-ink3">{entry.time}</td>
                    <td className="py-2.5 px-3 text-right text-cobalt-mid font-medium">{entry.retail}x</td>
                    <td className="py-2.5 px-3 text-right text-primary-mid font-medium">{entry.nii}x</td>
                    <td className="py-2.5 px-3 text-right text-emerald-mid font-medium">{entry.qib}x</td>
                    <td className="py-2.5 px-3 text-right font-bold">{entry.total}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {subHistory.length === 0 && (
        <p className="text-ink3 text-center py-8">Subscription data will be available once the IPO opens.</p>
      )}

      <p className="text-[11px] text-ink4 mt-4">
        * Subscription data is scraped from BSE/NSE and updated multiple times during IPO period.
      </p>
    </div>
  );
}
