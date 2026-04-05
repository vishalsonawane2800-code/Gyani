import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { IPOCard } from "@/components/ipo-card"
import { upcomingIPOs } from "@/lib/data"
import { CalendarDays, Bell, Filter } from "lucide-react"

export const metadata: Metadata = {
  title: "Upcoming IPOs 2026 - New IPO Calendar, Dates & Details | IPOGyani",
  description: "Complete list of upcoming IPOs in India 2026. Get IPO dates, price bands, lot sizes, and set reminders for new IPO launches. Never miss an IPO opportunity.",
}

export default function UpcomingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-cobalt-bg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-cobalt" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-ink">Upcoming IPOs</h1>
          </div>
          <p className="text-ink3 ml-13">
            Track all upcoming mainboard and SME IPOs. Set reminders and be the first to apply.
          </p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">This Week</p>
            <p className="text-2xl font-bold text-ink">{upcomingIPOs.filter(i => i.openDate.includes("Apr")).length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">This Month</p>
            <p className="text-2xl font-bold text-ink">{upcomingIPOs.length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">Mainboard</p>
            <p className="text-2xl font-bold text-ink">{upcomingIPOs.filter(i => i.type === "Mainboard").length}</p>
          </div>
          <div className="bg-card rounded-xl p-4 border border-border">
            <p className="text-ink3 text-sm">SME</p>
            <p className="text-2xl font-bold text-ink">{upcomingIPOs.filter(i => i.type === "SME").length}</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-ink2 hover:border-primary transition-colors">
            <Filter className="w-4 h-4" />
            All Types
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-bg border border-primary/20 rounded-lg text-sm text-primary font-medium">
            Mainboard
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm text-ink2 hover:border-primary transition-colors">
            SME
          </button>
          <div className="ml-auto">
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity">
              <Bell className="w-4 h-4" />
              Set All Reminders
            </button>
          </div>
        </div>

        {/* IPO Cards */}
        {upcomingIPOs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingIPOs.map((ipo) => (
              <IPOCard key={ipo.slug} ipo={ipo} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-card rounded-2xl border border-border">
            <CalendarDays className="w-12 h-12 text-ink4 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-ink mb-2">No Upcoming IPOs</h3>
            <p className="text-ink3">Check back soon for new IPO announcements.</p>
          </div>
        )}

        {/* Notification CTA */}
        <div className="mt-12 bg-foreground rounded-2xl p-8 text-center text-white">
          <Bell className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="font-heading text-2xl font-bold mb-2">Never Miss an IPO</h2>
          <p className="text-white/80 mb-6 max-w-md mx-auto">
            Get instant notifications when new IPOs are announced and when subscription opens.
          </p>
          <button className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors">
            Enable Notifications
          </button>
        </div>
      </main>

      <Footer />
    </div>
  )
}
