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
  // Use actual subscription data if available
  const subscriptionLive = ipo.subscriptionLive || [];
  const subHistory = ipo.subscriptionHistory || [];
  const subscription = ipo.subscription ?? { total: 0, retail: 0, nii: 0, qib: 0, isFinal: false, day: 0 };

  // Get last updated time
  const lastUpdated = ipo.subscriptionLastUpdated 
    ? new Date(ipo.subscriptionLastUpdated).toLocaleString('en-IN', { 
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      })
    : subHistory.length > 0 
      ? `${new Date(subHistory[subHistory.length - 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} ${subHistory[subHistory.length - 1].time}`
      : null;

  // Get total subscription from live data or fallback
  const totalSub = subscriptionLive.find(s => s.category === 'total');
  const retailSub = subscriptionLive.find(s => s.category === 'retail');
  
  // Category display names
  const categoryNames: Record<string, string> = {
    anchor: 'Anchor',
    qib: 'QIB (Ex Anchor)',
    nii: 'NII',
    bnii: 'bNII (> Rs 10L)',
    snii: 'sNII (< Rs 10L)',
    retail: 'Retail',
    employee: 'Employee',
    total: 'Total **',
  };

  // Format large numbers with Indian comma notation
  const formatShares = (num: number | undefined): string => {
    if (!num) return '-';
    return num.toLocaleString('en-IN');
  };

  // Get day number text
  const getDayText = (entry: typeof subHistory[0], index: number) => {
    const dayNum = entry.dayNumber || (subHistory.length - index);
    return `(Day ${dayNum})`;
  };

  // Calculate latest day number
  const latestDay = subHistory.length > 0 ? (subHistory[subHistory.length - 1].dayNumber || subHistory.length) : 0;

  return (
    <div className="space-y-8">
      {/* Section 1: IPO Subscription Status Live */}
      <div>
        <h3 className="text-base font-bold mb-3">
          IPO Subscription Status Live
        </h3>
        
        {/* Summary text */}
        {totalSub && (
          <p className="text-sm text-ink2 mb-4">
            {ipo.name} IPO subscribed {totalSub.subscriptionTimes} times. 
            The public issue subscribed {retailSub?.subscriptionTimes || '-'} times in the retail category
            {subscriptionLive.find(s => s.category === 'qib') && 
              `, ${subscriptionLive.find(s => s.category === 'qib')?.subscriptionTimes} times in QIB (Ex Anchor)`}
            {lastUpdated && `, ${lastUpdated} (Day ${latestDay}).`}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-4 mb-4 text-xs sm:text-sm">
          <button 
            className="flex items-center gap-2 text-primary-mid hover:underline"
            onClick={() => window.location.reload()}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reload
          </button>
          <button className="flex items-center gap-2 text-primary-mid hover:underline">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Share
          </button>
        </div>

        {/* Live Subscription Table */}
        {subscriptionLive.length > 0 ? (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left py-3 px-4 font-bold text-ink3">Category</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Subscription (x)</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Shares Offered*</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Shares bid for</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Total Amt* (Rs Cr.)</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionLive.map((entry) => {
                  const isTotal = entry.category === 'total';
                  const isSubCategory = entry.category === 'bnii' || entry.category === 'snii';
                  return (
                    <tr 
                      key={entry.category} 
                      className={`border-t border-border ${isTotal ? 'bg-secondary font-semibold' : ''}`}
                    >
                      <td className={`py-3 px-4 ${isSubCategory ? 'pl-8' : ''}`}>
                        {categoryNames[entry.category] || entry.category}
                      </td>
                      <td className="py-3 px-4 text-right">{entry.subscriptionTimes || '-'}</td>
                      <td className="py-3 px-4 text-right">{formatShares(entry.sharesOffered)}</td>
                      <td className="py-3 px-4 text-right">{formatShares(entry.sharesBidFor)}</td>
                      <td className="py-3 px-4 text-right">{entry.totalAmountCr ? entry.totalAmountCr.toFixed(3) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Fallback to simple grid view if no live data
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className={`text-xl font-extrabold ${subscription.total > 1 ? 'text-emerald-mid' : 'text-gold-mid'}`}>
                {subscription.total > 0 ? `${subscription.total}x` : '-'}
              </div>
              <div className="text-xs text-ink3 mt-1">Total</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="text-xl font-extrabold text-cobalt-mid">
                {subscription.retail || '-'}
              </div>
              <div className="text-xs text-ink3 mt-1">Retail</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="text-xl font-extrabold text-primary-mid">
                {subscription.nii || '-'}
              </div>
              <div className="text-xs text-ink3 mt-1">NII (HNI)</div>
            </div>
            <div className="bg-secondary rounded-lg p-4 text-center">
              <div className="text-xl font-extrabold text-emerald-mid">
                {subscription.qib || '-'}
              </div>
              <div className="text-xs text-ink3 mt-1">QIB</div>
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Day-wise Subscription Details */}
      {subHistory.length > 0 && (
        <div>
          <h3 className="text-base font-bold mb-4">
            Day-wise Subscription Details (times)
          </h3>
          
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left py-3 px-4 font-bold text-ink3">Date</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">QIB (Ex Anchor)</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">NII</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">NII (> Rs 10L)</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">NII (< Rs 10L)</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Retail</th>
                  <th className="text-right py-3 px-4 font-bold text-ink3">Total</th>
                </tr>
              </thead>
              <tbody>
                {subHistory.map((entry, index) => {
                  const dateStr = new Date(entry.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                  return (
                    <tr key={index} className="border-t border-border">
                      <td className="py-3 px-4">
                        {dateStr} <span className="text-ink4 text-xs">{getDayText(entry, index)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">{entry.qib || '-'}</td>
                      <td className="py-3 px-4 text-right">{entry.nii || '-'}</td>
                      <td className="py-3 px-4 text-right">{entry.bnii || '-'}</td>
                      <td className="py-3 px-4 text-right">{entry.snii || '-'}</td>
                      <td className="py-3 px-4 text-right">{entry.retail || '-'}</td>
                      <td className="py-3 px-4 text-right font-semibold">{entry.total || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subscriptionLive.length === 0 && subHistory.length === 0 && (
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
        * Subscription data is updated multiple times during IPO period. For complete details, refer to the IPO prospectus.
      </p>
    </div>
  );
}
