import Link from 'next/link';
import { listedIPOs } from '@/lib/data';

export function AIAccuracy() {
  // Get top 4 recent IPOs for the preview
  const recentIPOs = listedIPOs.slice(0, 4);

  return (
    <section id="accuracy" className="mb-7">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold">
            AI Prediction Accuracy
          </h2>
          <Link href="/accuracy" className="text-[12.5px] font-semibold text-primary hover:opacity-75 transition-opacity">
            Full Dashboard
          </Link>
        </div>

        <div className="p-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="font-[family-name:var(--font-sora)] text-xl font-black text-cobalt">142</div>
              <div className="text-[10px] text-ink3 mt-1">Total Predictions</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="font-[family-name:var(--font-sora)] text-xl font-black text-emerald">94%</div>
              <div className="text-[10px] text-ink3 mt-1">Within +/-5%</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="font-[family-name:var(--font-sora)] text-xl font-black text-gold-mid">2.3%</div>
              <div className="text-[10px] text-ink3 mt-1">Avg Error</div>
            </div>
            <div className="bg-secondary rounded-xl p-3 text-center">
              <div className="font-[family-name:var(--font-sora)] text-xl font-black text-primary">88%</div>
              <div className="text-[10px] text-ink3 mt-1">Direction</div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3 sticky left-0 z-10 min-w-[140px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">IPO Name</th>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3">Predicted</th>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3">Actual</th>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3">Error</th>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3 min-w-[70px]">Accuracy</th>
                  <th className="text-left bg-secondary text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-2 px-3">Result</th>
                </tr>
              </thead>
              <tbody>
                {recentIPOs.map((ipo) => {
                  const isPositive = ipo.gainPct > 0;
                  const isHit = ipo.aiErr < 5;
                  const accuracy = Math.max(0, 100 - ipo.aiErr * 10);
                  
                  return (
                    <tr key={ipo.id} className="border-b border-border last:border-b-0 group/row">
                      <td className="py-2.5 px-3 sticky left-0 bg-card group-hover/row:bg-secondary/30 z-10 min-w-[140px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                        <span 
                          className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
                          style={{ backgroundColor: isPositive ? 'var(--emerald-mid)' : 'var(--destructive)' }}
                        />
                        {ipo.name}
                      </td>
                      <td className={`py-2.5 px-3 ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.aiPred}
                      </td>
                      <td className={`py-2.5 px-3 ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                      </td>
                      <td className={`py-2.5 px-3 ${ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                        {ipo.aiErr}%
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="h-1 bg-secondary rounded-sm w-[60px] overflow-hidden">
                          <div 
                            className="h-full rounded-sm"
                            style={{ 
                              width: `${accuracy}%`,
                              backgroundColor: ipo.aiErr < 2 ? 'var(--emerald-mid)' : ipo.aiErr < 5 ? 'var(--gold-mid)' : 'var(--destructive)'
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isHit ? 'bg-emerald-bg text-emerald' : 'bg-gold-bg text-gold'
                        }`}>
                          {isHit ? 'Hit' : '~ Near'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* CTA */}
          <div className="text-center mt-4">
            <Link 
              href="/accuracy" 
              className="inline-block bg-primary text-white text-[13px] font-bold py-2.5 px-7 rounded-lg hover:opacity-90 transition-opacity"
            >
              View Full AI Accuracy Dashboard
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
