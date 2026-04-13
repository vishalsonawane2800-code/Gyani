import Link from 'next/link';
import { newsData } from '@/lib/data';

export function NewsSection() {
  return (
    <section id="news" className="mb-7">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[family-name:var(--font-sora)] text-[17px] font-bold">
          IPO Market News
        </h2>
        <Link href="/news" className="text-[12.5px] font-semibold text-primary hover:opacity-75 transition-opacity">
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
              className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded-xl shrink-0 mt-0.5"
              style={{ backgroundColor: news.tagColor.bg, color: news.tagColor.text }}
            >
              {news.tag}
            </span>
            
            {/* Content */}
            <div className="flex-1">
              <h3 className="text-[13px] font-semibold leading-snug mb-1">
                {news.title}
                <span 
                  className="text-[9.5px] font-bold px-2 py-0.5 rounded-xl ml-2 align-middle"
                  style={{ backgroundColor: news.impactColor.bg, color: news.impactColor.text }}
                >
                  {news.impact}
                </span>
              </h3>
              <p className="text-[11px] text-ink3">
                {news.source} - {news.time}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
