import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Target, TrendingUp, Brain, Users, Shield, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About IPOGyani - India\'s Smartest IPO Research Platform',
  description: 'Learn about IPOGyani, India\'s most intelligent IPO research platform offering live GMP tracking, AI-powered listing predictions, and comprehensive IPO analysis.',
};

const features = [
  {
    icon: TrendingUp,
    title: 'Live GMP Tracking',
    description: 'Real-time grey market premium updates from verified sources across India\'s IPO ecosystem.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Predictions',
    description: 'Advanced machine learning models analyze historical patterns to predict listing gains with high accuracy.',
  },
  {
    icon: Target,
    title: 'Comprehensive Data',
    description: 'Complete IPO database covering mainboard and SME IPOs with subscription status, allotment, and listing details.',
  },
  {
    icon: Users,
    title: 'Expert Reviews',
    description: 'AI-summarized opinions from top YouTubers, analysts, and brokerage firms for every IPO.',
  },
  {
    icon: Shield,
    title: 'Transparent Methodology',
    description: 'Our prediction models and data sources are fully transparent. We track and publish our accuracy metrics.',
  },
  {
    icon: Zap,
    title: 'Real-Time Updates',
    description: 'Stay ahead with instant notifications on subscription status, allotment, and listing price movements.',
  },
];

const stats = [
  { value: '500+', label: 'IPOs Tracked' },
  { value: '87%', label: 'AI Accuracy' },
  { value: '50K+', label: 'Monthly Users' },
  { value: '2019', label: 'Data Since' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-5 py-8 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-ink mb-4">
            About <span className="text-primary-mid">IPOGyani</span>
          </h1>
          <p className="text-ink3 text-lg max-w-2xl mx-auto leading-relaxed">
            India&apos;s most intelligent IPO research platform, helping investors make informed decisions with data-driven insights and AI-powered predictions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-xl p-6 text-center">
              <div className="font-[family-name:var(--font-sora)] text-2xl md:text-3xl font-bold text-primary-mid mb-1">
                {stat.value}
              </div>
              <div className="text-ink3 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Mission */}
        <div className="bg-card border border-border rounded-2xl p-8 mb-12">
          <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Our Mission</h2>
          <p className="text-ink2 leading-relaxed mb-4">
            IPOGyani was founded with a simple mission: to democratize IPO research and make institutional-grade analysis accessible to every retail investor in India.
          </p>
          <p className="text-ink2 leading-relaxed mb-4">
            The Indian IPO market has seen tremendous growth, but retail investors often lack access to comprehensive data and analysis that institutional investors take for granted. We bridge this gap by providing real-time GMP tracking, AI-powered listing predictions, and expert opinion aggregation all in one platform.
          </p>
          <p className="text-ink2 leading-relaxed">
            Our AI models are trained on years of historical IPO data, incorporating factors like subscription rates, market sentiment, GMP trends, and sector performance to deliver accurate listing gain predictions. We believe in transparency and track our prediction accuracy publicly.
          </p>
        </div>

        {/* Features */}
        <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-6 text-center">What We Offer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {features.map((feature) => (
            <div key={feature.title} className="bg-card border border-border rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center mb-4">
                <feature.icon className="w-5 h-5 text-primary-mid" />
              </div>
              <h3 className="font-semibold text-ink mb-2">{feature.title}</h3>
              <p className="text-ink3 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Team */}
        <div className="bg-gradient-to-br from-primary-bg to-cobalt-bg rounded-2xl p-8 text-center">
          <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Built by Investors, for Investors</h2>
          <p className="text-ink2 leading-relaxed max-w-2xl mx-auto">
            Our team combines expertise in quantitative finance, machine learning, and software engineering. We are retail investors ourselves and understand the challenges of navigating the IPO market. Every feature we build is designed to solve real problems we&apos;ve faced.
          </p>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
