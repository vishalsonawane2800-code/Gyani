import { BarChart3, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import type { PeerCompany, IPO } from '@/lib/data';
import { formatNumeric, getOverride } from '@/lib/display-overrides';

// Generate abbreviation from company name
function generateAbbr(name: string | undefined | null): string {
  if (!name) return 'IP';
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';
}

interface PeerComparisonProps {
  ipo: IPO;
  peers?: PeerCompany[];
}

function formatCr(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(0)}L Cr`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K Cr`;
  // Round to 2 decimal places for cleaner display
  const rounded = Math.round(value * 100) / 100;
  return `${rounded} Cr`;
}

function getComparisonIndicator(ipoValue: number, avgPeerValue: number, lowerIsBetter = false) {
  const diff = ((ipoValue - avgPeerValue) / avgPeerValue) * 100;
  
  if (Math.abs(diff) < 10) {
    return { icon: Minus, color: 'text-gold-mid', label: 'Similar' };
  }
  
  if (lowerIsBetter) {
    return diff < 0 
      ? { icon: TrendingDown, color: 'text-emerald-mid', label: 'Better' }
      : { icon: TrendingUp, color: 'text-destructive', label: 'Higher' };
  }
  
  return diff > 0 
    ? { icon: TrendingUp, color: 'text-emerald-mid', label: 'Better' }
    : { icon: TrendingDown, color: 'text-destructive', label: 'Lower' };
}

export function PeerComparison({ ipo, peers = [] }: PeerComparisonProps) {
  if (!peers || peers.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-mid" />
          Peer Comparison
        </h2>
        <div className="text-center py-8">
          <p className="text-ink3 text-[13px]">Peer comparison data for {ipo.name} will appear here once available.</p>
          <p className="text-[11px] text-ink4 mt-2">We compare key financials with listed peers in the same sector.</p>
        </div>
      </div>
    );
  }

  // Calculate averages for comparison - only include peers with valid values
  const peersWithMarketCap = peers.filter(p => p.marketCap > 0);
  const peersWithPE = peers.filter(p => p.peRatio > 0);
  const peersWithPB = peers.filter(p => p.pbRatio > 0);
  const peersWithROE = peers.filter(p => p.roe > 0);
  
  const avgMarketCap = peersWithMarketCap.length > 0 
    ? peersWithMarketCap.reduce((sum, p) => sum + p.marketCap, 0) / peersWithMarketCap.length 
    : 0;
  const avgPE = peersWithPE.length > 0 
    ? peersWithPE.reduce((sum, p) => sum + p.peRatio, 0) / peersWithPE.length 
    : 0;
  const avgPB = peersWithPB.length > 0 
    ? peersWithPB.reduce((sum, p) => sum + p.pbRatio, 0) / peersWithPB.length 
    : 0;
  const avgROE = peersWithROE.length > 0 
    ? peersWithROE.reduce((sum, p) => sum + p.roe, 0) / peersWithROE.length 
    : 0;
  const avgRevenue = peers.filter(p => p.revenue > 0).length > 0
    ? peers.filter(p => p.revenue > 0).reduce((sum, p) => sum + p.revenue, 0) / peers.filter(p => p.revenue > 0).length
    : 0;
  const avgPAT = peers.filter(p => p.pat > 0).length > 0
    ? peers.filter(p => p.pat > 0).reduce((sum, p) => sum + p.pat, 0) / peers.filter(p => p.pat > 0).length
    : 0;

  // IPO metrics for comparison - get P/E from KPI data, ROE from KPI dated or financials
  const ipoMarketCapNum = parseInt(ipo.marketCap.replace(/[^0-9]/g, '')) || 0;
  const ipoPE = ipo.kpi?.prePost?.pe?.post || ipo.kpi?.prePost?.pe?.pre || ipo.peRatio || 0;
  const ipoROE = (ipo.kpi?.dated?.roe?.[0]) || ipo.financials?.roe || 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary-mid" />
          Peer Comparison
        </h2>
        <span className="text-[11px] text-ink4 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Comparing with {peers.length} listed peer{peers.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {(() => {
          const peOverride =
            getOverride(ipo, 'pe_ratio') ||
            getOverride(ipo, 'kpi.pe.post') ||
            getOverride(ipo, 'kpi.pe.pre');
          const peDisplay = peOverride ?? (ipoPE > 0 ? `${ipoPE}x` : 'N/A');
          const showCompare = !peOverride && ipoPE > 0 && avgPE > 0;
          const indicator = showCompare ? getComparisonIndicator(ipoPE, avgPE, true) : null;
          return (
            <div className="bg-secondary rounded-xl p-3">
              <div className="text-[10px] text-ink4 font-semibold mb-1">IPO P/E Ratio</div>
              <div className="font-[family-name:var(--font-sora)] text-lg font-bold">
                {peDisplay}
              </div>
              {indicator && (
                <div className={`text-[10px] font-medium flex items-center gap-1 mt-1 ${indicator.color}`}>
                  {(() => {
                    const Icon = indicator.icon;
                    return <Icon className="w-3 h-3" />;
                  })()}
                  vs Peer Avg: {avgPE.toFixed(1)}x
                </div>
              )}
            </div>
          );
        })()}

        <div className="bg-secondary rounded-xl p-3">
          <div className="text-[10px] text-ink4 font-semibold mb-1">IPO Market Cap</div>
          <div className="font-[family-name:var(--font-sora)] text-lg font-bold">
            {ipo.marketCap}
          </div>
          <div className="text-[10px] text-ink4 mt-1">
            Peer Avg: {formatCr(avgMarketCap)}
          </div>
        </div>

        {(() => {
          const roeOverride =
            getOverride(ipo, 'financials.roe') ||
            getOverride(ipo, 'kpi.roe.0');
          const roeDisplay = roeOverride ?? (ipoROE > 0 ? `${ipoROE}%` : 'N/A');
          const showCompare = !roeOverride && ipoROE > 0 && avgROE > 0;
          const indicator = showCompare ? getComparisonIndicator(ipoROE, avgROE) : null;
          return (
            <div className="bg-secondary rounded-xl p-3">
              <div className="text-[10px] text-ink4 font-semibold mb-1">IPO ROE</div>
              <div className="font-[family-name:var(--font-sora)] text-lg font-bold text-emerald-mid">
                {roeDisplay}
              </div>
              {indicator && (
                <div className={`text-[10px] font-medium flex items-center gap-1 mt-1 ${indicator.color}`}>
                  {(() => {
                    const Icon = indicator.icon;
                    return <Icon className="w-3 h-3" />;
                  })()}
                  vs Peer Avg: {avgROE.toFixed(1)}%
                </div>
              )}
            </div>
          );
        })()}
        
        <div className="bg-secondary rounded-xl p-3">
          <div className="text-[10px] text-ink4 font-semibold mb-1">Peer Avg P/B</div>
          <div className="font-[family-name:var(--font-sora)] text-lg font-bold">
            {avgPB > 0 ? `${avgPB.toFixed(1)}x` : 'N/A'}
          </div>
          <div className="text-[10px] text-ink4 mt-1">
            Price-to-Book ratio
          </div>
        </div>
      </div>

      {/* Detailed Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-secondary">
              <th className="text-left py-2.5 px-3 font-bold text-ink3">Company</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Market Cap</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">Revenue</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">PAT</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">P/E</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">P/B</th>
              <th className="text-right py-2.5 px-3 font-bold text-ink3">ROE</th>
            </tr>
          </thead>
          <tbody>
            {/* IPO Row - Highlighted */}
            <tr className="bg-primary-bg/50 border-b border-primary/20">
              <td className="py-3 px-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {generateAbbr(ipo.name)}
                  </div>
                  <div>
                    <span className="font-bold text-primary-mid">{ipo.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-bg text-primary ml-2">IPO</span>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right font-semibold">{ipo.marketCap}</td>
              <td className="py-3 px-3 text-right font-semibold">
                {ipo.financials ? `Rs ${ipo.financials.revenue.fy25} Cr` : '-'}
              </td>
              <td className="py-3 px-3 text-right font-semibold">
                {ipo.financials ? `Rs ${ipo.financials.pat.fy25} Cr` : '-'}
              </td>
              <td className="py-3 px-3 text-right font-bold text-gold-mid">
                {ipoPE > 0 ? `${ipoPE}x` : '-'}
              </td>
              <td className="py-3 px-3 text-right font-semibold">-</td>
              <td className="py-3 px-3 text-right font-bold text-emerald-mid">
                {ipoROE > 0 ? `${ipoROE}%` : '-'}
              </td>
            </tr>

            {/* Peer Rows */}
            {peers.map((peer, index) => (
              <tr key={index} className="border-b border-border last:border-b-0 hover:bg-secondary/50 transition-colors">
                <td className="py-3 px-3">
                  <span className="font-medium">{peer.name}</span>
                </td>
                <td className="py-3 px-3 text-right">{peer.marketCap > 0 ? formatCr(peer.marketCap) : '-'}</td>
                <td className="py-3 px-3 text-right">{peer.revenue > 0 ? formatCr(peer.revenue) : '-'}</td>
                <td className="py-3 px-3 text-right">{peer.pat > 0 ? formatCr(peer.pat) : '-'}</td>
                <td className="py-3 px-3 text-right">
                  {peer.peRatio > 0 ? `${peer.peRatio}x` : '-'}
                </td>
                <td className="py-3 px-3 text-right">{peer.pbRatio > 0 ? `${peer.pbRatio}x` : '-'}</td>
                <td className="py-3 px-3 text-right">{peer.roe > 0 ? `${peer.roe}%` : '-'}</td>
              </tr>
            ))}

            {/* Average Row */}
            <tr className="bg-secondary font-semibold">
              <td className="py-3 px-3">Peer Average</td>
              <td className="py-3 px-3 text-right">{avgMarketCap > 0 ? formatCr(avgMarketCap) : '-'}</td>
              <td className="py-3 px-3 text-right">{avgRevenue > 0 ? formatCr(avgRevenue) : '-'}</td>
              <td className="py-3 px-3 text-right">{avgPAT > 0 ? formatCr(avgPAT) : '-'}</td>
              <td className="py-3 px-3 text-right">{avgPE > 0 ? `${avgPE.toFixed(1)}x` : '-'}</td>
              <td className="py-3 px-3 text-right">{avgPB > 0 ? `${avgPB.toFixed(1)}x` : '-'}</td>
              <td className="py-3 px-3 text-right">{avgROE > 0 ? `${avgROE.toFixed(1)}%` : '-'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Analysis Notes */}
      <div className="mt-4 p-3 bg-secondary rounded-xl">
        <h4 className="text-[11px] font-bold text-ink3 mb-2">Quick Analysis</h4>
        <ul className="text-[11px] text-ink2 space-y-1.5">
          {ipoPE > 0 && avgPE > 0 && (
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-ink4 mt-1.5 shrink-0"></span>
              <span>
                {ipo.name}&apos;s P/E of {ipoPE}x is {ipoPE < avgPE ? 'lower' : 'higher'} than the peer average of {avgPE.toFixed(1)}x, 
                suggesting {ipoPE < avgPE ? 'relatively attractive' : 'premium'} valuation.
              </span>
            </li>
          )}
          {ipoROE > 0 && (
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-ink4 mt-1.5 shrink-0"></span>
              <span>
                ROE of {ipoROE}% is {ipoROE > avgROE ? 'above' : 'below'} peer average ({avgROE.toFixed(1)}%), 
                indicating {ipoROE > avgROE ? 'better' : 'lower'} return on equity.
              </span>
            </li>
          )}
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-ink4 mt-1.5 shrink-0"></span>
            <span>
              Market cap post-listing would place {ipo.name} {ipoMarketCapNum < avgMarketCap ? 'below' : 'above'} peer average in terms of size.
            </span>
          </li>
        </ul>
      </div>

      <p className="text-[10px] text-ink4 mt-3">
        * All peer data is from publicly available sources. Financial figures are latest reported annual numbers.
      </p>
    </div>
  );
}
