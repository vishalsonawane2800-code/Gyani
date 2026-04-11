import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { HeroSection } from '@/components/home/hero-section';
import { MarketSentiment } from '@/components/home/market-sentiment';
import { CurrentIPOs } from '@/components/home/current-ipos';
import { ListedIPOs } from '@/components/home/listed-ipos';
import { GMPTracker } from '@/components/home/gmp-tracker';
import { NewsSection } from '@/components/home/news-section';
import { Sidebar } from '@/components/home/sidebar';
import { getCurrentIPOs, getListedIPOs } from '@/lib/supabase/queries';
import { currentIPOs as fallbackIPOs, listedIPOs as fallbackListedIPOs } from '@/lib/data';
import Link from 'next/link';

const allPages = [
  { href: '/', label: 'Home' },
  { href: '/ipo-gmp', label: 'IPO GMP Guide' },
  { href: '/gmp', label: 'GMP Tracker' },
  { href: '/listing-gain', label: 'Listing Gain' },
  { href: '/best-ipo', label: 'Best IPO' },
  { href: '/allotment-status', label: 'Allotment Status' },
  { href: '/subscription-status', label: 'Subscription Status' },
  { href: '/upcoming', label: 'Upcoming IPOs' },
  { href: '/listed', label: 'Listed IPOs' },
  { href: '/sme', label: 'SME IPOs' },
  { href: '/shareholder-quota', label: 'Shareholder Quota' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/accuracy', label: 'AI Accuracy' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/disclaimer', label: 'Disclaimer' },
];

export default async function HomePage() {
  // Fetch data from Supabase with fallback to static data
  let ipos = await getCurrentIPOs();
  let listedIpos = await getListedIPOs({ limit: 10 });
  
  // Use fallback data if Supabase returns empty (no data seeded yet)
  if (ipos.length === 0) {
    ipos = fallbackIPOs;
  }
  if (listedIpos.length === 0) {
    listedIpos = fallbackListedIPOs;
  }
  
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />
      <HeroSection ipos={ipos} />
      
      <main className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_312px] gap-6 items-start">
          {/* Main Column */}
          <div className="min-w-0">
            <MarketSentiment />
            <CurrentIPOs ipos={ipos} />
            <ListedIPOs listedIpos={listedIpos} />
            <GMPTracker ipos={ipos} />
            <NewsSection />
          </div>
          
          {/* Sidebar */}
          <Sidebar />
        </div>
      </main>
      
      {/* Quick Links to All Pages */}
      <div className="max-w-[1440px] mx-auto px-5 py-6">
        <div className="bg-card rounded-xl border border-border p-4">
          <h2 className="font-semibold text-ink mb-3">All Pages (Quick Links)</h2>
          <div className="flex flex-wrap gap-2">
            {allPages.map((page) => (
              <Link 
                key={page.href} 
                href={page.href}
                className="px-3 py-1.5 bg-secondary hover:bg-primary hover:text-white rounded-lg text-sm text-ink2 transition-colors"
              >
                {page.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
