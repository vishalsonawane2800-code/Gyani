import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { currentIPOs } from "@/lib/data"
import { Award, TrendingUp, Star, ChevronRight, AlertTriangle, CheckCircle2, XCircle, Target, BarChart3, Users, Zap } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Best IPO to Apply 2026 - Top Rated IPOs This Month | IPOGyani",
  description: "Find the best IPOs to apply in India 2026. Expert analysis, AI predictions, GMP trends, and subscription data to help you pick winning IPOs. Updated daily.",
  keywords: "best IPO to apply, best IPO 2026, top IPO India, should I invest in IPO, IPO recommendations, IPO to buy today, upcoming best IPO",
  openGraph: {
    title: "Best IPO to Apply 2026 - Top Rated IPOs | IPOGyani",
    description: "Expert-curated list of best IPOs to apply based on GMP, subscription, fundamentals, and AI predictions.",
    url: "https://ipogyani.com/best-ipo",
    type: "website",
  },
  alternates: {
    canonical: "https://ipogyani.com/best-ipo",
  }
}

// FAQ Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How to choose the best IPO to apply?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Consider these factors: 1) Company fundamentals - revenue growth, profitability, debt levels, 2) Valuations - P/E ratio compared to peers, 3) GMP trends - positive and stable GMP indicates demand, 4) Subscription levels - higher institutional (QIB) subscription is positive, 5) Industry outlook - growing sectors perform better, 6) Issue pricing - fairly priced IPOs have better listing potential."
      }
    },
    {
      "@type": "Question",
      "name": "Should I apply for every IPO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No, you should not apply for every IPO. Be selective and invest only in IPOs that meet your criteria. Many IPOs list at discount or flat, resulting in losses. Research thoroughly, check GMP, subscription trends, and company fundamentals before applying. Quality over quantity is the key to IPO investing."
      }
    },
    {
      "@type": "Question",
      "name": "Is high GMP a guarantee of good listing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "High GMP is a positive indicator but not a guarantee. GMP can change rapidly before listing and may not reflect actual listing price. Our data shows GMP accuracy is around 65-75%. Always consider GMP along with other factors like subscription, financials, and market conditions for a complete picture."
      }
    },
    {
      "@type": "Question",
      "name": "Are SME IPOs better than Mainboard IPOs?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "SME IPOs often show higher listing gains (20-50%+) but come with higher risk. They have lower liquidity, less regulatory oversight, and higher volatility post-listing. Mainboard IPOs are generally safer with moderate returns. Choose based on your risk appetite - SME for aggressive investors, Mainboard for conservative ones."
      }
    }
  ]
}

// Scoring function
function calculateIPOScore(ipo: typeof currentIPOs[0]): number {
  let score = 50 // Base score
  
  // GMP contribution (max 20 points)
  if (ipo.gmpPercent > 15) score += 20
  else if (ipo.gmpPercent > 10) score += 15
  else if (ipo.gmpPercent > 5) score += 10
  else if (ipo.gmpPercent > 0) score += 5
  else if (ipo.gmpPercent < 0) score -= 10
  
  // Subscription contribution (max 15 points)
  if (ipo.subscription.total > 50) score += 15
  else if (ipo.subscription.total > 20) score += 12
  else if (ipo.subscription.total > 10) score += 8
  else if (ipo.subscription.total > 1) score += 5
  
  // AI Prediction (max 10 points)
  if (ipo.aiPrediction > 15) score += 10
  else if (ipo.aiPrediction > 10) score += 7
  else if (ipo.aiPrediction > 5) score += 5
  else if (ipo.aiPrediction < 0) score -= 5
  
  // Financials (max 10 points)
  if (ipo.financials) {
    if (ipo.financials.roe > 20) score += 5
    if (ipo.financials.debtEquity < 0.5) score += 3
    if (ipo.financials.revenue.fy25 > ipo.financials.revenue.fy24 * 1.2) score += 2
  }
  
  // Sentiment (max 5 points)
  if (ipo.sentimentLabel === 'Bullish') score += 5
  else if (ipo.sentimentLabel === 'Neutral') score += 2
  else score -= 3
  
  return Math.min(100, Math.max(0, score))
}

export default function BestIPOPage() {
  // Filter and score current/upcoming IPOs
  const activeIPOs = currentIPOs.filter(ipo => 
    ipo.status === 'open' || ipo.status === 'lastday' || ipo.status === 'upcoming' || ipo.status === 'allot'
  ).map(ipo => ({
    ...ipo,
    score: calculateIPOScore(ipo)
  })).sort((a, b) => b.score - a.score)

  const recommendedIPOs = activeIPOs.filter(ipo => ipo.score >= 60)
  const neutralIPOs = activeIPOs.filter(ipo => ipo.score >= 40 && ipo.score < 60)
  const avoidIPOs = activeIPOs.filter(ipo => ipo.score < 40)

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      {/* FAQ Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb & Hero */}
        <div className="mb-10">
          <nav className="flex items-center gap-2 text-sm text-ink3 mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-ink">Best IPO</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gold-bg flex items-center justify-center">
              <Award className="w-6 h-6 text-gold" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">Best IPOs to Apply - April 2026</h1>
          </div>
          <p className="text-ink2 text-lg max-w-3xl">
            Data-driven IPO recommendations based on GMP, subscription trends, company fundamentals, and AI predictions. 
            Updated daily to help you make informed investment decisions.
          </p>
        </div>

        {/* Scoring Methodology */}
        <section className="bg-secondary/50 rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-ink">Our Scoring Methodology</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald" />
              <span className="text-ink2"><strong className="text-ink">GMP</strong> (20%)</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-cobalt" />
              <span className="text-ink2"><strong className="text-ink">Subscription</strong> (15%)</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" />
              <span className="text-ink2"><strong className="text-ink">AI Prediction</strong> (10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-ink2"><strong className="text-ink">Financials</strong> (10%)</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-pink-500" />
              <span className="text-ink2"><strong className="text-ink">Sentiment</strong> (5%)</span>
            </div>
          </div>
        </section>

        {/* Recommended IPOs */}
        {recommendedIPOs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-emerald-bg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald" />
              </div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Recommended - Apply</h2>
              <span className="px-2 py-1 bg-emerald-bg text-emerald text-xs font-medium rounded">Score 60+</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedIPOs.map(ipo => (
                <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="bg-card rounded-2xl border border-emerald/30 p-5 hover:border-emerald transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">{ipo.name}</h3>
                      <p className="text-xs text-ink3">{ipo.exchange} | {ipo.sector}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-emerald-bg rounded-lg">
                      <Star className="w-4 h-4 text-emerald fill-emerald" />
                      <span className="font-bold text-emerald">{ipo.score}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-ink3">GMP</p>
                      <p className={`font-semibold ${(ipo.gmp || 0) > 0 ? "text-emerald" : "text-ink"}`}>
                        {(ipo.gmp || 0) > 0 ? "+" : ""}Rs {ipo.gmp} ({ipo.gmpPercent}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink3">AI Prediction</p>
                      <p className={`font-semibold ${ipo.aiPrediction > 0 ? "text-emerald" : "text-destructive"}`}>
                        {ipo.aiPrediction > 0 ? "+" : ""}{ipo.aiPrediction}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink3">Price: Rs {ipo.priceMax}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ipo.status === "open" || ipo.status === "lastday" ? "bg-emerald-bg text-emerald" : "bg-cobalt-bg text-cobalt"
                    }`}>
                      {ipo.status === "lastday" ? "Last Day" : ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                    </span>
                  </div>
                  
                  {ipo.subscription.total > 0 && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs text-ink3">Subscription: <span className="text-ink font-medium">{ipo.subscription.total.toFixed(2)}x</span></p>
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Neutral IPOs */}
        {neutralIPOs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gold-bg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-gold" />
              </div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Neutral - Apply with Caution</h2>
              <span className="px-2 py-1 bg-gold-bg text-gold text-xs font-medium rounded">Score 40-60</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {neutralIPOs.map(ipo => (
                <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="bg-card rounded-2xl border border-gold/30 p-5 hover:border-gold transition-colors group">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">{ipo.name}</h3>
                      <p className="text-xs text-ink3">{ipo.exchange} | {ipo.sector}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-gold-bg rounded-lg">
                      <Star className="w-4 h-4 text-gold" />
                      <span className="font-bold text-gold">{ipo.score}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-ink3">GMP</p>
                      <p className={`font-semibold ${(ipo.gmp || 0) > 0 ? "text-emerald" : (ipo.gmp || 0) < 0 ? "text-destructive" : "text-ink"}`}>
                        {(ipo.gmp || 0) > 0 ? "+" : ""}Rs {ipo.gmp} ({ipo.gmpPercent}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink3">AI Prediction</p>
                      <p className={`font-semibold ${ipo.aiPrediction > 0 ? "text-emerald" : ipo.aiPrediction < 0 ? "text-destructive" : "text-ink"}`}>
                        {ipo.aiPrediction > 0 ? "+" : ""}{ipo.aiPrediction}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink3">Price: Rs {ipo.priceMax.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ipo.status === "open" || ipo.status === "lastday" ? "bg-emerald-bg text-emerald" : "bg-cobalt-bg text-cobalt"
                    }`}>
                      {ipo.status === "lastday" ? "Last Day" : ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Avoid IPOs */}
        {avoidIPOs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-destructive-bg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">High Risk - Consider Avoiding</h2>
              <span className="px-2 py-1 bg-destructive-bg text-destructive text-xs font-medium rounded">Score Below 40</span>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {avoidIPOs.map(ipo => (
                <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="bg-card rounded-2xl border border-destructive/30 p-5 hover:border-destructive transition-colors group opacity-80 hover:opacity-100">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">{ipo.name}</h3>
                      <p className="text-xs text-ink3">{ipo.exchange} | {ipo.sector}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 bg-destructive-bg rounded-lg">
                      <Star className="w-4 h-4 text-destructive" />
                      <span className="font-bold text-destructive">{ipo.score}</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-ink3">GMP</p>
                      <p className={`font-semibold ${(ipo.gmp || 0) > 0 ? "text-emerald" : (ipo.gmp || 0) < 0 ? "text-destructive" : "text-ink"}`}>
                        {(ipo.gmp || 0) > 0 ? "+" : ""}Rs {ipo.gmp} ({ipo.gmpPercent}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-ink3">AI Prediction</p>
                      <p className={`font-semibold ${ipo.aiPrediction > 0 ? "text-emerald" : "text-destructive"}`}>
                        {ipo.aiPrediction > 0 ? "+" : ""}{ipo.aiPrediction}%
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink3">Price: Rs {ipo.priceMax.toLocaleString()}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      ipo.status === "open" || ipo.status === "lastday" ? "bg-emerald-bg text-emerald" : "bg-cobalt-bg text-cobalt"
                    }`}>
                      {ipo.status === "lastday" ? "Last Day" : ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* How to Pick Best IPO */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-ink mb-6">How to Pick the Best IPO to Apply</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald" /> Positive Indicators
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-ink2"><strong className="text-ink">Strong GMP (10%+)</strong> - Indicates market enthusiasm and demand</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-ink2"><strong className="text-ink">High QIB Subscription</strong> - Institutional investors have done research</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-ink2"><strong className="text-ink">Revenue Growth 20%+</strong> - Company is expanding business</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-ink2"><strong className="text-ink">Low Debt-Equity</strong> - Financial stability and room for growth</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center flex-shrink-0">5</span>
                  <span className="text-ink2"><strong className="text-ink">Fair P/E vs Peers</strong> - Not overpriced compared to industry</span>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-destructive" /> Red Flags to Watch
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-ink2"><strong className="text-ink">Zero/Negative GMP</strong> - Weak market demand, avoid or wait</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-ink2"><strong className="text-ink">Low QIB Interest</strong> - Institutions see risks others might miss</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-ink2"><strong className="text-ink">High Debt Levels</strong> - Financial risk and interest burden</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-ink2"><strong className="text-ink">100% OFS</strong> - Promoters cashing out, no growth funds</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center flex-shrink-0">5</span>
                  <span className="text-ink2"><strong className="text-ink">Bearish Market</strong> - Even good IPOs struggle in downtrend</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Disclaimer */}
        <section className="bg-destructive-bg border border-destructive/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-ink mb-2">Investment Disclaimer</h3>
            <p className="text-ink2 text-sm leading-relaxed">
              The ratings and recommendations on this page are based on data analysis and are for informational purposes only. 
              They do not constitute financial advice. IPO investments carry inherent risks including loss of capital. 
              Past performance does not guarantee future results. Always conduct your own research and consider consulting 
              a SEBI-registered financial advisor before making investment decisions.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-ink mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((faq, idx) => (
              <div key={idx} className="border border-border rounded-xl p-4">
                <h3 className="font-semibold text-ink mb-2">{faq.name}</h3>
                <p className="text-ink2 text-sm leading-relaxed">{faq.acceptedAnswer.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Related Links */}
        <section className="grid md:grid-cols-3 gap-4">
          <Link href="/ipo-gmp" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <TrendingUp className="w-8 h-8 text-emerald mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">IPO GMP Today</h3>
            <p className="text-sm text-ink3">Live grey market premium tracker</p>
          </Link>
          <Link href="/subscription-status" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Users className="w-8 h-8 text-cobalt mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Subscription Status</h3>
            <p className="text-sm text-ink3">Real-time subscription data</p>
          </Link>
          <Link href="/listing-gain" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <BarChart3 className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Listing Gain Analysis</h3>
            <p className="text-sm text-ink3">Historical performance data</p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
