import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';

export const metadata: Metadata = {
  title: 'Privacy Policy - IPOGyani',
  description: 'IPOGyani Privacy Policy - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[900px] mx-auto px-5 py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-ink mb-4">
            Privacy Policy
          </h1>
          <p className="text-ink3">Last updated: April 5, 2026</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="prose prose-ink max-w-none">
            {/* Introduction */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Introduction</h2>
              <p className="text-ink2 leading-relaxed mb-4">
                IPOGyani (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website ipogyani.com and use our services.
              </p>
              <p className="text-ink2 leading-relaxed">
                Please read this Privacy Policy carefully. By accessing or using our services, you acknowledge that you have read, understood, and agree to be bound by this Privacy Policy.
              </p>
            </section>

            {/* Information We Collect */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Information We Collect</h2>
              
              <h3 className="font-semibold text-ink mt-4 mb-2">Information You Provide</h3>
              <ul className="list-disc pl-6 text-ink2 space-y-2 mb-4">
                <li>Email address (when subscribing to alerts or newsletters)</li>
                <li>Contact information (when reaching out through our contact form)</li>
                <li>Feedback and correspondence (when you contact us)</li>
              </ul>

              <h3 className="font-semibold text-ink mt-4 mb-2">Information Collected Automatically</h3>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Device information (browser type, operating system)</li>
                <li>IP address and general location</li>
                <li>Pages visited and time spent on pages</li>
                <li>Referring website or source</li>
                <li>Interaction data (clicks, scrolls, feature usage)</li>
              </ul>
            </section>

            {/* How We Use Information */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">How We Use Your Information</h2>
              <p className="text-ink2 leading-relaxed mb-4">We use the information we collect to:</p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Provide, maintain, and improve our services</li>
                <li>Send IPO alerts and notifications (if you&apos;ve opted in)</li>
                <li>Respond to your inquiries and support requests</li>
                <li>Analyze usage patterns to enhance user experience</li>
                <li>Detect and prevent fraud or abuse</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            {/* Cookies */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Cookies and Tracking</h2>
              <p className="text-ink2 leading-relaxed mb-4">
                We use cookies and similar tracking technologies to collect information about your browsing activities. These include:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for basic site functionality</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our site (via Vercel Analytics)</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
              </ul>
              <p className="text-ink2 leading-relaxed mt-4">
                You can control cookies through your browser settings. Disabling certain cookies may limit your ability to use some features.
              </p>
            </section>

            {/* Data Sharing */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Information Sharing</h2>
              <p className="text-ink2 leading-relaxed mb-4">
                We do not sell, trade, or rent your personal information. We may share your information only in these circumstances:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our website (hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            {/* Data Security */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Data Security</h2>
              <p className="text-ink2 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            {/* Your Rights */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Your Rights</h2>
              <p className="text-ink2 leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Access the personal information we hold about you</li>
                <li>Request correction of inaccurate information</li>
                <li>Request deletion of your personal information</li>
                <li>Opt-out of marketing communications</li>
                <li>Withdraw consent where we rely on consent for processing</li>
              </ul>
              <p className="text-ink2 leading-relaxed mt-4">
                To exercise these rights, contact us at privacy@ipogyani.com.
              </p>
            </section>

            {/* Third-Party Links */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Third-Party Links</h2>
              <p className="text-ink2 leading-relaxed">
                Our website may contain links to third-party websites (BSE, NSE, registrars, etc.). We are not responsible for the privacy practices of these external sites. We encourage you to review their privacy policies.
              </p>
            </section>

            {/* Children */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Children&apos;s Privacy</h2>
              <p className="text-ink2 leading-relaxed">
                Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If we learn we have collected information from a child, we will delete it promptly.
              </p>
            </section>

            {/* Changes */}
            <section className="mb-8">
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Changes to This Policy</h2>
              <p className="text-ink2 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of our services after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Contact Us</h2>
              <p className="text-ink2 leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-background rounded-xl p-4 mt-4">
                <p className="text-ink font-medium">IPOGyani</p>
                <p className="text-ink2">Email: privacy@ipogyani.com</p>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
