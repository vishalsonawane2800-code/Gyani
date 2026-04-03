'use client';

import { useState } from 'react';
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
      {/* Tab Bar */}
      <div className="flex overflow-x-auto border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
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
    ['Issue Type', 'Book Build Issue'],
    ['Issue Size', `Rs ${ipo.issueSize}`],
    ['Fresh Issue', ipo.freshIssue],
    ['OFS', ipo.ofs],
    ['Face Value', 'Rs 10 per share'],
    ['Price Band', `Rs ${ipo.priceMin} - ${ipo.priceMax}`],
    ['Lot Size', `${ipo.lotSize.toLocaleString()} shares`],
    ['Min Investment (Retail)', `Rs ${minInvestment >= 100000 ? `${(minInvestment / 100000).toFixed(2)}L` : minInvestment.toLocaleString()}`],
    ['Listing Exchange', ipo.exchange],
    ['Listing Date', formatDate(ipo.listDate)],
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
  // Mock GMP history data
  const gmpHistory = [
    { date: 'Today', day: 13, gmp: ipo.gmp, percent: ipo.gmpPercent, est: ipo.estListPrice, change: '+2' },
    { date: 'Yesterday', day: 12, gmp: ipo.gmp - 2, percent: ipo.gmpPercent - 2, est: ipo.estListPrice - 2, change: '+1' },
    { date: '2 days ago', day: 11, gmp: ipo.gmp - 3, percent: ipo.gmpPercent - 3, est: ipo.estListPrice - 3, change: '+2' },
    { date: '3 days ago', day: 10, gmp: ipo.gmp - 5, percent: ipo.gmpPercent - 5.1, est: ipo.estListPrice - 5, change: '+2' },
    { date: '5 days ago', day: 8, gmp: ipo.gmp - 7, percent: ipo.gmpPercent - 7.1, est: ipo.estListPrice - 7, change: '+2' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold">GMP Trend - Last 12 Days</h3>
        <span className="text-[12px] font-bold px-3 py-1 rounded-lg bg-emerald-bg text-emerald">
          Today: +Rs {ipo.gmp} (+{ipo.gmpPercent}%)
        </span>
      </div>

      {/* Simple Chart Representation */}
      <div className="bg-secondary rounded-xl p-4 mb-4">
        <div className="h-20 flex items-end gap-1">
          {gmpHistory.reverse().map((day, index) => (
            <div 
              key={index}
              className="flex-1 bg-gradient-to-t from-emerald to-emerald-mid rounded-t transition-all"
              style={{ height: `${Math.max(20, (day.gmp / ipo.gmp) * 100)}%` }}
              title={`Day ${day.day}: +Rs ${day.gmp}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-[9px] text-ink4 mt-2 px-1">
          <span>5 days ago</span>
          <span>3 days ago</span>
          <span>2 days ago</span>
          <span>Yesterday</span>
          <span>Today</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2.5 px-3 font-bold text-ink3">Date</th>
              <th className="text-center py-2.5 px-3 font-bold text-ink3">Day</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">GMP (Rs)</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Premium %</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Est. Listing (Rs)</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Change</th>
            </tr>
          </thead>
          <tbody>
            {gmpHistory.reverse().map((day, index) => (
              <tr key={index} className="border-b border-border last:border-b-0">
                <td className={`py-2.5 px-3 ${index === 0 ? 'font-bold text-emerald-mid' : ''}`}>{day.date}</td>
                <td className="py-2.5 px-3 text-center">Day {day.day}</td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-mid">+Rs {day.gmp}</td>
                <td className="py-2.5 px-3 text-right font-bold text-emerald-mid">+{day.percent.toFixed(1)}%</td>
                <td className="py-2.5 px-3 text-right font-medium">Rs {day.est}</td>
                <td className="py-2.5 px-3 text-right text-emerald-mid">{day.change}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubscriptionTab({ ipo }: { ipo: IPO }) {
  // Mock day-wise subscription data
  const subHistory = ipo.subscription.day > 0 ? [
    { day: 1, retail: '0.05x', nii: '0.08x', qib: '0.02x', total: '0.05x' },
    { day: 2, retail: '0.12x', nii: '0.15x', qib: '0.10x', total: '0.12x' },
    { day: 3, retail: ipo.subscription.retail, nii: ipo.subscription.nii, qib: ipo.subscription.qib, total: `${ipo.subscription.total}x` },
  ] : [];

  return (
    <div>
      {/* Category Breakdown */}
      <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mb-4">Subscription by Category</h3>
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

      {/* Day-wise Table */}
      {subHistory.length > 0 && (
        <>
          <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold mb-4">Day-wise Subscription</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left py-2.5 px-3 font-bold text-ink3">Day</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">Retail</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">NII</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">QIB</th>
                  <th className="text-right py-2.5 px-3 font-bold text-ink3">Total</th>
                </tr>
              </thead>
              <tbody>
                {subHistory.map((day, index) => (
                  <tr key={index} className="border-b border-border last:border-b-0">
                    <td className={`py-2.5 px-3 ${index === subHistory.length - 1 ? 'font-bold' : ''}`}>
                      Day {day.day} {index === subHistory.length - 1 && !ipo.subscription.isFinal && '(Live)'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cobalt-mid font-medium">{day.retail}</td>
                    <td className="py-2.5 px-3 text-right text-primary-mid font-medium">{day.nii}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-mid font-medium">{day.qib}</td>
                    <td className="py-2.5 px-3 text-right font-bold">{day.total}</td>
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
    </div>
  );
}
