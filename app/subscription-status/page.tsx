import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { currentIPOs, listedIPOs } from "@/lib/data"
import { Users, TrendingUp, Clock, ChevronRight, BarChart3, Info, Target, Building2, Briefcase, UserCheck } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "IPO Subscription Status Live 2026 - QIB, NII, Retail Data | IPOGyani",
  description: "Live IPO subscription status for all current IPOs in India 2026. Track QIB, NII, and Retail subscription numbers in real-time. Understand what subscription data means for listing.",
  keywords: "IPO subscription status, IPO subscription live, QIB subscription, NII subscription, retail subscription, IPO oversubscription, subscription times",
  openGraph: {
    title: "IPO Subscription Status Live 2026 | IPOGyani",
    description: "Real-time IPO subscription data with QIB, NII, and Retail breakdowns. Track oversubscription for all current IPOs.",
    url: "https://ipogyani.com/subscription-status",
    type: "website",
  },
  alternates: {
    canonical: "https://ipogyani.com/subscription-status",
  }
}

// FAQ Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is IPO subscription status?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPO subscription status shows how many times an IPO has been subscribed compared to the shares offered. For example, '10x subscribed' means applications were received for 10 times the available shares. Higher subscription indicates stronger demand and typically better listing prospects."
      }
    },
    {
      "@type": "Question",
      "name": "What are QIB, NII, and Retail categories in IPO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "QIB (Qualified Institutional Buyers) includes mutual funds, FIIs, and banks. NII (Non-Institutional Investors) or HNI are investors applying for more than Rs 2 lakh. Retail Individual Investors (RII) apply for up to Rs 2 lakh. Each category has a reserved quota - typically 50% QIB, 15% NII, and 35% Retail."
      }
    },
    {
      "@type": "Question",
      "name": "Does high subscription guarantee listing gains?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "High subscription indicates strong demand but doesn't guarantee listing gains. However, historically, IPOs with subscription above 50x have shown 75%+ positive listing rate. Other factors like market conditions, GMP, and company fundamentals also impact listing performance."
      }
    },
    {
      "@type": "Question",
      "name": "When is IPO subscription data updated?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPO subscription data is updated multiple times during market hours. BSE and NSE release official updates at 10 AM, 12 PM, 3 PM, 5 PM, and final data at 7 PM IST. We update our platform with each release for real-time tracking."
      }
    }
  ]
}

export default function SubscriptionStatusPage() {
  // Current open IPOs
  const openIPOs = currentIPOs.filter(ipo => 
    ipo.status === 'open' || ipo.status === 'lastday'
  )
  
  // Recently closed IPOs with subscription data
  const closedIPOs = currentIPOs.filter(ipo => 
    (ipo.status === 'allot' || ipo.status === 'listing' || ipo.status === 'closed') && 
    ipo.subscription.total > 0
  ).slice(0, 6)

  // Calculate correlation stats
  const highSubIPOs = listedIPOs.filter(ipo => ipo.subTimes > 50)
  const highSubPositive = highSubIPOs.filter(ipo => ipo.gainPct > 0).length
  const highSubSuccessRate = highSubIPOs.length > 0 ? Math.round((highSubPositive / highSubIPOs.length) * 100) : 0

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
            <span className="text-ink">Subscription Status</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-primary-bg flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">IPO Subscription Status Live</h1>
          </div>
          <p className="text-ink2 text-lg max-w-3xl">
            Real-time IPO subscription data for all current and recent IPOs. Track QIB, NII, and Retail investor participation to gauge market demand.
          </p>
        </div>

        {/* Live Subscription Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Open IPOs</p>
            <p className="text-2xl font-bold text-ink">{openIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Highest Subscription</p>
            <p className="text-2xl font-bold text-emerald">
              {openIPOs.length > 0 ? Math.max(...openIPOs.map(i => i.subscription.total)).toFixed(1) : 0}x
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Avg Subscription</p>
            <p className="text-2xl font-bold text-cobalt">
              {openIPOs.length > 0 ? (openIPOs.reduce((sum, i) => sum + i.subscription.total, 0) / openIPOs.length).toFixed(1) : 0}x
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">50x+ Success Rate</p>
            <p className="text-2xl font-bold text-gold">{highSubSuccessRate}%</p>
          </div>
        </div>

        {/* Live IPO Subscription Table */}
        {openIPOs.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-emerald rounded-full animate-pulse" />
                <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Live Subscription Data</h2>
              </div>
              <div className="flex items-center gap-2 text-sm text-ink3">
                <Clock className="w-4 h-4" />
                <span>Updates every hour</span>
              </div>
            </div>
            
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                      <th className="text-center p-4 text-sm font-medium text-ink2">Day</th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">
                        <div className="flex items-center justify-end gap-1">
                          <Briefcase className="w-4 h-4" />
                          QIB
                        </div>
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">
                        <div className="flex items-center justify-end gap-1">
                          <Building2 className="w-4 h-4" />
                          NII
                        </div>
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">
                        <div className="flex items-center justify-end gap-1">
                          <UserCheck className="w-4 h-4" />
                          Retail
                        </div>
                      </th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-ink2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openIPOs.map((ipo, idx) => {
                      const isSme = ipo.exchange === "BSE SME" || ipo.exchange === "NSE SME"
                      const isMainboard = ipo.exchange === "Mainboard"
                      return (
                      <tr
                        key={ipo.slug}
                        className={`${idx !== openIPOs.length - 1 ? "border-b border-border" : ""} transition-colors ${
                          isMainboard ? "bg-gold-bg/40 hover:bg-gold-bg/60" : "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                              {ipo.name}
                            </Link>
                            {isSme && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-destructive-bg text-destructive border border-destructive/40">
                                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                SME IPO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink3">{ipo.exchange} | {ipo.closeDate}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className="px-2 py-1 rounded bg-secondary text-ink2 text-sm font-medium">
                            Day {ipo.subscription.day}
                          </span>
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-semibold ${parseFloat(ipo.subscription.qib) > 1 ? "text-emerald" : "text-ink"}`}>
                            {ipo.subscription.qib}
                          </span>
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-semibold ${parseFloat(ipo.subscription.nii) > 1 ? "text-emerald" : "text-ink"}`}>
                            {ipo.subscription.nii}
                          </span>
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-semibold ${parseFloat(ipo.subscription.retail) > 1 ? "text-emerald" : "text-ink"}`}>
                            {ipo.subscription.retail}
                          </span>
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-bold text-lg ${ipo.subscription.total > 1 ? "text-emerald" : ipo.subscription.total > 0.5 ? "text-gold" : "text-ink"}`}>
                            {ipo.subscription.total.toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ipo.status === "lastday" 
                              ? "bg-destructive-bg text-destructive"
                              : "bg-emerald-bg text-emerald"
                          }`}>
                            {ipo.status === "lastday" ? "Last Day" : "Open"}
                          </span>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Category Explanation */}
        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-cobalt-bg border border-cobalt/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase className="w-6 h-6 text-cobalt" />
              <h3 className="font-semibold text-ink">QIB (50% Quota)</h3>
            </div>
            <p className="text-sm text-ink2 mb-3">
              Qualified Institutional Buyers - Mutual funds, FIIs, insurance companies, banks, and other institutional investors.
            </p>
            <ul className="text-xs text-ink3 space-y-1">
              <li>Minimum investment: Rs 2 Cr+</li>
              <li>Cannot withdraw application</li>
              <li>Indicates institutional confidence</li>
            </ul>
          </div>
          
          <div className="bg-gold-bg border border-gold/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Building2 className="w-6 h-6 text-gold" />
              <h3 className="font-semibold text-ink">NII/HNI (15% Quota)</h3>
            </div>
            <p className="text-sm text-ink2 mb-3">
              Non-Institutional Investors or High Net Worth Individuals investing more than Rs 2 lakh.
            </p>
            <ul className="text-xs text-ink3 space-y-1">
              <li>Investment: Rs 2L - Rs 2 Cr</li>
              <li>Often leverage with IPO funding</li>
              <li>Higher competition = lower allotment</li>
            </ul>
          </div>
          
          <div className="bg-emerald-bg border border-emerald/20 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <UserCheck className="w-6 h-6 text-emerald" />
              <h3 className="font-semibold text-ink">Retail (35% Quota)</h3>
            </div>
            <p className="text-sm text-ink2 mb-3">
              Retail Individual Investors applying for up to Rs 2 lakh worth of shares in the IPO.
            </p>
            <ul className="text-xs text-ink3 space-y-1">
              <li>Maximum investment: Rs 2 lakh</li>
              <li>Allotment by lottery if oversubscribed</li>
              <li>Best odds for small investors</li>
            </ul>
          </div>
        </section>

        {/* Recent Closed IPO Subscriptions */}
        {closedIPOs.length > 0 && (
          <section className="mb-8">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink mb-4">Recent IPO Final Subscription</h2>
            
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">QIB</th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">NII</th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">Retail</th>
                      <th className="text-right p-4 text-sm font-medium text-ink2">Total</th>
                      <th className="text-center p-4 text-sm font-medium text-ink2">GMP</th>
                      <th className="text-center p-4 text-sm font-medium text-ink2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedIPOs.map((ipo, idx) => {
                      const isSme = ipo.exchange === "BSE SME" || ipo.exchange === "NSE SME"
                      const isMainboard = ipo.exchange === "Mainboard"
                      return (
                      <tr
                        key={ipo.slug}
                        className={`${idx !== closedIPOs.length - 1 ? "border-b border-border" : ""} transition-colors ${
                          isMainboard ? "bg-gold-bg/40 hover:bg-gold-bg/60" : "hover:bg-secondary/30"
                        }`}
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                              {ipo.name}
                            </Link>
                            {isSme && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-md bg-destructive-bg text-destructive border border-destructive/40">
                                <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-destructive" />
                                SME IPO
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-ink3">{ipo.exchange}</p>
                        </td>
                        <td className="text-right p-4 font-semibold text-ink">{ipo.subscription.qib}</td>
                        <td className="text-right p-4 font-semibold text-ink">{ipo.subscription.nii}</td>
                        <td className="text-right p-4 font-semibold text-ink">{ipo.subscription.retail}</td>
                        <td className="text-right p-4">
                          <span className={`font-bold ${ipo.subscription.total > 10 ? "text-emerald" : ipo.subscription.total > 1 ? "text-cobalt" : "text-ink"}`}>
                            {ipo.subscription.total.toFixed(2)}x
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <span className={`font-semibold ${(ipo.gmp || 0) > 0 ? "text-emerald" : "text-ink"}`}>
                            {(ipo.gmp || 0) > 0 ? "+" : ""}Rs {ipo.gmp || 0}
                          </span>
                        </td>
                        <td className="text-center p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ipo.status === "listing" 
                              ? "bg-cobalt-bg text-cobalt"
                              : ipo.status === "allot"
                              ? "bg-gold-bg text-gold"
                              : "bg-secondary text-ink2"
                          }`}>
                            {ipo.status === "listing" ? "Listing" : ipo.status === "allot" ? "Allotment" : "Closed"}
                          </span>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Subscription vs Listing Correlation */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Subscription vs Listing Gain Correlation</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <p className="text-ink2 leading-relaxed mb-4">
                Our analysis of {listedIPOs.length}+ IPOs shows a strong correlation between subscription levels and listing performance. 
                Higher oversubscription generally indicates stronger demand and better listing prospects.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-bg rounded-lg">
                  <span className="text-ink font-medium">100x+ Subscription</span>
                  <span className="text-emerald font-bold">~85% positive listing</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-cobalt-bg rounded-lg">
                  <span className="text-ink font-medium">50-100x Subscription</span>
                  <span className="text-cobalt font-bold">~75% positive listing</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gold-bg rounded-lg">
                  <span className="text-ink font-medium">10-50x Subscription</span>
                  <span className="text-gold font-bold">~65% positive listing</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                  <span className="text-ink font-medium">Below 10x Subscription</span>
                  <span className="text-ink2 font-bold">~50% positive listing</span>
                </div>
              </div>
            </div>
            
            <div className="bg-secondary/50 rounded-xl p-5">
              <h3 className="font-semibold text-ink mb-4">Key Insights</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">QIB subscription</strong> is the most reliable indicator - institutions have better research capabilities</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-cobalt flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">Retail rush on last day</strong> often indicates FOMO rather than fundamental analysis</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">SME IPOs</strong> typically see higher subscription but also higher volatility in listing</span>
                </li>
                <li className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-ink3 flex-shrink-0 mt-0.5" />
                  <span className="text-ink2">Subscription alone shouldn&apos;t drive decisions - always check GMP, financials, and market conditions</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Sources Note */}
        <section className="bg-cobalt-bg border border-cobalt/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <Info className="w-6 h-6 text-cobalt flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-ink mb-2">Data Sources</h3>
            <p className="text-ink2 text-sm leading-relaxed">
              Subscription data is sourced from BSE and NSE official updates released at 10 AM, 12 PM, 3 PM, 5 PM, and 7 PM (final) on each IPO day. 
              We update our platform with each release. Minor discrepancies may occur between our data and exchange websites due to timing of updates.
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
          <Link href="/allotment-status" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <BarChart3 className="w-8 h-8 text-emerald mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Allotment Status</h3>
            <p className="text-sm text-ink3">Check your IPO allotment online</p>
          </Link>
          <Link href="/ipo-gmp" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <TrendingUp className="w-8 h-8 text-cobalt mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">IPO GMP Guide</h3>
            <p className="text-sm text-ink3">Understand grey market premium</p>
          </Link>
          <Link href="/listing-gain" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Target className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Listing Gain Analysis</h3>
            <p className="text-sm text-ink3">Historical listing performance</p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
