import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Database, LineChart, Brain, BarChart3, CheckCircle, AlertTriangle, TrendingUp, Zap, Users, PieChart, History, MessageSquare } from 'lucide-react';

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
  { factor: 'Subscription Ratio', icon: Users, color: 'emerald', description: 'Overall, QIB, NII, and Retail subscription levels' },
  { factor: 'GMP Trend', icon: TrendingUp, color: 'cobalt', description: 'Grey market premium trajectory in the days before listing' },
  { factor: 'Market Conditions', icon: BarChart3, color: 'gold', description: 'Nifty/Sensex trend, sector performance, and volatility' },
  { factor: 'Issue Quality', icon: PieChart, color: 'primary', description: 'Company financials, valuations, and peer comparison' },
  { factor: 'Historical Patterns', icon: History, color: 'emerald', description: 'Similar IPO performance in comparable market conditions' },
  { factor: 'Sentiment Score', icon: MessageSquare, color: 'cobalt', description: 'Expert reviews, news sentiment, and social media analysis' },
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
          
          {/* Prediction Factors */}
          <h3 className="font-semibold text-ink mb-6">Prediction Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modelFactors.map((item) => {
              const IconComponent = item.icon;
              const colorMap: Record<string, { bg: string; text: string }> = {
                emerald: { bg: 'bg-emerald-bg', text: 'text-emerald-mid' },
                cobalt: { bg: 'bg-cobalt-bg', text: 'text-cobalt-mid' },
                gold: { bg: 'bg-gold-bg', text: 'text-gold-mid' },
                primary: { bg: 'bg-primary-bg', text: 'text-primary-mid' },
              };
              const colors = colorMap[item.color as keyof typeof colorMap];
              
              return (
                <div key={item.factor} className="bg-background rounded-xl p-4 border border-border hover:border-border-hover transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`${colors.bg} rounded-lg p-2 flex-shrink-0`}>
                      <IconComponent className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-ink mb-1">{item.factor}</div>
                      <p className="text-ink3 text-sm">{item.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
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
            <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Accuracy Tracking & Accountability</h2>
          </div>
          <p className="text-ink2 leading-relaxed mb-6">
            We believe in complete transparency. Unlike most prediction sites that hide behind vague claims, we track every prediction against actual listing-day gains and publish the full dataset on our <a href="/accuracy" className="text-cobalt hover:underline font-semibold">Accuracy page</a>. No cherry-picking, no survivor bias &mdash; just raw numbers.
          </p>
          <div className="space-y-4 text-ink2 leading-relaxed">
            <div className="flex items-start gap-4">
              <div className="w-5 h-5 rounded-lg bg-emerald-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-emerald-mid" />
              </div>
              <div>
                <div className="font-semibold text-ink mb-1">Head-to-Head vs Last-Day GMP</div>
                <p className="text-sm">Our AI is scored against the grey market premium quoted on the IPO close date &mdash; the number most retail investors actually see. This is the fairest comparison because it&apos;s what traders used to make their decisions before listing.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-5 h-5 rounded-lg bg-cobalt-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-cobalt-mid" />
              </div>
              <div>
                <div className="font-semibold text-ink mb-1">Every Listing Tracked</div>
                <p className="text-sm">We track mainboard and SME listings across the dataset. Error is measured as absolute deviation from the actual listing-day close. Hit rate is &plusmn;5% from actual gain. Direction accuracy measures whether we correctly called gain vs loss.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-5 h-5 rounded-lg bg-gold-bg flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-gold-mid" />
              </div>
              <div>
                <div className="font-semibold text-ink mb-1">No Static Claims</div>
                <p className="text-sm">Rather than claiming fixed accuracy percentages, we publish live dashboards showing year-over-year performance, recent head-to-head comparisons, and the full prediction log. Your investment decisions deserve better than marketing numbers.</p>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <a href="/accuracy" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-bg text-primary font-semibold hover:bg-primary-bg/80 transition-colors">
              View Full Accuracy Dashboard
              <span className="text-sm">→</span>
            </a>
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
