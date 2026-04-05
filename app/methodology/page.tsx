import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Database, LineChart, Brain, BarChart3, CheckCircle, AlertTriangle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Methodology - How IPOGyani AI Predictions Work',
  description: 'Learn about IPOGyani\'s AI prediction methodology, data sources, and how we calculate listing gain estimates for IPOs.',
};

const dataSources = [
  { name: 'BSE/NSE Official Data', description: 'Subscription status, allotment ratios, and listing prices directly from exchanges' },
  { name: 'Registrar Data', description: 'Real-time subscription updates from Link Intime, KFin Tech, and other registrars' },
  { name: 'Grey Market Sources', description: 'Verified GMP data aggregated from multiple dealer networks across India' },
  { name: 'News & Sentiment', description: 'AI-processed news articles, expert opinions, and social media sentiment' },
];

const modelFactors = [
  { factor: 'Subscription Ratio', weight: '25%', description: 'Overall, QIB, NII, and Retail subscription levels' },
  { factor: 'GMP Trend', weight: '20%', description: 'Grey market premium trajectory in the days before listing' },
  { factor: 'Market Conditions', weight: '15%', description: 'Nifty/Sensex trend, sector performance, and volatility' },
  { factor: 'Issue Quality', weight: '15%', description: 'Company financials, valuations, and peer comparison' },
  { factor: 'Historical Patterns', weight: '15%', description: 'Similar IPO performance in comparable market conditions' },
  { factor: 'Sentiment Score', weight: '10%', description: 'Expert reviews, news sentiment, and social media analysis' },
];

export default function MethodologyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-5 py-8 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-ink mb-4">
            Our Methodology
          </h1>
          <p className="text-ink3 text-lg max-w-2xl mx-auto leading-relaxed">
            Transparency is core to our values. Here&apos;s exactly how our AI predictions work and where our data comes from.
          </p>
        </div>

        {/* Data Sources */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-cobalt-bg flex items-center justify-center">
              <Database className="w-5 h-5 text-cobalt-mid" />
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Data Sources</h2>
          </div>
          <p className="text-ink2 leading-relaxed mb-6">
            Our predictions are only as good as our data. We aggregate information from multiple verified sources to ensure accuracy and reliability.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dataSources.map((source) => (
              <div key={source.name} className="bg-background rounded-xl p-4 border border-border">
                <h3 className="font-semibold text-ink mb-1">{source.name}</h3>
                <p className="text-ink3 text-sm">{source.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Model */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-mid" />
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">AI Prediction Model</h2>
          </div>
          <p className="text-ink2 leading-relaxed mb-6">
            Our machine learning model is trained on 5+ years of historical IPO data, analyzing patterns across 500+ IPOs to predict listing gains. The model uses an ensemble approach combining gradient boosting and neural networks.
          </p>
          
          {/* Factor Weights */}
          <h3 className="font-semibold text-ink mb-4">Prediction Factors & Weights</h3>
          <div className="space-y-3">
            {modelFactors.map((item) => (
              <div key={item.factor} className="flex items-center gap-4">
                <div className="w-20 flex-shrink-0">
                  <div className="bg-primary-bg rounded-lg px-2 py-1 text-center">
                    <span className="text-primary font-bold text-sm">{item.weight}</span>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-ink">{item.factor}</span>
                  </div>
                  <p className="text-ink3 text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Score */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-emerald-bg flex items-center justify-center">
              <LineChart className="w-5 h-5 text-emerald-mid" />
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Market Sentiment Score</h2>
          </div>
          <p className="text-ink2 leading-relaxed mb-4">
            Our sentiment score ranges from -100 (extremely bearish) to +100 (extremely bullish). It&apos;s calculated by aggregating:
          </p>
          <ul className="space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-mid flex-shrink-0 mt-0.5" />
              <span className="text-ink2">Expert reviews from YouTubers, analysts, and brokerage firms (weighted by historical accuracy)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-mid flex-shrink-0 mt-0.5" />
              <span className="text-ink2">GMP trend direction and momentum over the subscription period</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-mid flex-shrink-0 mt-0.5" />
              <span className="text-ink2">Subscription pattern analysis (early vs late subscription, category-wise trends)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-mid flex-shrink-0 mt-0.5" />
              <span className="text-ink2">News sentiment analysis using NLP on IPO-related articles</span>
            </li>
          </ul>
        </div>

        {/* Accuracy Tracking */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gold-bg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gold-mid" />
            </div>
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Accuracy Tracking</h2>
          </div>
          <p className="text-ink2 leading-relaxed mb-4">
            We believe in accountability. Our prediction accuracy is tracked and published on our Accuracy page. We measure:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-bg rounded-xl p-4 text-center">
              <div className="font-[family-name:var(--font-sora)] text-2xl font-bold text-emerald mb-1">87%</div>
              <div className="text-emerald text-sm">Direction Accuracy</div>
              <p className="text-emerald/70 text-xs mt-1">Correctly predicted gain vs loss</p>
            </div>
            <div className="bg-cobalt-bg rounded-xl p-4 text-center">
              <div className="font-[family-name:var(--font-sora)] text-2xl font-bold text-cobalt mb-1">±8%</div>
              <div className="text-cobalt text-sm">Avg. Deviation</div>
              <p className="text-cobalt/70 text-xs mt-1">Mean absolute error from actual</p>
            </div>
            <div className="bg-primary-bg rounded-xl p-4 text-center">
              <div className="font-[family-name:var(--font-sora)] text-2xl font-bold text-primary mb-1">500+</div>
              <div className="text-primary text-sm">IPOs Analyzed</div>
              <p className="text-primary/70 text-xs mt-1">Historical predictions tracked</p>
            </div>
          </div>
        </div>

        {/* Limitations */}
        <div className="bg-destructive-bg border border-destructive/20 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-destructive">Important Limitations</h2>
          </div>
          <ul className="space-y-2 text-ink2">
            <li>Our predictions are probabilistic estimates, not guarantees. Past accuracy does not guarantee future results.</li>
            <li>Grey market premiums are unofficial and can be manipulated. We aggregate multiple sources to reduce noise.</li>
            <li>Extreme market events (crashes, circuit breakers) can invalidate predictions.</li>
            <li>SME IPOs have higher volatility and lower prediction accuracy compared to mainboard IPOs.</li>
            <li>This is NOT investment advice. Always do your own research and consult a SEBI-registered advisor.</li>
          </ul>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
