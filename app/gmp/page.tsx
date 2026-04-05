import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { currentIPOs, upcomingIPOs } from "@/lib/data"
import { TrendingUp, TrendingDown, Clock, AlertCircle, Info } from "lucide-react"
import Link from "next/link"

export const metadata: Metadata = {
  title: "IPO GMP Today 2026 - Live Grey Market Premium Tracker | IPOGyani",
  description: "Live IPO Grey Market Premium (GMP) tracker for all current and upcoming IPOs in India 2026. Real-time GMP updates, expected listing gains, and trend analysis.",
}

export default function GMPPage() {
  const allIPOs = [...currentIPOs, ...upcomingIPOs].filter(ipo => ipo.gmp !== undefined)
  
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-bg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">IPO GMP Today</h1>
          </div>
          <p className="text-ink3 ml-13">
            Live Grey Market Premium for all current and upcoming IPOs. Updated every hour.
          </p>
        </div>

        {/* GMP Disclaimer */}
        <div className="bg-cobalt-bg border border-cobalt/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <Info className="w-5 h-5 text-cobalt flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-cobalt font-medium mb-1">About Grey Market Premium (GMP)</p>
            <p className="text-sm text-ink2">
              GMP is an unofficial indicator of expected listing price. It&apos;s based on grey market trading and 
              should not be the sole factor in your investment decision. GMP can change rapidly and may not 
              reflect actual listing performance.
            </p>
          </div>
        </div>

        {/* Last Updated */}
        <div className="flex items-center gap-2 text-sm text-ink3 mb-6">
          <Clock className="w-4 h-4" />
          <span>Last updated: {new Date().toLocaleString("en-IN", { 
            day: "numeric", 
            month: "short", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          })}</span>
        </div>

        {/* GMP Table */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-secondary">
                <tr>
                  <th className="text-left p-4 text-sm font-medium text-ink2">IPO Name</th>
                  <th className="text-center p-4 text-sm font-medium text-ink2">Type</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">Price Band</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">GMP</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">Expected Listing</th>
                  <th className="text-right p-4 text-sm font-medium text-ink2">Est. Gain</th>
                  <th className="text-center p-4 text-sm font-medium text-ink2">Status</th>
                </tr>
              </thead>
              <tbody>
                {allIPOs.map((ipo, idx) => {
                  const priceNum = ipo.priceMax
                  const expectedListing = priceNum + (ipo.gmp || 0)
                  const estGain = priceNum > 0 ? ((ipo.gmp || 0) / priceNum * 100).toFixed(1) : "0"
                  const priceRange = ipo.priceMin === ipo.priceMax 
                    ? `₹${ipo.priceMax}` 
                    : `₹${ipo.priceMin} - ₹${ipo.priceMax}`
                  
                  return (
                    <tr key={ipo.slug} className={idx !== allIPOs.length - 1 ? "border-b border-border" : ""}>
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
                        {priceRange}
                      </td>
                      <td className="text-right p-4">
                        <span className={`font-bold ${(ipo.gmp || 0) >= 0 ? "text-emerald" : "text-destructive"}`}>
                          {(ipo.gmp || 0) >= 0 ? "+" : ""}₹{ipo.gmp}
                        </span>
                      </td>
                      <td className="text-right p-4 font-medium text-ink">
                        ₹{expectedListing}
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
                          ipo.status === "Open" 
                            ? "bg-emerald-bg text-emerald"
                            : ipo.status === "Upcoming"
                            ? "bg-cobalt-bg text-cobalt"
                            : "bg-secondary text-ink2"
                        }`}>
                          {ipo.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* GMP Guide */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-heading text-lg font-bold text-ink mb-4">How to Read GMP</h2>
            <ul className="space-y-3 text-sm text-ink2">
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-bg text-emerald flex items-center justify-center text-xs font-bold flex-shrink-0">+</span>
                <span><strong className="text-ink">Positive GMP</strong> indicates expected listing above issue price</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-destructive-bg text-destructive flex items-center justify-center text-xs font-bold flex-shrink-0">-</span>
                <span><strong className="text-ink">Negative GMP</strong> indicates expected listing below issue price</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-ink3 flex items-center justify-center text-xs font-bold flex-shrink-0">0</span>
                <span><strong className="text-ink">Zero GMP</strong> indicates expected listing at or near issue price</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-card rounded-2xl border border-border p-6">
            <h2 className="font-heading text-lg font-bold text-ink mb-4">GMP Limitations</h2>
            <ul className="space-y-3 text-sm text-ink2">
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0" />
                <span>GMP is unofficial and based on grey market activity</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0" />
                <span>It can change rapidly based on market sentiment</span>
              </li>
              <li className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-gold flex-shrink-0" />
                <span>Past GMP accuracy varies - not a guaranteed indicator</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
