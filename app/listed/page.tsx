import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { ListedHero } from '@/components/listed/listed-hero';
import { ListedFilters } from '@/components/listed/listed-filters';
import { ListedTable } from '@/components/listed/listed-table';

export const metadata: Metadata = {
  title: 'Listed IPO 2024-2026 - Complete Database | IPOGyani',
  description: 'Complete database of listed IPOs in India from 2024-2026. View listing gain, subscription, GMP history, AI predictions vs actual results for all mainboard and SME IPOs.',
  keywords: 'listed IPO India, IPO listing gain 2026, SME IPO list, mainboard IPO database, IPO performance',
};

export default function ListedPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main>
        <ListedHero />
        
        <div className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
          <ListedFilters />
          <ListedTable />
          
          {/* SEO Content */}
          <section className="mt-8 bg-card border border-border rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold mb-4">
              Listed IPO in India - Complete Database
            </h2>
            <div className="grid md:grid-cols-2 gap-6 text-[13px] text-ink2 leading-relaxed">
              <div>
                <p className="mb-3">
                  IPOGyani maintains a comprehensive database of all mainboard and SME IPOs listed on BSE and NSE from 2024 to 2026. 
                  Each IPO page contains complete data including listing price, listing gain percentage, grey market premium (GMP) history, 
                  subscription numbers, allotment status, financials, and AI-predicted vs actual listing gain.
                </p>
                <p>
                  Our database is updated manually with fresh data from Excel records and cross-verified with BSE/NSE official listing data. 
                  We cover Mainboard IPOs, SME IPOs, REITs and InvITs.
                </p>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-sora)] text-[14px] font-bold text-foreground mb-3">
                  Popular IPO Searches
                </h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    'IPO GMP Today 2026',
                    'SME IPO Listing Gain 2026',
                    'IPO Subscription Data 2025',
                    'Best IPO 2024',
                    'NSE SME IPO List',
                    'BSE SME IPO List',
                  ].map((term) => (
                    <span 
                      key={term}
                      className="text-[11.5px] font-semibold px-3 py-1.5 rounded-lg border border-border text-primary-mid hover:bg-primary-bg cursor-pointer transition-colors"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
