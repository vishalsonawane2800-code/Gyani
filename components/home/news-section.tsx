import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { newsData } from '@/lib/data';

// Minimal shape consumed by this component. Can be satisfied by either the
// hardcoded `newsData` entries or rows returned from `getMarketNews()`.
export interface NewsSectionItem {
  id: string | number;
  title: string;
  url?: string | null;
  source?: string | null;
  publishedAt?: string | null;
  // Legacy "time" string (e.g. "2h ago") kept for the hardcoded demo rows.
  time?: string;
  tag: string;
  tagColor?: { bg: string; text: string };
  impact?: string | null;
  impactColor?: { bg: string; text: string };
}

// Default color mapping for tags / impacts coming out of the database where
// we do not store colors (only the label strings). Falls back to neutral.
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  ALERT: { bg: '#fdeaec', text: '#d1293d' },
  MARKET: { bg: '#fef3c7', text: '#b45309' },
  IPO: { bg: '#f5f3ff', text: '#7c3aed' },
  REG: { bg: '#eff6ff', text: '#1d4ed8' },
  SME: { bg: '#e6f6f0', text: '#00875a' },
  LISTING: { bg: '#e6f6f0', text: '#00875a' },
};

const IMPACT_COLORS: Record<string, { bg: string; text: string }> = {
  Bullish: { bg: '#e6f6f0', text: '#00875a' },
  Bearish: { bg: '#fdeaec', text: '#d1293d' },
  Caution: { bg: '#fef3c7', text: '#b45309' },
  Watch: { bg: '#f5f3ff', text: '#7c3aed' },
  Neutral: { bg: '#eff6ff', text: '#1d4ed8' },
};

const FALLBACK_COLOR = { bg: '#eff6ff', text: '#1d4ed8' };

function colorForTag(item: NewsSectionItem) {
  if (item.tagColor) return item.tagColor;
  return TAG_COLORS[item.tag?.toUpperCase?.() ?? ''] ?? FALLBACK_COLOR;
}

function colorForImpact(item: NewsSectionItem) {
  if (item.impactColor) return item.impactColor;
  if (!item.impact) return null;
  return IMPACT_COLORS[item.impact] ?? FALLBACK_COLOR;
}

function formatTimeAgo(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString();
}

export function NewsSection({ items }: { items?: NewsSectionItem[] }) {
  // Fall back to hardcoded demo rows only when no prop is supplied. When
  // the caller explicitly passes an empty array (e.g. from the DB) we
  // render an empty state instead of misleading demo content.
  const articles: NewsSectionItem[] =
    items ?? (newsData as unknown as NewsSectionItem[]);

  return (
    <section id="news" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">IPO Market News</h2>
        <Link
          href="/news"
          className="text-xs sm:text-sm font-semibold text-primary hover:opacity-75 transition-opacity"
        >
          All News
        </Link>
      </div>

      {articles.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-sm font-semibold text-ink2">
            No market news yet.
          </p>
          <p className="text-[12.5px] text-ink3 mt-1">
            Add news items from the admin panel and they will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {articles.map((news, index) => {
            const tagColor = colorForTag(news);
            const impactColor = colorForImpact(news);
            const timeLabel = news.time ?? formatTimeAgo(news.publishedAt);
            const borderClass =
              index !== articles.length - 1 ? 'border-b border-border' : '';
            const commonClass = `flex gap-3 items-start p-4 transition-colors ${borderClass}`;
            const content = (
              <>
                {/* Tag pill */}
                <span
                  className="text-xs font-extrabold px-2 py-0.5 rounded-lg shrink-0 mt-0.5"
                  style={{ backgroundColor: tagColor.bg, color: tagColor.text }}
                >
                  {news.tag}
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold leading-snug mb-1">
                    <span className="mr-2">{news.title}</span>
                    {news.impact && impactColor && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg align-middle whitespace-nowrap"
                        style={{
                          backgroundColor: impactColor.bg,
                          color: impactColor.text,
                        }}
                      >
                        {news.impact}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-ink3 flex items-center gap-1">
                    <span>{news.source ?? 'Unknown source'}</span>
                    {timeLabel && (
                      <>
                        <span>-</span>
                        <span>{timeLabel}</span>
                      </>
                    )}
                    {news.url && (
                      <ExternalLink
                        aria-hidden="true"
                        className="h-3 w-3 ml-1 opacity-70"
                      />
                    )}
                  </p>
                </div>
              </>
            );

            if (news.url) {
              return (
                <a
                  key={news.id}
                  href={news.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${commonClass} hover:bg-secondary/50 cursor-pointer`}
                  aria-label={`${news.title} (opens in new tab)`}
                >
                  {content}
                </a>
              );
            }

            return (
              <article
                key={news.id}
                className={`${commonClass} hover:bg-secondary/50`}
              >
                {content}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
