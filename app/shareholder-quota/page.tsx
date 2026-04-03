import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { shareholderQuotaIPOs } from "@/lib/data"
import { Users, TrendingUp } from "lucide-react"

export const metadata: Metadata = {
  title: "Shareholder Quota IPOs 2026 - Promoter Offers | IPOGyani",
  description: "Complete list of shareholder quota IPOs in India 2026. Track promoter and shareholder purchase offers with pricing and allocation details.",
}

export default function ShareholderQuotaPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-purple-bg flex items-center justify-center">
              <Users className="w-5 h-5 text-purple" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">Shareholder Quota IPOs</h1>
          </div>
          <p className="text-ink3 ml-13">
            Track promoter and shareholder quota offerings. Apply for shareholder purchase opportunities in upcoming IPOs.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Total Offerings</p>
            <p className="text-2xl font-bold text-ink">{shareholderQuotaIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Upcoming</p>
            <p className="text-2xl font-bold text-ink">{shareholderQuotaIPOs.filter(i => i.status === 'upcoming').length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Total Issue Size</p>
            <p className="text-2xl font-bold text-ink">₹{shareholderQuotaIPOs.reduce((sum, i) => sum + i.issueSizeCr, 0).toFixed(0)} Cr</p>
          </div>
        </div>

        {/* Shareholder Quota IPOs Grid */}
        {shareholderQuotaIPOs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shareholderQuotaIPOs.map((ipo) => (
              <div key={ipo.slug} className="bg-card rounded-xl border border-border p-6 hover:border-primary/50 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: ipo.bgColor, color: ipo.fgColor }}
                  >
                    {ipo.abbr}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-primary-bg text-primary">
                    {ipo.exchange}
                  </span>
                </div>

                {/* Company Info */}
                <h3 className="font-semibold text-ink mb-1">{ipo.name}</h3>
                <p className="text-[13px] text-ink3 mb-4">{ipo.sector}</p>

                {/* Key Details */}
                <div className="space-y-3 mb-4 pb-4 border-b border-border">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink3">Price Range:</span>
                    <span className="font-semibold text-ink">₹{ipo.priceMin} - ₹{ipo.priceMax}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink3">Lot Size:</span>
                    <span className="font-semibold text-ink">{ipo.lotSize}</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink3">Issue Size:</span>
                    <span className="font-semibold text-ink">₹{ipo.issueSizeCr} Cr</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink3">Registrar:</span>
                    <span className="font-semibold text-ink text-right">{ipo.registrar}</span>
                  </div>
                </div>

                {/* Dates */}
                <div className="space-y-2 mb-4 text-[12px]">
                  <div>
                    <p className="text-ink3 mb-1">Open Date</p>
                    <p className="font-semibold text-ink">{new Date(ipo.openDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-ink3 mb-1">Close Date</p>
                    <p className="font-semibold text-ink">{new Date(ipo.closeDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                  </div>
                </div>

                {/* About */}
                <p className="text-[12px] text-ink3 mb-4 line-clamp-2">{ipo.aboutCompany}</p>

                {/* CTA Button */}
                <button className="w-full py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-[13px] hover:bg-primary-mid transition-colors">
                  View Details
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <TrendingUp className="w-12 h-12 text-ink4 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">No Shareholder Quota IPOs</h3>
            <p className="text-ink3">Check back soon for new shareholder quota offerings.</p>
          </div>
        )}

        {/* Information Section */}
        <div className="mt-12 bg-card border border-border rounded-2xl p-6">
          <h2 className="font-heading text-lg font-bold text-ink mb-4">About Shareholder Quota IPOs</h2>
          <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
            <div>
              <p className="mb-3">
                Shareholder quota IPOs allow existing shareholders and promoters to participate in IPO allocations at preferential rates. 
                These offerings are separate from retail, institutional, and non-institutional investor quotas and are reserved exclusively for qualified shareholders.
              </p>
            </div>
            <div>
              <p className="mb-3">
                Investors eligible for shareholder quota participation must meet specific criteria set by the company and SEBI regulations. 
                Allocation is based on shareholding percentage and other factors determined by the company.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
