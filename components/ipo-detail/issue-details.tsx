'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Target, Users, Building2, Briefcase, FileText } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface IssueDetailsProps {
  ipo: IPO;
}

export function IssueDetails({ ipo }: IssueDetailsProps) {
  const issueDetails = ipo.issueDetails;
  
  if (!issueDetails) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">Issue Details</h2>
        <p className="text-ink3 text-center py-4">Issue details not available for this IPO.</p>
      </div>
    );
  }

  // Fresh Issue vs OFS data
  const issueTypeData = [
    { name: 'Fresh Issue', value: issueDetails.freshIssuePercent, amount: issueDetails.freshIssueCr },
    { name: 'OFS', value: issueDetails.ofsPercent, amount: issueDetails.ofsCr },
  ].filter(item => item.value > 0);

  // Quota allocation data
  const quotaData = [
    { name: 'QIB', value: issueDetails.qibQuotaPercent, color: 'var(--cobalt-mid)' },
    { name: 'Retail', value: issueDetails.retailQuotaPercent, color: 'var(--emerald-mid)' },
    { name: 'NII', value: issueDetails.niiQuotaPercent, color: 'var(--gold-mid)' },
    ...(issueDetails.employeeQuotaPercent ? [{ name: 'Employee', value: issueDetails.employeeQuotaPercent, color: 'var(--primary-mid)' }] : []),
    ...(issueDetails.shareholderQuotaPercent ? [{ name: 'Shareholder', value: issueDetails.shareholderQuotaPercent, color: 'var(--ink3)' }] : []),
  ];

  const issueTypeColors = ['var(--cobalt-mid)', 'var(--gold-mid)'];

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 mb-5">
        <FileText className="w-5 h-5 text-primary-mid" />
        <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Issue Details</h2>
      </div>
      
      {/* Issue Size Header */}
      <div className="bg-gradient-to-br from-primary/10 to-cobalt/10 rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink4 mb-1">Total Issue Size</p>
            <p className="font-[family-name:var(--font-sora)] text-2xl font-extrabold text-primary-mid">
              Rs {issueDetails.totalIssueSizeCr >= 1000 
                ? `${(issueDetails.totalIssueSizeCr / 100).toFixed(0)} Cr` 
                : `${issueDetails.totalIssueSizeCr} Cr`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-ink3">Price Band</p>
            <p className="text-[14px] font-bold">Rs {ipo.priceMin} - {ipo.priceMax}</p>
          </div>
        </div>
      </div>

      {/* Fresh Issue vs OFS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[11px] font-semibold text-ink3 mb-3">Fresh Issue vs OFS</p>
          <div className="flex items-center gap-4">
            <div className="w-[100px] h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
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
                      `Rs ${props.payload.amount} Cr (${value}%)`, 
                      name
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm bg-cobalt-mid" />
                  <span className="text-[12px]">Fresh Issue</span>
                </div>
                <span className="text-[12px] font-semibold">
                  Rs {issueDetails.freshIssueCr} Cr ({issueDetails.freshIssuePercent.toFixed(0)}%)
                </span>
              </div>
              {issueDetails.ofsCr > 0 && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-gold-mid" />
                    <span className="text-[12px]">OFS</span>
                  </div>
                  <span className="text-[12px] font-semibold">
                    Rs {issueDetails.ofsCr} Cr ({issueDetails.ofsPercent.toFixed(0)}%)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quota Allocation */}
        <div className="bg-secondary rounded-xl p-4">
          <p className="text-[11px] font-semibold text-ink3 mb-3">Reservation Quota</p>
          <div className="flex items-center gap-4">
            <div className="w-[100px] h-[100px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={quotaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={45}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {quotaData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1.5">
              {quotaData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
                    <span className="text-[12px]">{item.name}</span>
                  </div>
                  <span className="text-[12px] font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Quota Details Cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-cobalt-bg border border-cobalt/20 rounded-xl p-3 text-center">
          <Building2 className="w-4 h-4 text-cobalt mx-auto mb-1" />
          <p className="text-[10px] text-ink4 font-semibold">QIB</p>
          <p className="text-[16px] font-extrabold text-cobalt">{issueDetails.qibQuotaPercent}%</p>
        </div>
        <div className="bg-emerald-bg border border-emerald/20 rounded-xl p-3 text-center">
          <Users className="w-4 h-4 text-emerald mx-auto mb-1" />
          <p className="text-[10px] text-ink4 font-semibold">Retail</p>
          <p className="text-[16px] font-extrabold text-emerald">{issueDetails.retailQuotaPercent}%</p>
        </div>
        <div className="bg-gold-bg border border-gold/20 rounded-xl p-3 text-center">
          <Briefcase className="w-4 h-4 text-gold mx-auto mb-1" />
          <p className="text-[10px] text-ink4 font-semibold">NII</p>
          <p className="text-[16px] font-extrabold text-gold">{issueDetails.niiQuotaPercent}%</p>
        </div>
      </div>

      {/* IPO Objectives */}
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
    </div>
  );
}
