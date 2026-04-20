'use client';

import { useState } from 'react';
import { Building2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import type { IPO } from '@/lib/data';

interface IPOAboutProps {
  ipo: IPO;
}

/**
 * Public "About Company" + "About IPO" long-form blocks.
 *
 * - Starts collapsed (~5 lines visible via line-clamp) so the cards don't
 *   spread all over the IPO page.
 * - "Read more" expands the full content inline.
 * - Emits an Organization JSON-LD schema so search engines can pick up
 *   structured company data.
 * - If no long-form copy is set by admin, falls back to the short
 *   `aboutCompany` summary and hides the IPO-specific card.
 */
export function IPOAbout({ ipo }: IPOAboutProps) {
  const companyCopy = ipo.companyDetails?.trim() || ipo.aboutCompany?.trim() || '';
  const ipoCopy = ipo.ipoDetailsLong?.trim() || '';

  // If neither is set we render nothing (keeps the page clean for thin IPOs).
  if (!companyCopy && !ipoCopy) {
    return null;
  }

  // Organization schema for SEO (only when we actually have company copy).
  const orgSchema = companyCopy
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: `${ipo.name} Ltd`,
        description: ipo.aboutCompany || companyCopy.slice(0, 300),
        industry: ipo.sector,
        url: `https://ipogyani.com/ipo/${ipo.slug}`,
      }
    : null;

  return (
    <section
      id="about-section"
      className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 scroll-mt-20"
    >
      {companyCopy && (
        <ReadMoreCard
          title={`About ${ipo.name}`}
          subtitle={ipo.sector}
          icon={<Building2 className="w-4 h-4 text-cobalt" />}
          accentBg="bg-cobalt-bg"
          accentBorder="border-cobalt/10"
          content={companyCopy}
        />
      )}

      {ipoCopy && (
        <ReadMoreCard
          title={`About ${ipo.name} IPO`}
          subtitle="Issue structure, view & risks"
          icon={<TrendingUp className="w-4 h-4 text-emerald" />}
          accentBg="bg-emerald-bg"
          accentBorder="border-emerald/10"
          content={ipoCopy}
        />
      )}

      {orgSchema && (
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      )}
    </section>
  );
}

interface ReadMoreCardProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  accentBg: string;
  accentBorder: string;
  content: string;
}

function ReadMoreCard({
  title,
  subtitle,
  icon,
  accentBg,
  accentBorder,
  content,
}: ReadMoreCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Split on blank-line paragraphs for nicer formatting when expanded.
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Threshold: only show "Read more" toggle when content is actually long.
  const isLong = content.length > 320 || paragraphs.length > 1;

  return (
    <article className="bg-card border border-border rounded-2xl p-5 card-shadow flex flex-col">
      <header className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 ${accentBg} ${accentBorder} border rounded-lg`}>
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold text-ink leading-tight truncate">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[11px] text-ink3 truncate">{subtitle}</p>
          )}
        </div>
      </header>

      <div
        className={`text-[13px] text-ink2 leading-relaxed space-y-3 ${
          !expanded && isLong ? 'line-clamp-5' : ''
        }`}
      >
        {paragraphs.map((p, idx) => (
          <p key={idx} className="text-pretty">
            {p}
          </p>
        ))}
      </div>

      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold text-primary hover:text-primary-dark transition-colors self-start"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Read less <ChevronUp className="w-3.5 h-3.5" />
            </>
          ) : (
            <>
              Read more <ChevronDown className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </article>
  );
}
