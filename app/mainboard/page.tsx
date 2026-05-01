import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { IPOCard } from "@/components/ipo-card"
import { getCurrentIPOs, getListedIPOs } from "@/lib/supabase/queries"
import type { ExchangeType } from "@/lib/data"
import { Building2, TrendingUp, AlertTriangle, Info } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Mainboard IPO 2026 - Live GMP, Subscription & Listing Gains | IPOGyani",
  description: "Complete Mainboard IPO tracker with live GMP, subscription data, and listing gain predictions. Track NSE and BSE mainboard IPOs with real-time updates.",
}

// Force dynamic so newly-migrated IPOs appear immediately instead of waiting for the ISR window.
export const dynamic = "force-dynamic"

const MAINBOARD_EXCHANGES: ExchangeType[] = ["NSE", "BSE"]
const isMainboard = (exchange: string | null | undefined): boolean =>
  !!exchange && MAINBOARD_EXCHANGES.some(mb => !exchange.includes("SME") && exchange.includes(mb))

export default async function MainboardPage() {
  const [liveIpos, listed] = await Promise.all([
    getCurrentIPOs(),
    getListedIPOs(),
  ])

  // Split live (non-listed) mainboard IPOs into Open (currently subscribing) and
  // Upcoming buckets so we match the existing section headers.
  const mainboardLive = liveIpos.filter((ipo) => isMainboard(ipo.exchange))
  const mainboardCurrentIPOs = mainboardLive.filter((ipo) =>
    ["open", "lastday", "closed", "allot", "listing"].includes(ipo.status)
  )
  const mainboardUpcomingIPOs = mainboardLive.filter((ipo) => ipo.status === "upcoming")
  const mainboardListedIPOs = listed.filter((ipo) => isMainboard(ipo.exchange)).slice(0, 6)

  const mainboardListedTotal = listed.filter((ipo) => isMainboard(ipo.exchange)).length

  const avgListingGain =
    mainboardListedIPOs.length > 0
      ? Math.round(
          mainboardListedIPOs.reduce((sum, ipo) => sum + (ipo.gainPct ?? 0), 0) /
            mainboardListedIPOs.length
        )
      : 0

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cobalt-bg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-cobalt" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">Mainboard IPOs</h1>
          </div>
          <p className="text-ink3 ml-13">
            Track NSE and BSE mainboard IPOs with live GMP, subscription data and AI predictions.
          </p>
        </div>

        {/* Mainboard Info Banner */}
        <div className="bg-cobalt-bg border border-cobalt/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-cobalt flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-cobalt font-medium mb-1">Established Companies, Lower Risk</p>
            <p className="text-sm text-ink2">
              Mainboard IPOs are from larger, more established companies with stricter regulations and higher listing requirements. 
              These IPOs generally have better liquidity and lower volatility compared to SME IPOs.
            </p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Open Now</p>
            <p className="text-2xl font-bold text-emerald">{mainboardCurrentIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Upcoming</p>
            <p className="text-2xl font-bold text-cobalt">{mainboardUpcomingIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Listed</p>
            <p className="text-2xl font-bold text-ink">{mainboardListedTotal}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Avg Listing Gain</p>
            <p className="text-2xl font-bold text-emerald">+{avgListingGain}%</p>
          </div>
        </div>

        {/* Current Mainboard IPOs */}
        {mainboardCurrentIPOs.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-ink flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald rounded-full animate-pulse"></span>
                Open Mainboard IPOs
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainboardCurrentIPOs.map((ipo) => (
                <IPOCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          </section>
        )}

        {/* Upcoming Mainboard IPOs */}
        {mainboardUpcomingIPOs.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading text-xl font-bold text-ink">Upcoming Mainboard IPOs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mainboardUpcomingIPOs.map((ipo) => (
                <IPOCard key={ipo.slug} ipo={ipo} />
              ))}
            </div>
          </section>
        )}

        {/* Recently Listed Mainboard IPOs */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-xl font-bold text-ink">Recently Listed Mainboard IPOs</h2>
            <Link 
              href="/listed?type=mainboard" 
              className="text-primary font-medium text-sm hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-ink2 sticky left-0 bg-secondary z-10 min-w-[160px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border">Company</th>
                  <th className="text-center p-4 text-sm font-medium text-ink2 hidden md:table-cell">Exchange</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">Issue Price</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">Listing Gain</th>
                </tr>
              </thead>
              <tbody>
                {mainboardListedIPOs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-6 text-center text-sm text-ink3"
                    >
                      No mainboard IPOs listed yet.
                    </td>
                  </tr>
                )}
                {mainboardListedIPOs.map((ipo, idx) => {
                  const gain = ipo.gainPct ?? 0
                  return (
                    <tr
                      key={ipo.slug}
                      className={`${idx !== mainboardListedIPOs.length - 1 ? "border-b border-border" : ""} group/row`}
                    >
                      <td className="p-4 sticky left-0 bg-card group-hover/row:bg-secondary/30 z-10 min-w-[160px] after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border transition-colors">
                        <Link
                          href={`/ipo/${ipo.slug}`}
                          className="font-medium text-ink hover:text-primary transition-colors"
                        >
                          {ipo.name}
                        </Link>
                        <p className="text-sm text-ink3">{ipo.listDate}</p>
                      </td>
                      <td className="text-center p-4 hidden md:table-cell">
                        <span className="px-2 py-1 bg-secondary rounded text-xs font-medium text-ink2">
                          {ipo.exchange}
                        </span>
                      </td>
                      <td className="text-right p-4 font-medium text-ink">
                        ₹{ipo.issuePrice}
                      </td>
                      <td className="text-right p-4">
                        <span
                          className={`font-bold ${gain >= 0 ? "text-emerald" : "text-destructive"}`}
                        >
                          {gain >= 0 ? "+" : ""}
                          {gain.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Mainboard IPO Guide */}
        <section className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-5 h-5 text-cobalt" />
            <h2 className="font-heading text-lg font-bold text-ink">What are Mainboard IPOs?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 text-sm text-ink2">
            <div>
              <h3 className="font-medium text-ink mb-2">Key Features</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Listed on NSE or BSE mainboard platforms</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Larger companies with strong track record</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Better liquidity and trading volumes</span>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-ink mb-2">Advantages</h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Strict regulatory requirements and scrutiny</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Established market presence and financials</span>
                </li>
                <li className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald flex-shrink-0 mt-0.5" />
                  <span>Lower volatility compared to SME IPOs</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
