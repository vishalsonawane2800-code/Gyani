import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { getAllMergedAvailableYears, getMergedListedIposCsv } from "@/lib/listed-ipos/loader"
import { currentIPOs } from "@/lib/data"
import { TrendingUp, TrendingDown, BarChart3, Calculator, ChevronRight, Target, Award, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "IPO Listing Gain 2026 - Historical Data & Expected Returns | IPOGyani",
  description: "Complete IPO listing gain data for 2024-2026. Analyze historical listing gains, calculate expected returns, and understand factors affecting IPO listing performance in India.",
  keywords: "IPO listing gain, listing gain calculator, IPO returns India, expected listing price, IPO performance 2026, listing day gain, IPO profit",
  openGraph: {
    title: "IPO Listing Gain 2026 - Historical Data & Analysis | IPOGyani",
    description: "Comprehensive IPO listing gain analysis with historical data, statistics, and predictions for informed investment decisions.",
    url: "https://ipogyani.com/listing-gain",
    type: "website",
  },
  alternates: {
    canonical: "https://ipogyani.com/listing-gain",
  }
}

// FAQ Schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is IPO listing gain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPO listing gain is the profit or loss made on the first day of trading when an IPO gets listed on the stock exchange. It's calculated as the percentage difference between the listing price and the issue price. A positive listing gain means the stock listed above issue price, while negative means it listed below."
      }
    },
    {
      "@type": "Question",
      "name": "How to calculate expected listing gain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Expected listing gain can be estimated using GMP (Grey Market Premium). Formula: Expected Listing Gain % = (GMP / Issue Price) x 100. For example, if issue price is Rs 100 and GMP is Rs 20, expected listing gain is 20%. However, actual listing may vary based on market conditions."
      }
    },
    {
      "@type": "Question",
      "name": "What factors affect IPO listing gain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Key factors include: 1) Subscription levels - higher oversubscription often leads to better listing, 2) Market conditions - bull markets favor positive listings, 3) Company fundamentals - strong financials attract investors, 4) Sector sentiment - hot sectors command premium, 5) Issue pricing - fairly priced IPOs tend to perform better."
      }
    },
    {
      "@type": "Question",
      "name": "What is the average IPO listing gain in India?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Average IPO listing gain varies by year and market conditions. In bullish years, average gains range from 15-30%, while in bearish markets, many IPOs list flat or negative. SME IPOs typically show higher listing gains (20-50%) compared to mainboard IPOs (10-25%) due to smaller issue sizes."
      }
    }
  ]
}

export default function ListingGainPage() {
  // Fetch all listed IPOs from CSV (both mainboard and SME)
  const years = getAllMergedAvailableYears();
  const allListedIPOs = years.flatMap(y => getMergedListedIposCsv(y));
  
  // Separate 2026 mainboard and SME data
  const year2026Mainboard = allListedIPOs.filter(ipo => {
    const year = new Date(ipo.listingDate).getFullYear();
    return year === 2026 && !ipo.exchange?.includes('SME');
  });
  
  const year2026SME = allListedIPOs.filter(ipo => {
    const year = new Date(ipo.listingDate).getFullYear();
    return year === 2026 && ipo.exchange?.includes('SME');
  });
  
  // Convert CSV records to the shape we need (with exchange field set)
  const convertIPOs = (ipos: typeof allListedIPOs, exchange: string) =>
    ipos.map((ipo, idx) => ({
      id: idx + 1,
      name: ipo.name,
      abbr: ipo.name
        .split(' ')
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'IP',
      bgColor: '#f0f9ff',
      fgColor: '#0369a1',
      exchange: exchange,
      sector: ipo.sector || 'General',
      listDate: ipo.listingDate,
      issuePrice: ipo.issuePriceUpper ?? 0,
      listPrice: ipo.listingPrice ?? 0,
      gainPct: ipo.listingGainPct ?? 0,
      subTimes: ipo.day3Sub ?? 0,
      gmpPeak: '-',
      gmpPredGain: null as any,
      gmpErr: 0,
      aiPred: ipo.aiPrediction ? `${ipo.aiPrediction.toFixed(1)}%` : '-',
      aiErr: 0,
      year: String(ipo.year),
      slug: ipo.slug,
    }));
  
  // All IPOs combined
  const listedIPOs = convertIPOs([...year2026Mainboard, ...year2026SME], 'NSE');
  
  // Mainboard 2026 data
  const mainboardIPOs2026 = convertIPOs(year2026Mainboard, 'NSE');
  
  // SME 2026 data
  const smeIPOs2026 = convertIPOs(year2026SME, 'NSE SME');
  
  // Calculate statistics from all listed IPOs (combined)
  const positiveListings = listedIPOs.filter(ipo => ipo.gainPct > 0)
  const negativeListings = listedIPOs.filter(ipo => ipo.gainPct < 0)
  const avgGain = listedIPOs.length > 0 ? listedIPOs.reduce((sum, ipo) => sum + ipo.gainPct, 0) / listedIPOs.length : 0
  const maxGain = listedIPOs.length > 0 ? Math.max(...listedIPOs.map(ipo => ipo.gainPct)) : 0
  const maxLoss = listedIPOs.length > 0 ? Math.min(...listedIPOs.map(ipo => ipo.gainPct)) : 0
  const successRate = listedIPOs.length > 0 ? (positiveListings.length / listedIPOs.length * 100).toFixed(0) : '0'
  
  // Top gainers and losers overall
  const topGainers = [...listedIPOs].sort((a, b) => b.gainPct - a.gainPct).slice(0, 5)
  const topLosers = [...listedIPOs].sort((a, b) => a.gainPct - b.gainPct).slice(0, 5)
  
  // Mainboard 2026 stats
  const mainboardPositive = mainboardIPOs2026.filter(ipo => ipo.gainPct > 0)
  const mainboardAvg = mainboardIPOs2026.length > 0 
    ? mainboardIPOs2026.reduce((sum, ipo) => sum + ipo.gainPct, 0) / mainboardIPOs2026.length 
    : 0
  const mainboardMaxGain = mainboardIPOs2026.length > 0 
    ? Math.max(...mainboardIPOs2026.map(ipo => ipo.gainPct)) 
    : 0
  const mainboardSuccessRate = mainboardIPOs2026.length > 0 
    ? (mainboardPositive.length / mainboardIPOs2026.length * 100).toFixed(0) 
    : '0'
  const mainboardTopGainers = [...mainboardIPOs2026].sort((a, b) => b.gainPct - a.gainPct).slice(0, 5)
  
  // SME 2026 stats
  const smePositive = smeIPOs2026.filter(ipo => ipo.gainPct > 0)
  const smeAvg = smeIPOs2026.length > 0 
    ? smeIPOs2026.reduce((sum, ipo) => sum + ipo.gainPct, 0) / smeIPOs2026.length 
    : 0
  const smeMaxGain = smeIPOs2026.length > 0 
    ? Math.max(...smeIPOs2026.map(ipo => ipo.gainPct)) 
    : 0
  const smeSuccessRate = smeIPOs2026.length > 0 
    ? (smePositive.length / smeIPOs2026.length * 100).toFixed(0) 
    : '0'
  const smeTopGainers = [...smeIPOs2026].sort((a, b) => b.gainPct - a.gainPct).slice(0, 5)
  
  // Expected listing for current IPOs
  const upcomingWithGMP = currentIPOs.filter(ipo => (ipo.status === 'allot' || ipo.status === 'listing') && ipo.gmp !== undefined)

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
            <span className="text-ink">Listing Gain</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-cobalt-bg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-cobalt" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">IPO Listing Gain Analysis</h1>
          </div>
          <p className="text-ink2 text-lg max-w-3xl">
            Comprehensive analysis of IPO listing gains in India. Track historical performance, understand trends, and make informed decisions based on data-driven insights.
          </p>
        </div>

        {/* Key Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Total IPOs Analyzed</p>
            <p className="text-2xl font-bold text-ink">{listedIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-emerald">{successRate}%</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Avg Listing Gain</p>
            <p className={`text-2xl font-bold ${avgGain >= 0 ? "text-emerald" : "text-destructive"}`}>
              {avgGain >= 0 ? "+" : ""}{avgGain.toFixed(1)}%
            </p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Best Listing</p>
            <p className="text-2xl font-bold text-emerald">+{maxGain.toFixed(1)}%</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Worst Listing</p>
            <p className="text-2xl font-bold text-destructive">{maxLoss.toFixed(1)}%</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm mb-1">Positive Listings</p>
            <p className="text-2xl font-bold text-ink">{positiveListings.length}/{listedIPOs.length}</p>
          </div>
        </div>

        {/* Upcoming Listings Section */}
        {upcomingWithGMP.length > 0 && (
          <section className="bg-cobalt-bg border border-cobalt/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-cobalt" />
              <h2 className="font-heading text-xl font-bold text-ink">Expected Listing Gains (Upcoming)</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingWithGMP.map(ipo => {
                const expectedGain = ipo.priceMax > 0 ? ((ipo.gmp || 0) / ipo.priceMax * 100) : 0
                return (
                  <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="bg-card rounded-xl p-4 border border-border hover:border-cobalt transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-ink">{ipo.name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        ipo.status === "listing" ? "bg-emerald-bg text-emerald" : "bg-gold-bg text-gold"
                      }`}>
                        {ipo.status === "listing" ? "Listing Today" : "Allotment"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-ink3">Expected Gain</span>
                      <span className={`font-bold ${expectedGain >= 0 ? "text-emerald" : "text-destructive"}`}>
                        {expectedGain >= 0 ? "+" : ""}{expectedGain.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm text-ink3">List Date</span>
                      <span className="text-sm text-ink">{ipo.listDate}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        {/* Mainboard vs SME Comparison */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary-bg flex items-center justify-center">
                <Award className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">Mainboard IPOs</h3>
                <p className="text-sm text-ink3">{mainboardIPOs2026.length} IPOs analyzed</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ink2">Average Gain</span>
                <span className={`font-bold ${mainboardAvg >= 0 ? "text-emerald" : "text-destructive"}`}>
                  {mainboardAvg >= 0 ? "+" : ""}{mainboardAvg.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink2">Success Rate</span>
                <span className="font-semibold text-ink">
                  {mainboardIPOs2026.length > 0 ? ((mainboardIPOs2026.filter(i => i.gainPct > 0).length / mainboardIPOs2026.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink2">Best Performer</span>
                <span className="text-emerald font-semibold">
                  +{mainboardIPOs2026.length > 0 ? Math.max(...mainboardIPOs2026.map(i => i.gainPct)).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gold-bg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-heading text-lg font-bold text-ink">SME IPOs</h3>
                <p className="text-sm text-ink3">{smeIPOs2026.length} IPOs analyzed</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-ink2">Average Gain</span>
                <span className={`font-bold ${smeAvg >= 0 ? "text-emerald" : "text-destructive"}`}>
                  {smeAvg >= 0 ? "+" : ""}{smeAvg.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink2">Success Rate</span>
                <span className="font-semibold text-ink">
                  {smeIPOs2026.length > 0 ? ((smeIPOs2026.filter(i => i.gainPct > 0).length / smeIPOs2026.length) * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink2">Best Performer</span>
                <span className="text-emerald font-semibold">
                  +{smeIPOs2026.length > 0 ? Math.max(...smeIPOs2026.map(i => i.gainPct)).toFixed(1) : 0}%
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Top Gainers & Losers */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="bg-emerald-bg px-5 py-4 flex items-center gap-3">
              <ArrowUpRight className="w-5 h-5 text-emerald" />
              <h3 className="font-heading text-lg font-bold text-ink">Top Gainers</h3>
            </div>
            <div className="divide-y divide-border">
              {topGainers.map((ipo, idx) => (
                <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{ipo.name}</p>
                      <p className="text-xs text-ink3">{ipo.exchange} | {ipo.listDate}</p>
                    </div>
                  </div>
                  <span className="font-bold text-emerald">+{ipo.gainPct.toFixed(1)}%</span>
                </Link>
              ))}
            </div>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="bg-destructive-bg px-5 py-4 flex items-center gap-3">
              <ArrowDownRight className="w-5 h-5 text-destructive" />
              <h3 className="font-heading text-lg font-bold text-ink">Worst Performers</h3>
            </div>
            <div className="divide-y divide-border">
              {topLosers.map((ipo, idx) => (
                <Link key={ipo.slug} href={`/ipo/${ipo.slug}`} className="flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive text-sm font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-ink">{ipo.name}</p>
                      <p className="text-xs text-ink3">{ipo.exchange} | {ipo.listDate}</p>
                    </div>
                  </div>
                  <span className="font-bold text-destructive">{ipo.gainPct.toFixed(1)}%</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How Listing Gain Works */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Understanding IPO Listing Gain</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-ink mb-3">What is Listing Gain?</h3>
              <p className="text-ink2 leading-relaxed mb-4">
                Listing gain (or loss) is the profit or loss made when an IPO share opens for trading on the stock exchange. 
                It&apos;s calculated as the difference between the listing price (opening price on day 1) and the issue price you paid during the IPO.
              </p>
              <div className="bg-secondary/50 rounded-xl p-4">
                <p className="text-sm font-medium text-ink mb-2">Formula:</p>
                <p className="font-mono text-ink2">Listing Gain % = ((Listing Price - Issue Price) / Issue Price) x 100</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-ink mb-3">Factors Affecting Listing Gain</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-1" />
                  <span className="text-ink2"><strong className="text-ink">Subscription Rate</strong> - Higher oversubscription typically means better listing</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-1" />
                  <span className="text-ink2"><strong className="text-ink">Market Conditions</strong> - Bull markets favor positive listings</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-1" />
                  <span className="text-ink2"><strong className="text-ink">GMP Trend</strong> - Strong grey market premium indicates demand</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-1" />
                  <span className="text-ink2"><strong className="text-ink">Issue Pricing</strong> - Fairly priced IPOs tend to list better</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Historical Listing Table */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Recent IPO Listing Performance</h2>
            <Link href="/listed" className="text-primary font-medium text-sm hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                    <th className="text-center p-4 text-sm font-medium text-ink2">Type</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Issue Price</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">List Price</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Listing Gain</th>
                    <th className="text-right p-4 text-sm font-medium text-ink2">Subscription</th>
                    <th className="text-center p-4 text-sm font-medium text-ink2">List Date</th>
                  </tr>
                </thead>
                <tbody>
                  {listedIPOs.slice(0, 10).map((ipo, idx) => (
                    <tr key={ipo.slug} className={`${idx !== 9 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                      <td className="p-4">
                        <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                          {ipo.name}
                        </Link>
                        <p className="text-xs text-ink3">{ipo.sector}</p>
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
                      <td className="text-right p-4 text-ink">Rs {ipo.issuePrice}</td>
                      <td className="text-right p-4 text-ink">Rs {ipo.listPrice}</td>
                      <td className="text-right p-4">
                        <div className="flex items-center justify-end gap-1">
                          {ipo.gainPct >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-emerald" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-destructive" />
                          )}
                          <span className={`font-bold ${ipo.gainPct >= 0 ? "text-emerald" : "text-destructive"}`}>
                            {ipo.gainPct >= 0 ? "+" : ""}{ipo.gainPct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right p-4 text-ink">{ipo.subTimes}x</td>
                      <td className="text-center p-4 text-ink3 text-sm">{ipo.listDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Mainboard 2026 Section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Mainboard IPOs 2026</h2>
          </div>
          
          {mainboardIPOs2026.length > 0 ? (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Average Gain</p>
                  <p className={`text-2xl font-bold ${mainboardAvg >= 0 ? "text-emerald" : "text-destructive"}`}>
                    {mainboardAvg >= 0 ? "+" : ""}{mainboardAvg.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-primary">{mainboardSuccessRate}%</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Total IPOs</p>
                  <p className="text-2xl font-bold text-ink">{mainboardIPOs2026.length}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Best Performer</p>
                  <p className="text-2xl font-bold text-emerald">+{mainboardMaxGain.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">Issue Price</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">List Price</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">Listing Gain</th>
                        <th className="text-center p-4 text-sm font-medium text-ink2">List Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mainboardIPOs2026.map((ipo, idx) => (
                        <tr key={ipo.slug} className={`${idx !== mainboardIPOs2026.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                          <td className="p-4">
                            <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                              {ipo.name}
                            </Link>
                            <p className="text-xs text-ink3">{ipo.sector}</p>
                          </td>
                          <td className="text-right p-4 text-ink">Rs {ipo.issuePrice}</td>
                          <td className="text-right p-4 text-ink">Rs {ipo.listPrice}</td>
                          <td className="text-right p-4">
                            <div className="flex items-center justify-end gap-1">
                              {ipo.gainPct >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-emerald" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-destructive" />
                              )}
                              <span className={`font-bold ${ipo.gainPct >= 0 ? "text-emerald" : "text-destructive"}`}>
                                {ipo.gainPct >= 0 ? "+" : ""}{ipo.gainPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-4 text-ink3 text-sm">{ipo.listDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <p className="text-ink2">No mainboard IPOs listed in 2026 yet</p>
            </div>
          )}
        </section>

        {/* SME 2026 Section */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gold-bg flex items-center justify-center">
              <Target className="w-5 h-5 text-gold" />
            </div>
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">SME IPOs 2026</h2>
          </div>
          
          {smeIPOs2026.length > 0 ? (
            <>
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Average Gain</p>
                  <p className={`text-2xl font-bold ${smeAvg >= 0 ? "text-emerald" : "text-destructive"}`}>
                    {smeAvg >= 0 ? "+" : ""}{smeAvg.toFixed(1)}%
                  </p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Success Rate</p>
                  <p className="text-2xl font-bold text-primary">{smeSuccessRate}%</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Total IPOs</p>
                  <p className="text-2xl font-bold text-ink">{smeIPOs2026.length}</p>
                </div>
                <div className="bg-card rounded-xl border border-border p-4">
                  <p className="text-sm text-ink2 mb-1">Best Performer</p>
                  <p className="text-2xl font-bold text-emerald">+{smeMaxGain.toFixed(1)}%</p>
                </div>
              </div>
              
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-secondary">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">Issue Price</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">List Price</th>
                        <th className="text-right p-4 text-sm font-medium text-ink2">Listing Gain</th>
                        <th className="text-center p-4 text-sm font-medium text-ink2">List Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {smeIPOs2026.map((ipo, idx) => (
                        <tr key={ipo.slug} className={`${idx !== smeIPOs2026.length - 1 ? "border-b border-border" : ""} hover:bg-secondary/30 transition-colors`}>
                          <td className="p-4">
                            <Link href={`/ipo/${ipo.slug}`} className="font-medium text-ink hover:text-primary transition-colors">
                              {ipo.name}
                            </Link>
                            <p className="text-xs text-ink3">{ipo.sector}</p>
                          </td>
                          <td className="text-right p-4 text-ink">Rs {ipo.issuePrice}</td>
                          <td className="text-right p-4 text-ink">Rs {ipo.listPrice}</td>
                          <td className="text-right p-4">
                            <div className="flex items-center justify-end gap-1">
                              {ipo.gainPct >= 0 ? (
                                <TrendingUp className="w-4 h-4 text-emerald" />
                              ) : (
                                <TrendingDown className="w-4 h-4 text-destructive" />
                              )}
                              <span className={`font-bold ${ipo.gainPct >= 0 ? "text-emerald" : "text-destructive"}`}>
                                {ipo.gainPct >= 0 ? "+" : ""}{ipo.gainPct.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="text-center p-4 text-ink3 text-sm">{ipo.listDate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-8 text-center">
              <p className="text-ink2">No SME IPOs listed in 2026 yet</p>
            </div>
          )}
        </section>

        {/* Important Note */}
        <section className="bg-gold-bg border border-gold/20 rounded-2xl p-6 mb-8 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-gold flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-ink mb-2">Important Disclaimer</h3>
            <p className="text-ink2 text-sm leading-relaxed">
              Past listing performance does not guarantee future results. IPO investments carry inherent risks including loss of capital. 
              Listing gains are influenced by market conditions, company fundamentals, and investor sentiment which can change rapidly. 
              Always conduct thorough research and consider consulting a financial advisor before making investment decisions.
            </p>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <h2 className="font-heading text-xl md:text-2xl font-bold text-ink mb-6">FAQs about IPO Listing Gain</h2>
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
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">IPO GMP Guide</h3>
            <p className="text-sm text-ink3">Understand Grey Market Premium</p>
          </Link>
          <Link href="/listed" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <BarChart3 className="w-8 h-8 text-cobalt mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Listed IPOs Database</h3>
            <p className="text-sm text-ink3">Complete historical IPO data</p>
          </Link>
          <Link href="/best-ipo" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Award className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Best IPOs to Apply</h3>
            <p className="text-sm text-ink3">Top rated IPOs this month</p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
