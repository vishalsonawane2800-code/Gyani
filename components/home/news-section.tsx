import Link from 'next/link';
import { newsData } from '@/lib/data';

export function NewsSection() {
  return (
    <section id="news" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">
          IPO Market News
        </h2>
        <Link href="/news" className="text-xs sm:text-sm font-semibold text-primary hover:opacity-75 transition-opacity">
          All News
        </Link>
      </div>

      {/* News List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {newsData.map((news, index) => (
          <article 
            key={news.id}
            className={`flex gap-3 items-start p-4 hover:bg-secondary/50 transition-colors cursor-pointer ${
              index !== newsData.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            {/* Tag */}
            <span 
              className="text-xs font-extrabold px-2 py-0.5 rounded-lg shrink-0 mt-0.5"
              style={{ backgroundColor: news.tagColor.bg, color: news.tagColor.text }}
            >
              {news.tag}
            </span>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold leading-snug mb-1">
                {news.title}
                <span 
                  className="text-xs font-bold px-2 py-0.5 rounded-lg ml-2 align-middle"
                  style={{ backgroundColor: news.impactColor.bg, color: news.impactColor.text }}
                >
                  {news.impact}
                </span>
              </h3>
              <p className="text-xs text-ink3">
                {news.source} - {news.time}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
