import { HelpCircle, ChevronDown } from 'lucide-react';
import type { IPO, IPOFAQ } from '@/lib/data';

interface FAQSectionProps {
  ipo: IPO;
}

/**
 * SEO-first FAQ block (chittorgarh / ipoji style).
 *
 * - Pure server component so the FAQ content is present in the HTML payload
 *   (Googlebot indexes it directly).
 * - Uses native <details> / <summary> for the accordion — zero client JS,
 *   fully keyboard-accessible, and Google still renders these as rich
 *   results when paired with FAQPage JSON-LD.
 * - Emits a FAQPage schema block for Google's "People also ask" /
 *   FAQ rich result eligibility.
 * - Hidden entirely when no FAQs have been entered by admin.
 */
export function FAQSection({ ipo }: FAQSectionProps) {
  const faqs = ipo.faqs ?? [];
  if (faqs.length === 0) return null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f: IPOFAQ) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };

  return (
    <section
      id="faq-section"
      aria-labelledby="faq-section-heading"
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 mb-6 scroll-mt-20"
    >
      <header className="flex items-center gap-2 mb-5">
        <div className="p-2 bg-gold-bg border border-gold/10 rounded-lg">
          <HelpCircle className="w-5 h-5 text-gold" />
        </div>
        <div>
          <h2
            id="faq-section-heading"
            className="font-[family-name:var(--font-sora)] text-[16px] font-bold text-ink"
          >
            {ipo.name} IPO — Frequently Asked Questions
          </h2>
          <p className="text-[11px] text-ink3">
            {faqs.length} common questions about this IPO
          </p>
        </div>
      </header>

      <ul className="divide-y divide-border border border-border rounded-xl overflow-hidden">
        {faqs.map((faq, idx) => (
          <li key={idx}>
            <details className="group bg-card open:bg-secondary/40 transition-colors">
              <summary className="cursor-pointer list-none flex items-start justify-between gap-3 px-4 py-3 text-[13.5px] font-semibold text-ink hover:bg-secondary/40 transition-colors">
                <span className="flex-1 text-pretty">
                  <span className="text-ink4 font-mono mr-2">
                    {String(idx + 1).padStart(2, '0')}.
                  </span>
                  {faq.question}
                </span>
                <ChevronDown className="w-4 h-4 text-ink3 mt-1 shrink-0 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-4 pb-4 pt-1 text-[13px] text-ink2 leading-relaxed whitespace-pre-line">
                {faq.answer}
              </div>
            </details>
          </li>
        ))}
      </ul>

      {/* FAQPage JSON-LD for Google rich results */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </section>
  );
}
