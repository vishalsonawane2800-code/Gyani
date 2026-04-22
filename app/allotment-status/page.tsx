import { Metadata } from "next"
import { Header } from "@/components/header"
import { Ticker } from "@/components/ticker"
import { Footer } from "@/components/footer"
import { type IPO } from "@/lib/data"
import { getCurrentIPOs } from "@/lib/supabase/queries"
import { ClipboardCheck, ExternalLink, ChevronRight, Search, Calendar, Building2, HelpCircle, CheckCircle2, Clock, AlertCircle, Hourglass } from "lucide-react"
import Link from "next/link"

// Always render on the server with fresh data so newly created / status-updated
// IPOs from the admin panel show up immediately on this page (same approach
// used on the homepage for the Current IPOs section).
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "IPO Allotment Status 2026 - Check Online BSE, NSE, Link Intime, KFin | IPOGyani",
  description: "Check IPO allotment status online for all current IPOs. Direct links to BSE, NSE, Link Intime, KFin Technologies, and Bigshare Services registrar portals. Step-by-step guide.",
  keywords: "IPO allotment status, check IPO allotment, BSE IPO allotment, NSE IPO allotment, Link Intime allotment, KFin allotment status, IPO allotment result",
  openGraph: {
    title: "IPO Allotment Status 2026 - Check Online | IPOGyani",
    description: "Check IPO allotment status online with direct links to registrar portals. Complete guide for BSE, NSE, and all registrars.",
    url: "https://ipogyani.com/allotment-status",
    type: "website",
  },
  alternates: {
    canonical: "https://ipogyani.com/allotment-status",
  }
}

// Registrar portals data
const registrars = [
  {
    name: "Link Intime India",
    shortName: "Link Intime",
    url: "https://linkintime.co.in/IPO/public-issues.html",
    logo: "/registrars/linkintime.png",
    description: "One of India's leading registrar and transfer agents",
    color: "bg-cobalt-bg text-cobalt"
  },
  {
    name: "KFin Technologies",
    shortName: "KFin Tech",
    url: "https://ris.kfintech.com/ipostatus/",
    logo: "/registrars/kfintech.png", 
    description: "Technology-driven registrar services provider",
    color: "bg-primary-bg text-primary"
  },
  {
    name: "Bigshare Services",
    shortName: "Bigshare",
    url: "https://ipo.bigshareonline.com/IPO_STATUS.html",
    logo: "/registrars/bigshare.png",
    description: "Registrar for many SME IPOs",
    color: "bg-gold-bg text-gold"
  },
  {
    name: "Skyline Financial Services",
    shortName: "Skyline",
    url: "https://www.skylinerta.com/ipo.php",
    logo: "/registrars/skyline.png",
    description: "Growing registrar with SME focus",
    color: "bg-emerald-bg text-emerald"
  }
]

// Exchange portals
const exchanges = [
  {
    name: "BSE India",
    url: "https://www.bseindia.com/investors/appli_check.aspx",
    description: "Bombay Stock Exchange allotment portal"
  },
  {
    name: "NSE India",
    url: "https://www.nseindia.com/products/dynaContent/equities/ipos/ipo_login.jsp",
    description: "National Stock Exchange allotment portal"
  }
]

// FAQ Schema
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How to check IPO allotment status?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "You can check IPO allotment status through: 1) The registrar's website (Link Intime, KFin, Bigshare), 2) BSE or NSE portal using PAN number or application number, 3) Your broker's app or website. Allotment status is typically available by 6 PM on the allotment date."
      }
    },
    {
      "@type": "Question",
      "name": "When is IPO allotment announced?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "IPO allotment is typically announced within 2-3 working days after the IPO closes. The exact date is mentioned in the IPO timeline. Allotment status is usually available on the registrar's website by 6 PM on the allotment date, and refunds are processed within 1-2 days after allotment."
      }
    },
    {
      "@type": "Question",
      "name": "What details are needed to check IPO allotment?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "To check IPO allotment status, you need any one of the following: 1) PAN Number, 2) Application Number, 3) DP Client ID, or 4) ASBA Account Number. The registrar and exchange portals accept all these identifiers to show your allotment status."
      }
    },
    {
      "@type": "Question",
      "name": "What to do if IPO shares are not allotted?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "If shares are not allotted, the blocked amount in your bank account (through ASBA) will be unblocked within 1-2 working days after allotment. No action is needed from your side - the refund is automatic. Check your bank statement after 2 working days if the amount is still blocked."
      }
    }
  ]
}

// Fallback registrar URLs - used when the IPO record does not have a
// per-IPO allotmentUrl set. Keep in sync with components/ipo-detail/page-footer.tsx.
const registrarUrlMap: Record<string, string> = {
  'KFin Technologies': 'https://kosmic.kfintech.com/ipostatus/',
  'KFIN Technologies': 'https://kosmic.kfintech.com/ipostatus/',
  'Link Intime': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
  'Link Intime India': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
  'Bigshare Services': 'https://www.bigshareonline.com/IPOStatus.aspx',
  'Skyline Financial': 'https://www.skylinerta.com/ipo.php',
  'Skyline Financial Services': 'https://www.skylinerta.com/ipo.php',
  'Cameo Corporate': 'https://ipostatus.cameoindia.com/',
  'MUFG Intime India': 'https://linkintime.co.in/MIPO/Ipoallotment.html',
}

function getAllotmentUrl(ipo: IPO): string | null {
  const perIpo = ipo.allotmentUrl?.trim()
  if (perIpo) return perIpo
  if (ipo.registrar && registrarUrlMap[ipo.registrar]) return registrarUrlMap[ipo.registrar]
  return null
}

type AllotmentBucket = 'out' | 'awaited' | 'upcoming'

// Categorise an IPO for the allotment-status page. We combine the
// editorial `status` with the actual dates so that a "closed" IPO which
// has not yet reached its allotment date is correctly shown as
// "Allotment Awaited" (instead of being dropped from the page).
function categorizeForAllotment(ipo: IPO, today: Date): AllotmentBucket | null {
  const parse = (d: string) => {
    const dt = new Date(d)
    dt.setHours(0, 0, 0, 0)
    return dt
  }
  const allot = parse(ipo.allotmentDate)
  const list = parse(ipo.listDate)

  // Explicit editorial statuses win when set by the admin
  if (ipo.status === 'allot' || ipo.status === 'listing') return 'out'

  if (ipo.status === 'closed') {
    // IPOs that are already listed shouldn't appear on this page
    if (list.getTime() < today.getTime()) return null
    // Allotment date has arrived → allotment is out, listing awaited
    if (allot.getTime() <= today.getTime()) return 'out'
    // Subscription closed but allotment is still pending
    return 'awaited'
  }

  if (ipo.status === 'lastday') {
    // Subscription is closing today → allotment will be awaited
    return 'awaited'
  }

  if (ipo.status === 'open' || ipo.status === 'upcoming') {
    return 'upcoming'
  }

  return null
}

export default async function AllotmentStatusPage() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Pull the live list of current IPOs from Supabase (same source used on the
  // homepage's "Current IPO" section). This ensures the IPOs surfaced here
  // match whatever the admin has published.
  const liveIPOs = await getCurrentIPOs()

  // IPOs whose allotment is finalised (check your status now)
  const allotmentIPOs = liveIPOs.filter(ipo => categorizeForAllotment(ipo, today) === 'out')

  // IPOs whose subscription has closed but allotment hasn't happened yet
  const awaitingAllotment = liveIPOs.filter(ipo => categorizeForAllotment(ipo, today) === 'awaited')

  // IPOs that are open or opening soon – allotment will come later
  const upcomingAllotment = liveIPOs.filter(ipo => categorizeForAllotment(ipo, today) === 'upcoming')

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
            <span className="text-ink">Allotment Status</span>
          </nav>
          
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-bg flex items-center justify-center">
              <ClipboardCheck className="w-6 h-6 text-emerald" />
            </div>
            <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink">Check IPO Allotment Status Online</h1>
          </div>
          <p className="text-ink2 text-lg max-w-3xl">
            Check your IPO allotment status instantly using direct links to registrar portals, BSE, and NSE. 
            Find step-by-step guides and all the information you need.
          </p>
        </div>

        {/* Allotment Out - IPOs whose allotment is finalised */}
        {allotmentIPOs.length > 0 && (
          <section className="bg-emerald-bg border border-emerald/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-emerald" />
              <h2 className="font-heading text-xl font-bold text-ink">Allotment Out — Check Your Status</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {allotmentIPOs.map(ipo => {
                const allotmentUrl = getAllotmentUrl(ipo)
                return (
                  <div key={ipo.slug} className="bg-card rounded-xl p-4 border border-border flex flex-col">
                    <div className="flex items-center justify-between mb-3 gap-2">
                      <h3 className="font-semibold text-ink text-pretty">{ipo.name}</h3>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                        ipo.status === "listing" ? "bg-cobalt-bg text-cobalt" : "bg-emerald-bg text-emerald"
                      }`}>
                        {ipo.status === "listing" ? "Listing Soon" : "Allotment Out"}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-ink3">Registrar</span>
                        <span className="text-ink font-medium text-right">{ipo.registrar}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink3">Allotment Date</span>
                        <span className="text-ink">{ipo.allotmentDate}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-ink3">List Date</span>
                        <span className="text-ink">{ipo.listDate}</span>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-col gap-2">
                      {allotmentUrl && (
                        <a
                          href={allotmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                        >
                          Check on {ipo.registrar?.split(' ')[0] || 'Registrar'}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <Link
                        href={`/ipo/${ipo.slug}`}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-secondary text-ink rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors border border-border"
                      >
                        View IPO Details
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Allotment Awaited - subscription closed, allotment pending */}
        {awaitingAllotment.length > 0 && (
          <section className="bg-gold-bg border border-gold/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Hourglass className="w-6 h-6 text-gold" />
              <h2 className="font-heading text-xl font-bold text-ink">Allotment Awaited</h2>
            </div>
            <p className="text-sm text-ink2 mb-4">
              Subscription is closed for these IPOs. The allotment result will be available on the date shown below.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awaitingAllotment.map(ipo => (
                <div key={ipo.slug} className="bg-card rounded-xl p-4 border border-border flex flex-col">
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <h3 className="font-semibold text-ink text-pretty">{ipo.name}</h3>
                    <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-gold-bg text-gold border border-gold/30">
                      Allotment Awaited
                    </span>
                  </div>
                  <div className="space-y-2 text-sm flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Close Date</span>
                      <span className="text-ink">{ipo.closeDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Allotment Date</span>
                      <span className="text-gold font-medium">{ipo.allotmentDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Registrar</span>
                      <span className="text-ink text-right">{ipo.registrar}</span>
                    </div>
                  </div>
                  <Link
                    href={`/ipo/${ipo.slug}`}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    View IPO Details <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Fallback when there are no current IPOs in any of the above buckets */}
        {allotmentIPOs.length === 0 && awaitingAllotment.length === 0 && (
          <section className="bg-card border border-border rounded-2xl p-6 mb-8 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-cobalt-bg flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-cobalt" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-ink mb-1">No allotments in progress right now</h2>
              <p className="text-sm text-ink2">
                There are no IPOs with allotment out or pending today. Browse upcoming IPOs below, or use the registrar
                links to check an older application. For live subscription data, see the{' '}
                <Link href="/subscription-status" className="text-primary font-medium hover:underline">
                  subscription status
                </Link>{' '}
                page.
              </p>
            </div>
          </section>
        )}

        {/* Upcoming Allotments */}
        {upcomingAllotment.length > 0 && (
          <section className="bg-cobalt-bg border border-cobalt/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-6 h-6 text-cobalt" />
              <h2 className="font-heading text-xl font-bold text-ink">Upcoming Allotments</h2>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAllotment.map(ipo => (
                <Link
                  key={ipo.slug}
                  href={`/ipo/${ipo.slug}`}
                  className="bg-card rounded-xl p-4 border border-border hover:border-cobalt transition-colors group"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-ink text-pretty group-hover:text-cobalt transition-colors">{ipo.name}</h3>
                    <ExternalLink className="w-4 h-4 text-ink3 group-hover:text-cobalt transition-colors shrink-0" />
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Close Date</span>
                      <span className="text-ink">{ipo.closeDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Allotment Date</span>
                      <span className="text-cobalt font-medium">{ipo.allotmentDate}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-ink3">Registrar</span>
                      <span className="text-ink text-right">{ipo.registrar}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Quick Check Section */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Search className="w-6 h-6 text-primary" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">Check Allotment by Registrar</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-4">
            {registrars.map(registrar => (
              <a
                key={registrar.name}
                href={registrar.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl border border-border hover:border-primary transition-colors group"
              >
                <div className={`w-12 h-12 rounded-xl ${registrar.color} flex items-center justify-center`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-ink group-hover:text-primary transition-colors">{registrar.name}</h3>
                  <p className="text-sm text-ink3">{registrar.description}</p>
                </div>
                <ExternalLink className="w-5 h-5 text-ink3 group-hover:text-primary transition-colors" />
              </a>
            ))}
          </div>
        </section>

        {/* Exchange Portals */}
        <section className="grid md:grid-cols-2 gap-6 mb-8">
          {exchanges.map(exchange => (
            <a
              key={exchange.name}
              href={exchange.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card rounded-2xl border border-border p-6 hover:border-primary transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-lg font-bold text-ink group-hover:text-primary transition-colors">{exchange.name}</h3>
                <ExternalLink className="w-5 h-5 text-ink3 group-hover:text-primary transition-colors" />
              </div>
              <p className="text-ink2">{exchange.description}</p>
              <p className="text-sm text-primary mt-2 font-medium">Check Allotment Status</p>
            </a>
          ))}
        </section>

        {/* Step by Step Guide */}
        <section className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <HelpCircle className="w-6 h-6 text-cobalt" />
            <h2 className="font-heading text-xl md:text-2xl font-bold text-ink">How to Check IPO Allotment Status</h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-ink mb-4">Method 1: Via Registrar Website</h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-bg text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-ink2">Find the registrar name for the IPO (shown above)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-bg text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-ink2">Click on the registrar link to visit their portal</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-bg text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-ink2">Select the IPO name from the dropdown</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-bg text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-ink2">Enter your PAN or Application Number</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary-bg text-primary text-sm font-bold flex items-center justify-center flex-shrink-0">5</span>
                  <span className="text-ink2">Click Submit to view your allotment status</span>
                </li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold text-ink mb-4">Method 2: Via BSE/NSE Portal</h3>
              <ol className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cobalt-bg text-cobalt text-sm font-bold flex items-center justify-center flex-shrink-0">1</span>
                  <span className="text-ink2">Visit BSE or NSE allotment status page</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cobalt-bg text-cobalt text-sm font-bold flex items-center justify-center flex-shrink-0">2</span>
                  <span className="text-ink2">Select &quot;Equity&quot; as issue type</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cobalt-bg text-cobalt text-sm font-bold flex items-center justify-center flex-shrink-0">3</span>
                  <span className="text-ink2">Choose the IPO from the list</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cobalt-bg text-cobalt text-sm font-bold flex items-center justify-center flex-shrink-0">4</span>
                  <span className="text-ink2">Enter PAN and solve the captcha</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-cobalt-bg text-cobalt text-sm font-bold flex items-center justify-center flex-shrink-0">5</span>
                  <span className="text-ink2">Submit to see allotment details</span>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* What to Check */}
        <section className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <Calendar className="w-8 h-8 text-primary mb-3" />
            <h3 className="font-semibold text-ink mb-2">Allotment Timeline</h3>
            <ul className="text-sm text-ink2 space-y-1">
              <li>IPO Close + 2-3 days = Allotment</li>
              <li>Status available by 6 PM</li>
              <li>Refund within 1-2 days</li>
              <li>Listing 2-3 days after allotment</li>
            </ul>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-5">
            <ClipboardCheck className="w-8 h-8 text-emerald mb-3" />
            <h3 className="font-semibold text-ink mb-2">Details Required</h3>
            <ul className="text-sm text-ink2 space-y-1">
              <li>PAN Number (most common)</li>
              <li>Application Number</li>
              <li>DP Client ID</li>
              <li>ASBA Account Number</li>
            </ul>
          </div>
          
          <div className="bg-card rounded-xl border border-border p-5">
            <AlertCircle className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-2">If Not Allotted</h3>
            <ul className="text-sm text-ink2 space-y-1">
              <li>Amount unblocked in 1-2 days</li>
              <li>No action needed from you</li>
              <li>Check bank after 2 working days</li>
              <li>Contact bank if still blocked</li>
            </ul>
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
          <Link href="/subscription-status" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Search className="w-8 h-8 text-cobalt mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Subscription Status</h3>
            <p className="text-sm text-ink3">Live subscription data for IPOs</p>
          </Link>
          <Link href="/ipo-gmp" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Building2 className="w-8 h-8 text-emerald mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">IPO GMP Guide</h3>
            <p className="text-sm text-ink3">Understand grey market premium</p>
          </Link>
          <Link href="/listing-gain" className="bg-card rounded-xl border border-border p-5 hover:border-primary transition-colors group">
            <Calendar className="w-8 h-8 text-gold mb-3" />
            <h3 className="font-semibold text-ink mb-1 group-hover:text-primary transition-colors">Listing Gain Analysis</h3>
            <p className="text-sm text-ink3">Historical listing performance</p>
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  )
}
