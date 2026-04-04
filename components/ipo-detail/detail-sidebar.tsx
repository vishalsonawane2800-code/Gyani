import { Users, Building2, IndianRupee, Percent, BarChart3, Target, FileText } from 'lucide-react';
import type { IPO } from '@/lib/data';
import { formatDate } from '@/lib/data';

interface DetailSidebarProps {
  ipo: IPO;
}

export function DetailSidebar({ ipo }: DetailSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* Quick Info Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Quick Info</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <IndianRupee className="w-3.5 h-3.5" />
              Issue Size
            </div>
            <span className="text-[12px] font-semibold">{ipo.issueSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Target className="w-3.5 h-3.5" />
              Market Cap
            </div>
            <span className="text-[12px] font-semibold">{ipo.marketCap}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Percent className="w-3.5 h-3.5" />
              P/E Ratio
            </div>
            <span className="text-[12px] font-semibold">{ipo.peRatio}x</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Building2 className="w-3.5 h-3.5" />
              Lead Manager
            </div>
            <span className="text-[12px] font-semibold truncate max-w-[140px]">{ipo.leadManager}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Users className="w-3.5 h-3.5" />
              Registrar
            </div>
            <span className="text-[12px] font-semibold">{ipo.registrar}</span>
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Key Dates</h3>
        </div>
        <div className="p-4">
          <div className="relative pl-4 border-l-2 border-primary/30 space-y-4">
            <div className="relative">
              <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-emerald border-2 border-background" />
              <p className="text-[10px] text-ink4 font-semibold">Open</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.openDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'lastday' ? 'bg-gold animate-pulse' : 'bg-emerald'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Close</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.closeDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'allot' ? 'bg-gold animate-pulse' : ipo.status === 'listing' ? 'bg-emerald' : 'bg-ink4'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Allotment</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.allotmentDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'listing' ? 'bg-gold animate-pulse' : 'bg-ink4'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Listing</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.listDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sentiment Summary */}
      <div className="bg-gradient-to-br from-primary/5 to-cobalt/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cobalt flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold">AI Prediction</p>
            <p className="text-[10px] text-ink3">{ipo.aiConfidence}% confidence</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`font-[family-name:var(--font-sora)] text-3xl font-extrabold ${ipo.aiPrediction >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
          </span>
          <span className="text-[11px] text-ink3">expected listing gain</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
            ipo.sentimentLabel === 'Bullish' ? 'bg-emerald-bg text-emerald' :
            ipo.sentimentLabel === 'Bearish' ? 'bg-destructive-bg text-destructive' :
            'bg-gold-bg text-gold'
          }`}>
            {ipo.sentimentLabel}
          </div>
          <span className="text-[10px] text-ink3">Market sentiment</span>
        </div>
      </div>

      {/* Company Overview */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-[13px] font-bold">Company Overview</h3>
          </div>
        </div>
        <div className="p-4">
          <p className="text-[12px] text-ink2 leading-relaxed">
            {ipo.aboutCompany}
          </p>
          
          {/* Business Highlights */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-[11px] font-bold text-ink3 uppercase tracking-wide mb-3">Business Highlights</h4>
            <div className="space-y-2.5">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-[11px] text-ink3 leading-relaxed">
                  Operating in the <span className="font-semibold text-foreground">{ipo.sector}</span> sector
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-[11px] text-ink3 leading-relaxed">
                  Listed on <span className="font-semibold text-foreground">{ipo.exchange}</span>
                </p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-[11px] text-ink3 leading-relaxed">
                  Market cap of <span className="font-semibold text-foreground">{ipo.marketCap}</span> at upper band
                </p>
              </div>
              {ipo.financials && (
                <>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald mt-1.5 shrink-0" />
                    <p className="text-[11px] text-ink3 leading-relaxed">
                      FY25 Revenue: <span className="font-semibold text-foreground">Rs {ipo.financials.revenue.fy25 >= 100 ? `${(ipo.financials.revenue.fy25).toFixed(0)} Cr` : `${ipo.financials.revenue.fy25.toFixed(1)} Cr`}</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald mt-1.5 shrink-0" />
                    <p className="text-[11px] text-ink3 leading-relaxed">
                      ROE: <span className="font-semibold text-foreground">{ipo.financials.roe}%</span> | ROCE: <span className="font-semibold text-foreground">{ipo.financials.roce}%</span>
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="text-[11px] font-bold text-ink3 uppercase tracking-wide mb-3">Valuation</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-secondary rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-ink4 mb-0.5">P/E Ratio</p>
                <p className="font-[family-name:var(--font-sora)] text-sm font-bold">{ipo.peRatio}x</p>
              </div>
              <div className="bg-secondary rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-ink4 mb-0.5">Issue Size</p>
                <p className="font-[family-name:var(--font-sora)] text-sm font-bold">{ipo.issueSize}</p>
              </div>
              {ipo.financials && (
                <>
                  <div className="bg-secondary rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-ink4 mb-0.5">Debt/Equity</p>
                    <p className="font-[family-name:var(--font-sora)] text-sm font-bold">{ipo.financials.debtEquity}</p>
                  </div>
                  <div className="bg-secondary rounded-lg p-2.5 text-center">
                    <p className="text-[10px] text-ink4 mb-0.5">ROE</p>
                    <p className="font-[family-name:var(--font-sora)] text-sm font-bold text-emerald-mid">{ipo.financials.roe}%</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
