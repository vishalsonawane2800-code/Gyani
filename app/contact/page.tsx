import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Mail, MessageSquare, Clock, Twitter, Linkedin, Youtube } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact IPOGyani - Get in Touch',
  description: 'Contact IPOGyani for support, feedback, or business inquiries. We\'re here to help with your IPO research needs.',
};

const contactMethods = [
  {
    icon: Mail,
    title: 'Email',
    description: 'For general inquiries and support',
    value: 'support@ipogyani.com',
    href: 'mailto:support@ipogyani.com',
  },
  {
    icon: MessageSquare,
    title: 'Business Inquiries',
    description: 'Partnerships and advertising',
    value: 'business@ipogyani.com',
    href: 'mailto:business@ipogyani.com',
  },
];

const faqs = [
  {
    question: 'How accurate are your AI predictions?',
    answer: 'Our AI model has an 87% direction accuracy rate, meaning it correctly predicts whether an IPO will list at a gain or loss. The average deviation from actual listing price is around ±8%. View our full accuracy metrics on the Accuracy page.',
  },
  {
    question: 'Where do you get GMP data?',
    answer: 'We aggregate GMP data from multiple verified dealer networks across India. While GMP is unofficial, we cross-reference multiple sources to provide the most reliable estimates possible.',
  },
  {
    question: 'Is IPOGyani SEBI registered?',
    answer: 'No, IPOGyani is NOT SEBI registered. We are an information platform, not an investment advisor. All content is for educational and informational purposes only. Always consult a SEBI-registered advisor before making investment decisions.',
  },
  {
    question: 'How can I report incorrect data?',
    answer: 'If you spot any data discrepancies, please email us at support@ipogyani.com with details. We verify all reports and correct any errors promptly.',
  },
  {
    question: 'Do you offer API access?',
    answer: 'We are working on a public API for developers and institutions. Contact business@ipogyani.com to join our API waitlist.',
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[1440px] mx-auto px-5 py-8 pb-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-ink mb-4">
            Contact Us
          </h1>
          <p className="text-ink3 text-lg max-w-2xl mx-auto leading-relaxed">
            Have questions, feedback, or need support? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Contact Methods */}
          <div className="lg:col-span-1 space-y-4">
            {contactMethods.map((method) => (
              <a 
                key={method.title}
                href={method.href}
                className="block bg-card border border-border rounded-xl p-6 hover:border-primary/30 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center flex-shrink-0">
                    <method.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-ink mb-1">{method.title}</h3>
                    <p className="text-ink3 text-sm mb-2">{method.description}</p>
                    <span className="text-primary font-medium text-sm">{method.value}</span>
                  </div>
                </div>
              </a>
            ))}

            {/* Response Time */}
            <div className="bg-emerald-bg border border-emerald/20 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-emerald" />
                <h3 className="font-semibold text-emerald">Response Time</h3>
              </div>
              <p className="text-emerald/80 text-sm">
                We typically respond within 24-48 hours on business days.
              </p>
            </div>

            {/* Social Links */}
            <div className="bg-card border border-border rounded-xl p-6">
              <h3 className="font-semibold text-ink mb-4">Follow Us</h3>
              <div className="flex gap-3">
                <a href="#" className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/30 hover:bg-primary-bg transition-all">
                  <Twitter className="w-5 h-5 text-ink3" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/30 hover:bg-primary-bg transition-all">
                  <Linkedin className="w-5 h-5 text-ink3" />
                </a>
                <a href="#" className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center hover:border-primary/30 hover:bg-primary-bg transition-all">
                  <Youtube className="w-5 h-5 text-ink3" />
                </a>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-2xl p-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-6">Frequently Asked Questions</h2>
              <div className="space-y-6">
                {faqs.map((faq, index) => (
                  <div key={index} className={index !== faqs.length - 1 ? 'pb-6 border-b border-border' : ''}>
                    <h3 className="font-semibold text-ink mb-2">{faq.question}</h3>
                    <p className="text-ink3 text-sm leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Banner */}
        <div className="bg-secondary border border-border rounded-2xl p-8 text-center">
          <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-3">Help Us Improve</h2>
          <p className="text-ink2 max-w-xl mx-auto mb-4">
            Your feedback shapes IPOGyani. Let us know what features you&apos;d like to see, what data you need, or how we can make your IPO research easier.
          </p>
          <a 
            href="mailto:feedback@ipogyani.com?subject=Feature Request"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold hover:opacity-90 transition-opacity"
          >
            <MessageSquare className="w-4 h-4" />
            Send Feedback
          </a>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
