import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { StatusBar } from '@/components/status-bar';
import { Footer } from '@/components/footer';
import { MarketSentiment } from '@/components/home/market-sentiment';
import { CurrentIPOs } from '@/components/home/current-ipos';
import { GMPTracker } from '@/components/home/gmp-tracker';
import { AIAccuracy } from '@/components/home/ai-accuracy';
import { NewsSection } from '@/components/home/news-section';
import { Sidebar } from '@/components/home/sidebar';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      <StatusBar />
      
      <main className="max-w-[1440px] mx-auto px-5 py-6 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_312px] gap-6 items-start">
          {/* Main Column */}
          <div>
            <MarketSentiment />
            <CurrentIPOs />
            <GMPTracker />
            <AIAccuracy />
            <NewsSection />
          </div>
          
          {/* Sidebar */}
          <Sidebar />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
