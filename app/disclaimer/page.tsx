import type { Metadata } from 'next';
import { Ticker } from '@/components/ticker';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { AlertTriangle, Info, ShieldAlert, Scale } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Disclaimer - IPOGyani',
  description: 'Important disclaimer regarding IPOGyani content, AI predictions, and investment advice. Read before using our services.',
};

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-background">
      <Ticker />
      <Header />
      
      <main className="max-w-[900px] mx-auto px-5 py-8 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-[family-name:var(--font-sora)] text-3xl md:text-4xl font-bold text-ink mb-4">
            Disclaimer
          </h1>
          <p className="text-ink3">Last updated: April 5, 2026</p>
        </div>

        {/* Important Notice */}
        <div className="bg-destructive-bg border border-destructive/20 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
            <div>
              <h2 className="font-[family-name:var(--font-sora)] text-lg font-bold text-destructive mb-2">Important Notice</h2>
              <p className="text-ink2 leading-relaxed">
                IPOGyani is <strong>NOT</strong> a SEBI-registered investment advisor, research analyst, or stock broker. All information, data, analysis, and AI predictions provided on this platform are for <strong>informational and educational purposes only</strong>. Nothing on this website constitutes investment advice, financial advice, trading advice, or any other advice.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="space-y-8">
            {/* No Investment Advice */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-gold-bg flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-gold" />
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">No Investment Advice</h2>
              </div>
              <p className="text-ink2 leading-relaxed mb-4">
                The content on IPOGyani, including but not limited to GMP data, AI predictions, subscription analysis, expert reviews, and listing gain estimates, should not be construed as investment advice or a recommendation to buy, sell, or hold any securities.
              </p>
              <p className="text-ink2 leading-relaxed">
                Investment decisions carry inherent risks and should be made only after careful consideration of your financial situation, risk tolerance, and investment goals. Always consult with a qualified, SEBI-registered financial advisor before making any investment decisions.
              </p>
            </section>

            {/* AI Predictions */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary-bg flex items-center justify-center">
                  <Info className="w-5 h-5 text-primary-mid" />
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">AI Predictions Disclaimer</h2>
              </div>
              <p className="text-ink2 leading-relaxed mb-4">
                Our AI-powered listing gain predictions are based on historical data, statistical models, and machine learning algorithms. These predictions:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2 mb-4">
                <li>Are probabilistic estimates, NOT guarantees of future performance</li>
                <li>May be significantly incorrect due to unforeseen market conditions</li>
                <li>Are based on past patterns that may not repeat in the future</li>
                <li>Should not be the sole basis for any investment decision</li>
                <li>Have limitations, especially for SME IPOs with lower liquidity</li>
              </ul>
              <p className="text-ink2 leading-relaxed">
                Past prediction accuracy does not guarantee future accuracy. Markets can be volatile and unpredictable.
              </p>
            </section>

            {/* GMP Data */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cobalt-bg flex items-center justify-center">
                  <Info className="w-5 h-5 text-cobalt-mid" />
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Grey Market Premium (GMP) Data</h2>
              </div>
              <p className="text-ink2 leading-relaxed mb-4">
                Grey market premium data presented on IPOGyani:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Is sourced from unofficial grey market dealer networks</li>
                <li>Is NOT verified by any regulatory authority</li>
                <li>May be subject to manipulation or inaccuracies</li>
                <li>Should NOT be relied upon as an indicator of listing performance</li>
                <li>Is provided for informational purposes only</li>
              </ul>
            </section>

            {/* Data Accuracy */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-bg flex items-center justify-center">
                  <Info className="w-5 h-5 text-emerald-mid" />
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Data Accuracy</h2>
              </div>
              <p className="text-ink2 leading-relaxed mb-4">
                While we strive to provide accurate and up-to-date information:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>We do not warrant the accuracy, completeness, or reliability of any data</li>
                <li>Information may contain errors, omissions, or become outdated</li>
                <li>Users should verify critical information from official sources (BSE, NSE, SEBI)</li>
                <li>We are not responsible for any decisions made based on our data</li>
              </ul>
            </section>

            {/* Limitation of Liability */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Scale className="w-5 h-5 text-ink3" />
                </div>
                <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink">Limitation of Liability</h2>
              </div>
              <p className="text-ink2 leading-relaxed mb-4">
                To the fullest extent permitted by law, IPOGyani and its operators, employees, and affiliates shall not be liable for:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Any direct, indirect, incidental, or consequential damages arising from the use of our services</li>
                <li>Any financial losses resulting from investment decisions based on our content</li>
                <li>Any errors, inaccuracies, or omissions in our data or predictions</li>
                <li>Any interruptions or unavailability of our services</li>
                <li>Any actions taken by third parties based on our content</li>
              </ul>
            </section>

            {/* External Links */}
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">External Links</h2>
              <p className="text-ink2 leading-relaxed">
                Our website may contain links to external websites (BSE, NSE, registrars, brokerage firms, etc.). These links are provided for convenience only. We do not endorse, control, or assume responsibility for the content or practices of any linked third-party sites.
              </p>
            </section>

            {/* Regulatory Compliance */}
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Regulatory Status</h2>
              <p className="text-ink2 leading-relaxed mb-4">
                IPOGyani:
              </p>
              <ul className="list-disc pl-6 text-ink2 space-y-2">
                <li>Is NOT registered with SEBI as an Investment Advisor, Research Analyst, or Portfolio Manager</li>
                <li>Does NOT provide personalized investment advice</li>
                <li>Does NOT solicit investments or manage portfolios</li>
                <li>Is purely an informational platform</li>
              </ul>
            </section>

            {/* User Responsibility */}
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">User Responsibility</h2>
              <p className="text-ink2 leading-relaxed">
                By using IPOGyani, you acknowledge that you understand and accept these disclaimers. You agree that you are solely responsible for your investment decisions and any financial outcomes. You agree not to hold IPOGyani liable for any losses or damages.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="font-[family-name:var(--font-sora)] text-xl font-bold text-ink mb-4">Questions</h2>
              <p className="text-ink2 leading-relaxed">
                If you have questions about this disclaimer, please contact us at legal@ipogyani.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
