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
            className={`px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
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
  const priceMax = ipo.priceMax ?? 0;
  const priceMin = ipo.priceMin ?? 0;
  const lotSize = ipo.lotSize ?? 1;
  const peRatio = ipo.peRatio ?? 0;
  const minInvestment = priceMax * lotSize;
  
  const ipoDetails = [
    ['Open Date', formatDate(ipo.openDate)],
    ['Close Date', formatDate(ipo.closeDate)],
    ['Allotment Date', formatDate(ipo.allotmentDate)],
    ['Listing Date', formatDate(ipo.listDate)],
    ['Issue Type', 'Book Build Issue'],
    ['Issue Size', `Rs ${ipo.issueSize ?? 'N/A'}`],
    ['Fresh Issue', ipo.freshIssue ?? 'N/A'],
    ['OFS', ipo.ofs ?? 'N/A'],
    ['Face Value', 'Rs 10 per share'],
    ['Price Band', `Rs ${priceMin} - ${priceMax}`],
    ['Lot Size', `${lotSize.toLocaleString()} shares`],
    ['Min Investment (Retail)', `Rs ${minInvestment >= 100000 ? `${(minInvestment / 100000).toFixed(2)}L` : minInvestment.toLocaleString()}`],
    ['Listing Exchange', ipo.exchange ?? 'N/A'],
  ];

  const companyInfo = [
    ['Company Name', `${ipo.name} Ltd`],
    ['Industry', ipo.sector ?? 'N/A'],
    ['Registrar', ipo.registrar ?? 'N/A'],
    ['Lead Manager', ipo.leadManager ?? 'N/A'],
    ['Market Cap (Upper)', ipo.marketCap ?? 'N/A'],
    ['P/E (Upper Band)', peRatio > 0 ? `${peRatio}x` : 'N/A'],
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <h3 className="text-base font-bold mb-4">IPO Details</h3>
        <table className="w-full text-sm">
          <tbody>
            {ipoDetails.map(([label, value], index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className="py-2 text-ink3">{label}</td>
                <td className="py-2 font-medium text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div>
        <h3 className="text-base font-bold mb-4">Company Information</h3>
        <table className="w-full text-sm">
          <tbody>
            {companyInfo.map(([label, value], index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className="py-2 text-ink3">{label}</td>
                <td className="py-2 font-medium text-right">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <h3 className="text-base font-bold mt-6 mb-3">About the Company</h3>
        <p className="text-sm text-ink2 leading-relaxed">
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
      <h3 className="text-base font-bold mb-4">Profit & Loss (Rs Cr)</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2 px-3 font-bold text-ink3">Metric</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">FY23</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">FY24</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">FY25</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-border">
              <td className="py-2 px-3">Revenue</td>
              <td className="py-2 px-3 text-right">Rs {revenue.fy23} Cr</td>
              <td className="py-2 px-3 text-right">Rs {revenue.fy24} Cr</td>
              <td className="py-2 px-3 text-right font-medium text-emerald-mid">Rs {revenue.fy25} Cr</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 px-3">EBITDA</td>
              <td className="py-2 px-3 text-right">Rs {ebitda.fy23} Cr</td>
              <td className="py-2 px-3 text-right">Rs {ebitda.fy24} Cr</td>
              <td className="py-2 px-3 text-right font-medium text-emerald-mid">Rs {ebitda.fy25} Cr</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 px-3">PAT (Net Profit)</td>
              <td className="py-2 px-3 text-right">Rs {pat.fy23} Cr</td>
              <td className="py-2 px-3 text-right">Rs {pat.fy24} Cr</td>
              <td className="py-2 px-3 text-right font-medium text-emerald-mid">Rs {pat.fy25} Cr</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="text-base font-bold mt-6 mb-4">Key Valuation Metrics</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-extrabold text-gold-mid">{ipo.peRatio}x</div>
          <div className="text-xs text-ink3 mt-1">P/E (Upper Band)</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-extrabold text-foreground">{(ipo.issueSizeCr / revenue.fy25).toFixed(1)}x</div>
          <div className="text-xs text-ink3 mt-1">P/Sales</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-mid">{roe}%</div>
          <div className="text-xs text-ink3 mt-1">ROE (FY25)</div>
        </div>
        <div className="bg-secondary rounded-lg p-4 text-center">
          <div className="text-2xl font-extrabold text-emerald-mid">{debtEquity}</div>
          <div className="text-xs text-ink3 mt-1">Debt/Equity</div>
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
        <h3 className="text-base font-bold">GMP Trend</h3>
        <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-bg text-emerald">
          Latest: +Rs {ipo.gmp} (+{ipo.gmpPercent}%)
        </span>
      </div>

      {/* GMP Chart */}
      <div className="bg-secondary rounded-lg p-4 mb-4">
        <ChartContainer config={chartConfig} className="h-56 min-h-56 w-full">
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
      <h4 className="font-semibold text-sm mb-3">Historical Data</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2 px-3 font-bold text-ink3">Date</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">GMP (Rs)</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">Premium %</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">Est. Listing (Rs)</th>
              <th className="text-right py-2 px-3 font-bold text-ink3">Source</th>
            </tr>
          </thead>
          <tbody>
            {gmpHistory.map((entry, index) => {
              const estListing = ipo.priceMax + entry.gmp;
              return (
                <tr key={index} className="border-b border-border last:border-b-0">
                  <td className={`py-2 px-3 ${index === 0 ? 'font-bold text-emerald-mid' : ''}`}>
                    {entry.date.includes('2026') 
                      ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : entry.date
                    }
                    {index === 0 && ' (Latest)'}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-mid">+Rs {entry.gmp}</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-mid">+{entry.gmpPercent.toFixed(1)}%</td>
                  <td className="py-2 px-3 text-right font-medium">Rs {estListing.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right text-ink3">{entry.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-ink4 mt-4">
        * GMP (Grey Market Premium) is scraped from multiple sources for accuracy. Data is updated multiple times daily.
      </p>
    </div>
  );
}

function SubscriptionTab({ ipo }: { ipo: IPO }) {
  // Use actual subscription history if available
  const subHistory = ipo.subscriptionHistory || [];
  const subscription = ipo.subscription ?? { total: 0, retail: 0, nii: 0, qib: 0, isFinal: false, day: 0 };

  // Get last updated time from subscription history or use current time
  const lastUpdated = subHistory.length > 0 
    ? `${new Date(subHistory[0].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${subHistory[0].time}`
    : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  // Organize subscription history by day
  const dayWiseData: { [key: string]: typeof subHistory } = {};
  subHistory.forEach((entry) => {
    const day = entry.date.includes('2026') 
      ? new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
      : entry.date;
    if (!dayWiseData[day]) {
      dayWiseData[day] = [];
    }
    dayWiseData[day].push(entry);
  });

  const dayWiseEntries = Object.entries(dayWiseData).sort((a, b) => {
    const dateA = subHistory.find(e => {
      const d = e.date.includes('2026') 
        ? new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : e.date;
      return d === a[0];
    });
    const dateB = subHistory.find(e => {
      const d = e.date.includes('2026') 
        ? new Date(e.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : e.date;
      return d === b[0];
    });
    return dateB && dateA ? new Date(dateB.date).getTime() - new Date(dateA.date).getTime() : 0;
  });

  return (
    <div className="space-y-6">
      {/* Live Subscription Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            Live Subscription {subscription.isFinal ? '(Final)' : '(Live)'}
          </h3>
          <div className="flex items-center gap-2 text-xs text-ink3 bg-secondary px-3 py-2 rounded-lg">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Updated: <span className="font-semibold text-foreground">{lastUpdated}</span></span>
          </div>
        </div>

        {/* Live Subscription Table */}
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-secondary">
                <th className="text-left py-3 px-4 font-bold text-ink3">Category</th>
                <th className="text-right py-3 px-4 font-bold text-ink3">Applied</th>
                <th className="text-right py-3 px-4 font-bold text-ink3">Times</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">Retail</td>
                <td className="py-3 px-4 text-right text-cobalt-mid font-semibold">{subscription.retail || '-'}</td>
                <td className="py-3 px-4 text-right text-cobalt-mid font-bold">{subscription.retail || '-'}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">NII (HNI)</td>
                <td className="py-3 px-4 text-right text-primary-mid font-semibold">{subscription.nii || '-'}</td>
                <td className="py-3 px-4 text-right text-primary-mid font-bold">{subscription.nii || '-'}</td>
              </tr>
              <tr className="border-b border-border">
                <td className="py-3 px-4 font-medium">QIB</td>
                <td className="py-3 px-4 text-right text-emerald-mid font-semibold">{subscription.qib || '-'}</td>
                <td className="py-3 px-4 text-right text-emerald-mid font-bold">{subscription.qib || '-'}</td>
              </tr>
              <tr className="bg-secondary/50">
                <td className="py-3 px-4 font-bold">Total</td>
                <td className="py-3 px-4 text-right font-bold text-foreground">{subscription.total || '-'}</td>
                <td className="py-3 px-4 text-right font-bold text-emerald-mid">{subscription.total > 0 ? `${subscription.total}x` : '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Day-wise Subscription */}
      {subHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-4">Day-wise Subscription</h3>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {dayWiseEntries.map(([day, entries]) => {
              const latestEntry = entries[entries.length - 1];
              return (
                <div key={day} className="border border-border rounded-lg overflow-hidden">
                  <div className="bg-blue-100/50 px-4 py-3 border-b border-border">
                    <h4 className="text-sm font-bold text-foreground">{day}</h4>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-ink4 font-semibold mb-1">Subscription</div>
                        <div className="text-2xl font-bold text-emerald-mid">
                          {latestEntry.total > 0 ? `${latestEntry.total}x` : '-'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                        <div>
                          <div className="text-xs text-ink4 font-semibold mb-1">Retail</div>
                          <div className="text-sm font-bold text-cobalt-mid">{latestEntry.retail}x</div>
                        </div>
                        <div>
                          <div className="text-xs text-ink4 font-semibold mb-1">NII</div>
                          <div className="text-sm font-bold text-primary-mid">{latestEntry.nii}x</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-ink4 font-semibold mb-1">QIB</div>
                        <div className="text-sm font-bold text-emerald-mid">{latestEntry.qib}x</div>
                      </div>
                      <div className="text-xs text-ink3 pt-2 border-t border-border">{latestEntry.time}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subHistory.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
          <p className="text-ink3 font-medium mb-2">Subscription data not available</p>
          <p className="text-ink4 text-sm mb-4">
            Subscription data will appear here once the IPO opens. You can also add it manually via the admin dashboard.
          </p>
          <a 
            href="/admin/dashboard" 
            className="inline-flex items-center gap-2 text-primary font-semibold text-sm hover:underline"
          >
            Add Data Manually
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      )}

      <p className="text-xs text-ink4">
        * Subscription data is updated multiple times during the IPO period. If data is unavailable, it can be added manually through the admin dashboard.
      </p>
    </div>
  );
}
