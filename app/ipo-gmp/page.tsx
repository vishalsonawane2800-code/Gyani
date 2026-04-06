import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { currentIPOs, listedIPOs } from "@/lib/data"
import { TrendingUp, TrendingDown, HelpCircle, BarChart3, Calculator, AlertTriangle, Clock, CheckCircle2, XCircle, ChevronRight } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "IPO GMP Today 2026 - What is Grey Market Premium & How it Works | IPOGyani",
  description: "Complete guide to IPO GMP (Grey Market Premium) in India 2026. Learn what is GMP, how it's calculated, GMP accuracy analysis, and live GMP tracker for all current IPOs.",
  keywords: "IPO GMP, grey market premium, GMP today, IPO GMP meaning, what is GMP in IPO, IPO grey market, GMP calculation, IPO listing prediction",
  openGraph: {
    title: "IPO GMP Today 2026 - Grey Market Premium Guide | IPOGyani",
    description: "Complete guide to IPO GMP with live tracker, accuracy analysis, and expert insights on grey market premium.",
    url: "https://ipogyani.com/ipo-gmp",
    type: "website",
  },
  alternates: {
    canonical: "https://ipogyani.com/ipo-gmp",
  }
}

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is GMP in IPO?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GMP (Grey Market Premium) is the premium at which IPO shares are traded in the unofficial grey market before official listing. It indicates expected listing gains - a positive GMP suggests shares may list above issue price, while negative GMP indicates potential listing below issue price."
      }
    },
    {
      "@type": "Question",
      "name": "How is IPO GMP calculated?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GMP is determined by demand and supply in the grey market. If an IPO is oversubscribed and highly anticipated, buyers offer premium prices for shares before listing. Expected Listing Price = Issue Price + GMP. For example, if issue price is Rs 100 and GMP is Rs 20, expected listing is Rs 120."
      }
    },
    {
      "@type": "Question",
      "name": "Is IPO GMP reliable for investment decisions?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "GMP provides market sentiment indication but is not 100% reliable. Our analysis shows GMP accuracy varies between 60-80% depending on market conditions. GMP can change rapidly before listing, so it should be one of many factors in your investment decision, not the sole criterion."
      }
    },
    {
      "@type": "Question",
      "name": "Where can I check live IPO GMP today?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPOGyani provides live IPO GMP updates every hour for all current mainboard and SME IPOs. Our GMP tracker shows current premium, expected listing price, and historical GMP trends for informed decision making."
      }
    }
  ]
}

export default function IPOGMPGuidePage() {
  const allIPOs = currentIPOs.filter(ipo => ipo.gmp !== undefined && (ipo.status === 'open' || ipo.status === 'lastday' || ipo.status === 'upcoming' || ipo.status === 'allot'))
  
  // Calculate GMP accuracy stats from listed IPOs
  const recentListedIPOs = listedIPOs.slice(0, 20)
  const accurateGMPPredictions = recentListedIPOs.filter(ipo => {
    const gmpNum = parseInt(ipo.gmpPeak.replace(/[^0-9-]/g, '')) || 0
    const gmpPredictedGain = (gmpNum / ipo.issuePrice) * 100
    return Math.abs(gmpPredictedGain - ipo.gainPct) < 10
  }).length
  const gmpAccuracy = Math.round((accurateGMPPredictions / recentListedIPOs.length) * 100)

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
        {/* Hero Section */}
        <div className="mb-10">
          <nav className="flex items-center gap-2 text-sm text-ink3 mb-4">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-ink">IPO GMP Guide</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-bg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-emerald" />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">IPO GMP Today - Grey Market Premium Guide</h1>
            </div>
          </div>
          <p className="text-ink2 text-lg max-w-3xl">
            Complete guide to understanding Grey Market Premium (GMP) in Indian IPOs. Learn what GMP means, how it&apos;s calculated, and track live GMP for all current IPOs in 2026.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Active IPOs</p>
            <p className="text-2xl font-bold text-ink">{allIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Avg GMP</p>
            <p className="text-2xl font-bold text-emerald">
              +{Math.round(allIPOs.reduce((sum, ipo) => sum + (ipo.gmpPercent || 0), 0) / allIPOs.length)}%
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">GMP Accuracy</p>
            <p className="text-2xl font-bold text-cobalt">{gmpAccuracy}%</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Last Updated</p>
            <p className="text-lg font-semibold text-ink">Just Now</p>
          </div>
        </div>

        {/* What is GMP Section */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <HelpCircle className="w-6 h-6 text-cobalt" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">What is IPO GMP (Grey Market Premium)?</h2>
          </div>
          <div className="prose prose-ink max-w-none">
            <p className="text-ink2 leading-relaxed mb-4">
              <strong className="text-ink">Grey Market Premium (GMP)</strong> is the premium amount at which IPO shares are being traded in the unofficial grey market before the official stock exchange listing. The grey market operates outside SEBI regulations and involves informal trading of IPO shares between buyers and sellers.
            </p>
            <p className="text-ink2 leading-relaxed mb-4">
              When an IPO has a <strong className="text-emerald">positive GMP</strong>, it indicates strong demand and suggests the shares may list above the issue price. Conversely, a <strong className="text-destructive">negative GMP</strong> or zero GMP suggests weak demand and potential listing at or below issue price.
            </p>
            <div className="bg-secondary/50 rounded-xl p-4 mt-4">
              <p className="text-sm font-medium text-ink mb-2">Example:</p>
              <p className="text-sm text-ink2">
                If an IPO has issue price of Rs 100 and GMP of Rs 25, the expected listing price would be Rs 125 (a 25% premium). This means grey market traders expect the stock to list 25% above the issue price.
              </p>
            </div>
          </div>
        </section>

        {/* How GMP is Calculated */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">How is IPO GMP Calculated?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-ink2 leading-relaxed mb-4">
                GMP is not officially calculated - it&apos;s determined purely by market forces of demand and supply in the grey market. Key factors that influence GMP include:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">Subscription Numbers</strong> - Higher oversubscription typically leads to higher GMP</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">Company Fundamentals</strong> - Strong financials and growth prospects boost GMP</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">Market Sentiment</strong> - Bull markets generally see higher GMPs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
                  <span className="text-ink2"><strong className="text-ink">Sector Trends</strong> - Hot sectors command premium valuations</span>
                </li>
              </ul>
            </div>
            <div className="bg-primary-bg rounded-xl p-5">
              <h3 className="font-semibold text-ink mb-3">GMP Calculation Formula</h3>
              <div className="space-y-4">
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-sm text-ink3 mb-1">Expected Listing Price</p>
                  <p className="font-mono text-lg text-ink">Issue Price + GMP</p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-sm text-ink3 mb-1">Expected Gain %</p>
                  <p className="font-mono text-lg text-ink">(GMP / Issue Price) x 100</p>
                </div>
                <div className="bg-card rounded-lg p-4 border border-border">
                  <p className="text-sm text-ink3 mb-1">Example Calculation</p>
                  <p className="font-mono text-sm text-ink2">Issue Price: Rs 200, GMP: Rs 40</p>
                  <p className="font-mono text-sm text-emerald">Listing = Rs 240 (+20%)</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Live GMP Table */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-gold" />
              <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Live IPO GMP Today</h2>
            </div>
            <div className="flex items-center gap-2 text-sm text-ink3">
              <Clock className="w-4 h-4" />
              <span>Updated hourly</span>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                    <th className="text-center p-4 text-sm font-medium text-ink2">Type</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Issue Price</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">GMP</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Expected Listing</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Est. Gain</th>
                    <th className="text-center p-4 text-sm font-medium text-ink2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allIPOs.map((ipo, idx) => {
                    const expectedListing = ipo.priceMax + (ipo.gmp || 0)
                    const estGain = ipo.priceMax > 0 ? ((ipo.gmp || 0) / ipo.priceMax * 100).toFixed(1) : "0"
                    
                    return (
                      <tr key={ipo.slug} className={`${idx !== allIPOs.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                        <td className="p-4">
                          <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                            {ipo.name}
                          </Link>
                          <p className="text-sm text-ink3">{ipo.openDate} - {ipo.closeDate}</p>
                        </td>
                        <td className="text-center p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ipo.exchange === "Mainboard" 
                              ? "bg-primary-bg text-primary" 
                              : "bg-gold-bg text-gold"
                          }`}>
                            {ipo.exchange}
                          </span>
                        </td>
                        <td className="text-right p-4 font-medium text-ink">
                          Rs {ipo.priceMax.toLocaleString()}
                        </td>
                        <td className="text-right p-4">
                          <span className={`font-bold ${(ipo.gmp || 0) >= 0 ? "text-emerald" : "text-destructive"}`}>
                            {(ipo.gmp || 0) >= 0 ? "+" : ""}Rs {ipo.gmp}
                          </span>
                        </td>
                        <td className="text-right p-4 font-medium text-ink">
                          Rs {expectedListing.toLocaleString()}
                        </td>
                        <td className="text-right p-4">
                          <div className="flex items-center justify-end gap-1">
                            {parseFloat(estGain) >= 0 ? (
                              <TrendingUp className="w-4 h-4 text-emerald" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-destructive" />
                            )}
                            <span className={`font-bold ${parseFloat(estGain) >= 0 ? "text-emerald" : "text-destructive"}`}>
                              {parseFloat(estGain) >= 0 ? "+" : ""}{estGain}%
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            ipo.status === "open" || ipo.status === "lastday"
                              ? "bg-emerald-bg text-emerald"
                              : ipo.status === "upcoming"
                              ? "bg-cobalt-bg text-cobalt"
                              : "bg-gold-bg text-gold"
                          }`}>
                            {ipo.status === "lastday" ? "Last Day" : ipo.status === "allot" ? "Allotment" : ipo.status.charAt(0).toUpperCase() + ipo.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <Link href="/gmp" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">
              View Complete GMP Tracker <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* GMP Limitations */}
        <section className="bg-gold-bg border border-gold/20 rounded-2xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-gold" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">GMP Limitations & Risks</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">Unregulated Market</strong> - Grey market is illegal and operates outside SEBI regulations</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">No Guarantee</strong> - GMP can change drastically and may not reflect actual listing price</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">Manipulation Risk</strong> - GMP can be artificially inflated or deflated</span>
              </li>
            </ul>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">Market Conditions</strong> - Sudden market crashes can invalidate GMP predictions</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">Limited Data</strong> - GMP sources vary and may not be accurate</span>
              </li>
              <li className="flex items-start gap-3">
                <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <span className="text-ink2"><strong className="text-ink">Short-term Focus</strong> - GMP only predicts listing day, not long-term performance</span>
              </li>
            </ul>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-ink mb-6">Frequently Asked Questions about IPO GMP</h2>
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
          <Link href="/gmp" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <TrendingUp className="w-8 h-8 text-emerald mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Live GMP Tracker</h3>
            <p className="text-sm text-ink3">Real-time GMP updates for all IPOs</p>
          </Link>
          <Link href="/listing-gain" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <BarChart3 className="w-8 h-8 text-cobalt mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Listing Gain Analysis</h3>
            <p className="text-sm text-ink3">Historical listing performance data</p>
          </Link>
          <Link href="/upcoming" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Clock className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Upcoming IPOs</h3>
            <p className="text-sm text-ink3">New IPO calendar and dates</p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
