import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { listedIPOs } from '@/lib/data';

export const metadata: Metadata = {
  title: 'AI Prediction Accuracy Dashboard | IPOGyani',
  description: 'Track our AI prediction accuracy for IPO listing gains. View historical predictions vs actual results for mainboard and SME IPOs.',
  keywords: 'IPO prediction accuracy, AI listing gain prediction, IPO forecasting, IPOGyani accuracy',
};

export default function AccuracyPage() {
  // Calculate overall stats
  const totalPredictions = listedIPOs.length;
  const withinFivePercent = listedIPOs.filter(ipo => ipo.aiErr < 5).length;
  const avgError = listedIPOs.reduce((sum, ipo) => sum + ipo.aiErr, 0) / totalPredictions;
  const correctDirection = listedIPOs.filter(ipo => {
    const predictedPositive = parseFloat(ipo.aiPred) > 0;
    return predictedPositive === (ipo.gainPct > 0);
  }).length;

  // Stats by year
  const years = [...new Set(listedIPOs.map(ipo => ipo.year))].sort((a, b) => b.localeCompare(a));
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Ticker />
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-5 py-8 pb-16">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-sora)] text-2xl font-extrabold mb-2">
            AI Prediction Accuracy Dashboard
          </h1>
          <p className="text-[14px] text-ink3 max-w-2xl">
            Track our AI model&apos;s performance in predicting IPO listing gains. Our predictions are based on GMP trends, subscription data, market sentiment, and fundamental analysis.
          </p>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="font-[family-name:var(--font-sora)] text-3xl font-black text-cobalt">{totalPredictions}</div>
            <div className="text-[12px] text-ink3 mt-1">Total Predictions</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="font-[family-name:var(--font-sora)] text-3xl font-black text-emerald">
              {((withinFivePercent / totalPredictions) * 100).toFixed(0)}%
            </div>
            <div className="text-[12px] text-ink3 mt-1">Within +/-5% Error</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="font-[family-name:var(--font-sora)] text-3xl font-black text-gold-mid">
              {avgError.toFixed(1)}%
            </div>
            <div className="text-[12px] text-ink3 mt-1">Average Error</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <div className="font-[family-name:var(--font-sora)] text-3xl font-black text-primary-mid">
              {((correctDirection / totalPredictions) * 100).toFixed(0)}%
            </div>
            <div className="text-[12px] text-ink3 mt-1">Correct Direction</div>
          </div>
        </div>

        {/* Accuracy by Year */}
        <div className="bg-card border border-border rounded-2xl mb-8">
          <div className="p-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">Accuracy by Year</h2>
          </div>
          <div className="p-4">
            <div className="grid md:grid-cols-3 gap-4">
              {years.map(year => {
                const yearIPOs = listedIPOs.filter(ipo => ipo.year === year);
                const yearAvgErr = yearIPOs.reduce((sum, ipo) => sum + ipo.aiErr, 0) / yearIPOs.length;
                const yearWithin5 = yearIPOs.filter(ipo => ipo.aiErr < 5).length;
                
                return (
                  <div key={year} className="bg-secondary rounded-xl p-4">
                    <div className="text-[18px] font-bold mb-3">{year}</div>
                    <div className="space-y-2 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-ink3">Predictions</span>
                        <span className="font-semibold">{yearIPOs.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink3">Avg Error</span>
                        <span className={`font-semibold ${yearAvgErr < 3 ? 'text-emerald' : yearAvgErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                          {yearAvgErr.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-ink3">Within 5%</span>
                        <span className="font-semibold text-emerald">
                          {((yearWithin5 / yearIPOs.length) * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Full Prediction Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold">All Predictions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-secondary">
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">IPO Name</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">List Date</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Exchange</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Predicted</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Actual</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Error</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Accuracy</th>
                  <th className="text-left text-[10.5px] font-bold uppercase tracking-wide text-ink3 py-3 px-4">Result</th>
                </tr>
              </thead>
              <tbody>
                {listedIPOs.map((ipo) => {
                  const isPositive = ipo.gainPct > 0;
                  const isHit = ipo.aiErr < 5;
                  const accuracy = Math.max(0, 100 - ipo.aiErr * 10);
                  
                  return (
                    <tr key={ipo.id} className="border-b border-border last:border-b-0 hover:bg-secondary/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                            style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                          >
                            {ipo.abbr}
                          </div>
                          <span className="font-semibold">{ipo.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-ink3">{ipo.listDate}</td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-xl bg-secondary text-ink3">
                          {ipo.exchange}
                        </span>
                      </td>
                      <td className={`py-3 px-4 font-bold ${parseFloat(ipo.aiPred) > 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {ipo.aiPred}
                      </td>
                      <td className={`py-3 px-4 font-bold ${isPositive ? 'text-emerald-mid' : 'text-destructive'}`}>
                        {isPositive ? '+' : ''}{ipo.gainPct.toFixed(1)}%
                      </td>
                      <td className={`py-3 px-4 font-bold ${ipo.aiErr < 2 ? 'text-emerald' : ipo.aiErr < 5 ? 'text-gold-mid' : 'text-destructive'}`}>
                        {ipo.aiErr}%
                      </td>
                      <td className="py-3 px-4">
                        <div className="h-1.5 bg-secondary rounded w-[80px] overflow-hidden">
                          <div 
                            className="h-full rounded"
                            style={{ 
                              width: `${accuracy}%`,
                              backgroundColor: ipo.aiErr < 2 ? 'var(--emerald-mid)' : ipo.aiErr < 5 ? 'var(--gold-mid)' : 'var(--destructive)'
                            }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                          isHit ? 'bg-emerald-bg text-emerald' : 'bg-gold-bg text-gold'
                        }`}>
                          {isHit ? 'Hit' : 'Near'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Methodology Section */}
        <div className="mt-8 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-[family-name:var(--font-sora)] text-[16px] font-bold mb-4">
            How Our AI Predictions Work
          </h2>
          <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
            <div>
              <h3 className="font-bold text-foreground mb-2">Data Sources</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>Grey Market Premium (GMP) trends and history</li>
                <li>Real-time subscription data by category</li>
                <li>Market sentiment from news and social media</li>
                <li>Company financials and peer comparison</li>
                <li>Historical IPO performance patterns</li>
              </ul>
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-2">Accuracy Metrics</h3>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Hit:</strong> Prediction within 5% of actual listing gain</li>
                <li><strong>Near:</strong> Prediction within 10% of actual</li>
                <li><strong>Direction:</strong> Correctly predicted positive or negative listing</li>
                <li>Updated predictions until listing day</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
