'use client';

import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import { Target, FileText, Building2, Users, Calendar, IndianRupee, Layers, TrendingUp } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';

interface IssueDetailsProps {
  ipo: IPO;
}

export function IssueDetails({ ipo }: IssueDetailsProps) {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  const issueDetails = ipo.issueDetails;

  // Fresh Issue vs OFS data (use issueDetails if available, fallback to IPO props)
  const totalIssueSizeCr = issueDetails?.totalIssueSizeCr || ipo.issueSizeCr || 0;
  const freshIssueCr = issueDetails?.freshIssueCr || 0;
  const freshIssuePercent = issueDetails?.freshIssuePercent || (totalIssueSizeCr > 0 && freshIssueCr > 0 ? (freshIssueCr / totalIssueSizeCr) * 100 : 100);
  const ofsCr = issueDetails?.ofsCr || 0;
  const ofsPercent = issueDetails?.ofsPercent || 0;
  
  const issueTypeData = [
    { name: 'Fresh Issue', value: freshIssuePercent, amount: freshIssueCr || totalIssueSizeCr },
    { name: 'OFS', value: ofsPercent, amount: ofsCr },
  ].filter(item => item.value > 0);

  const issueTypeColors = ['var(--cobalt-mid)', 'var(--gold-mid)'];
  
  // Calculate shares from issue size
  const totalShares = ipo.priceMax > 0 ? Math.round((totalIssueSizeCr * 10000000) / ipo.priceMax) : 0;
  const formattedShares = totalShares > 0 ? totalShares.toLocaleString('en-IN') : '-';

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="w-5 h-5 text-primary" />
        <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Issue Details</h2>
      </div>
      
      {/* Issue Size Header */}
      <div className="bg-primary-bg rounded-xl p-4 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Total Issue Size</p>
            <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold text-primary">
              Rs {totalIssueSizeCr >= 1000 
                ? `${(totalIssueSizeCr / 100).toFixed(0)} Cr` 
                : `${totalIssueSizeCr} Cr`}
            </p>
            {totalShares > 0 && (
              <p className="text-[10px] text-ink4 mt-0.5">{formattedShares} shares</p>
            )}
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] text-ink3">Price Band</p>
            <p className="text-[14px] font-bold">Rs {ipo.priceMin} - {ipo.priceMax}</p>
          </div>
        </div>
      </div>

      {/* Main Grid - Fresh/OFS + Basic Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-5">
        {/* Fresh Issue vs OFS */}
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[11px] font-semibold text-ink3 mb-3">Fresh Issue vs OFS</p>
          <div className="flex items-center gap-4">
            <div className="w-[100px] h-[100px] shrink-0">
              {isMounted ? (
                <PieChart width={100} height={100}>
                  <Pie
                    data={issueTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {issueTypeData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={issueTypeColors[index]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number, name: string, props: { payload: { amount: number } }) => [
                      `Rs ${props.payload.amount} Cr (${value.toFixed(0)}%)`, 
                      name
                    ]}
                  />
                </PieChart>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-[90px] h-[90px] rounded-full border-8 border-secondary animate-pulse" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-cobalt-mid" />
                  <span className="text-[12px]">Fresh Issue</span>
                </div>
                <span className="text-[12px] font-semibold">
                  Rs {freshIssueCr || totalIssueSizeCr} Cr ({freshIssuePercent.toFixed(0)}%)
                </span>
              </div>
              {ofsCr > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gold-mid" />
                    <span className="text-[12px]">OFS</span>
                  </div>
                  <span className="text-[12px] font-semibold">
                    Rs {ofsCr} Cr ({ofsPercent.toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Basic Details - visible on all screens */}
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[11px] font-semibold text-ink3 mb-3">Basic Details</p>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <Calendar className="w-3.5 h-3.5" />
                IPO Date
              </div>
              <span className="text-[12px] font-semibold">{formatDate(ipo.openDate)} - {formatDate(ipo.closeDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <Calendar className="w-3.5 h-3.5" />
                Listing Date
              </div>
              <span className="text-[12px] font-semibold">{formatDate(ipo.listDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <Layers className="w-3.5 h-3.5" />
                Lot Size
              </div>
              <span className="text-[12px] font-semibold">{ipo.lotSize} Shares</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <IndianRupee className="w-3.5 h-3.5" />
                Min Investment
              </div>
              <span className="text-[12px] font-semibold">Rs {(ipo.priceMax * ipo.lotSize).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[12px] text-ink3">
                <TrendingUp className="w-3.5 h-3.5" />
                Listing At
              </div>
              <span className="text-[12px] font-semibold">{ipo.exchange}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Reservation Quota */}
      {issueDetails && (issueDetails.retailQuotaPercent > 0 || issueDetails.niiQuotaPercent > 0 || issueDetails.qibQuotaPercent > 0) && (
        <div className="bg-secondary rounded-xl p-4 mb-5">
          <p className="text-[11px] font-semibold text-ink3 mb-3">Reservation Quota</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            <div className="bg-cobalt-bg border border-cobalt/20 rounded-lg p-2 text-center">
              <p className="text-[10px] text-ink4">QIB</p>
              <p className="text-[12px] font-bold text-cobalt">{issueDetails.qibQuotaPercent}%</p>
            </div>
            <div className="bg-emerald-bg border border-emerald/20 rounded-lg p-2 text-center">
              <p className="text-[10px] text-ink4">Retail</p>
              <p className="text-[12px] font-bold text-emerald">{issueDetails.retailQuotaPercent}%</p>
            </div>
            <div className="bg-gold-bg border border-gold/20 rounded-lg p-2 text-center">
              <p className="text-[10px] text-ink4">NII</p>
              <p className="text-[12px] font-bold text-gold">{issueDetails.niiQuotaPercent}%</p>
            </div>
            {(issueDetails.employeeQuotaPercent ?? 0) > 0 && (
              <div className="bg-secondary border border-border rounded-lg p-2 text-center">
                <p className="text-[10px] text-ink4">Employee</p>
                <p className="text-[12px] font-bold text-ink2">{issueDetails.employeeQuotaPercent}%</p>
              </div>
            )}
            {(issueDetails.shareholderQuotaPercent ?? 0) > 0 && (
              <div className="bg-secondary border border-border rounded-lg p-2 text-center">
                <p className="text-[10px] text-ink4">Shareholder</p>
                <p className="text-[12px] font-bold text-ink2">{issueDetails.shareholderQuotaPercent}%</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Lead Manager & Registrar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
        {ipo.leadManager && (
          <div className="bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 text-[12px] text-ink3 mb-1">
              <Building2 className="w-3.5 h-3.5" />
              Lead Manager
            </div>
            <p className="text-[13px] font-semibold truncate">{ipo.leadManager}</p>
          </div>
        )}
        {ipo.registrar && (
          <div className="bg-secondary rounded-xl p-4">
            <div className="flex items-center gap-2 text-[12px] text-ink3 mb-1">
              <Users className="w-3.5 h-3.5" />
              Registrar
            </div>
            <p className="text-[13px] font-semibold">{ipo.registrar}</p>
          </div>
        )}
      </div>

      {/* IPO Objectives */}
      {issueDetails && issueDetails.ipoObjectives && issueDetails.ipoObjectives.length > 0 && (
        <div className="bg-secondary rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary-mid" />
            <p className="text-[12px] font-bold">Objects of the Issue (as per DRHP)</p>
          </div>
          <ul className="space-y-2">
            {issueDetails.ipoObjectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary-bg text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </span>
                <span className="text-[12px] text-ink2 leading-relaxed">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
