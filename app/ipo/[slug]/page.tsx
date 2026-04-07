import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { IPOHero } from '@/components/ipo-detail/ipo-hero';
import { AIPrediction } from '@/components/ipo-detail/ai-prediction';
import { IssueDetails } from '@/components/ipo-detail/issue-details';
import { CompanyFinancials } from '@/components/ipo-detail/company-financials';
import { IPOTabs } from '@/components/ipo-detail/ipo-tabs';
import { ExpertReviews } from '@/components/ipo-detail/expert-reviews';
import { PeerComparison } from '@/components/ipo-detail/peer-comparison';
import { DetailSidebar } from '@/components/ipo-detail/detail-sidebar';
import { PageFooter } from '@/components/ipo-detail/page-footer';
import { getIPOBySlug, getAllIPOSlugs } from '@/lib/supabase/queries';
import { getIPOBySlug as getStaticIPOBySlug, currentIPOs } from '@/lib/data';
import type { Metadata } from 'next';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  
  // Try Supabase first, fallback to static data
  let ipo = await getIPOBySlug(slug);
  if (!ipo) {
    ipo = getStaticIPOBySlug(slug);
  }
  
  if (!ipo) {
    return { title: 'IPO Not Found | IPOGyani' };
  }
  
  return {
    title: `${ipo.name} IPO - GMP, Subscription, AI Prediction | IPOGyani`,
    description: `${ipo.name} IPO details - Live GMP Rs ${ipo.gmp}, subscription ${ipo.subscription.total}x, AI predicted listing gain ${ipo.aiPrediction}%. Price band Rs ${ipo.priceMin}-${ipo.priceMax}.`,
    keywords: `${ipo.name} IPO, ${ipo.name} GMP, ${ipo.name} subscription, ${ipo.name} listing gain prediction`,
  };
}

export async function generateStaticParams() {
  // Try Supabase first
  const slugs = await getAllIPOSlugs();
  
  // Combine with static data slugs for fallback
  const staticSlugs = currentIPOs.map((ipo) => ipo.slug);
  const allSlugs = [...new Set([...slugs, ...staticSlugs])];
  
  return allSlugs.map((slug) => ({
    slug,
  }));
}

export default async function IPODetailPage({ params }: PageProps) {
  const { slug } = await params;
  
  // Try Supabase first, fallback to static data
  let ipo = await getIPOBySlug(slug);
  if (!ipo) {
    ipo = getStaticIPOBySlug(slug);
  }
  
  if (!ipo) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-[12.5px] text-ink3 mb-5">
          <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
          <span className="text-ink4">/</span>
          <Link href="/#current" className="hover:text-foreground transition-colors">Current IPO</Link>
          <span className="text-ink4">/</span>
          <span className="text-foreground font-medium">{ipo.name} IPO</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
          {/* Main Column */}
          <div>
            <IPOHero ipo={ipo} />
            <AIPrediction ipo={ipo} />
            
            {/* Issue Details Section */}
            <IssueDetails ipo={ipo} />
            
            {/* Company Financials Section */}
            <CompanyFinancials ipo={ipo} />
            
            {/* Expert Reviews Section */}
            <div id="expert-reviews-section">
              <ExpertReviews 
                reviews={ipo.expertReviews} 
                ipoName={ipo.name} 
                sentimentScore={ipo.aiPrediction}
                sentimentLabel={ipo.sentimentLabel}
              />
            </div>
            
            {/* Peer Comparison */}
            <PeerComparison ipo={ipo} peers={ipo.peerCompanies} />
            
            {/* Tabs - Overview, Financials, GMP History, Subscription */}
            <IPOTabs ipo={ipo} />
          </div>
          
          {/* Sidebar */}
          <DetailSidebar ipo={ipo} />
        </div>

        {/* Page Footer - Disclaimer & Allotment */}
        <PageFooter ipo={ipo} />
      </main>
      
      <Footer />
    </div>
  );
}
