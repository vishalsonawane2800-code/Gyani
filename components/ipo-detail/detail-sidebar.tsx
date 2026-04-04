'use client';

import { AlertCircle, ThumbsUp, ThumbsDown, Minus, Youtube, Newspaper, Building2, ExternalLink } from 'lucide-react';
import type { IPO, ExpertReview } from '@/lib/data';

interface DetailSidebarProps {
  ipo: IPO;
}

export function DetailSidebar({ ipo }: DetailSidebarProps) {
  const reviews = ipo.expertReviews || [];
  const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
  const neutralCount = reviews.filter(r => r.sentiment === 'neutral').length;
  const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;

  // Get top 3 reviews for preview
  const topReviews = reviews.slice(0, 3);

  const getSentimentIcon = (sentiment: ExpertReview['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return { icon: ThumbsUp, className: 'text-emerald' };
      case 'negative':
        return { icon: ThumbsDown, className: 'text-destructive' };
      default:
        return { icon: Minus, className: 'text-gold' };
    }
  };

  const getSourceIcon = (sourceType: ExpertReview['sourceType']) => {
    switch (sourceType) {
      case 'youtube':
        return { icon: Youtube, className: 'bg-destructive/10 text-destructive' };
      case 'news':
        return { icon: Newspaper, className: 'bg-primary/10 text-primary' };
      case 'firm':
        return { icon: Building2, className: 'bg-emerald/10 text-emerald' };
      default:
        return { icon: Building2, className: 'bg-cobalt/10 text-cobalt' };
    }
  };

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* Expert Reviews & Opinions */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Expert Reviews & Opinions</h3>
        </div>
        
        {reviews.length > 0 ? (
          <div className="p-4">
            {/* Sentiment Summary */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-emerald-bg/50 rounded-lg p-2 text-center">
                <div className="font-[family-name:var(--font-sora)] text-base font-bold text-emerald-mid">
                  {positiveCount}
                </div>
                <div className="text-[9px] text-emerald font-medium">Positive</div>
              </div>
              <div className="bg-gold-bg/50 rounded-lg p-2 text-center">
                <div className="font-[family-name:var(--font-sora)] text-base font-bold text-gold-mid">
                  {neutralCount}
                </div>
                <div className="text-[9px] text-gold font-medium">Neutral</div>
              </div>
              <div className="bg-destructive-bg/50 rounded-lg p-2 text-center">
                <div className="font-[family-name:var(--font-sora)] text-base font-bold text-destructive">
                  {negativeCount}
                </div>
                <div className="text-[9px] text-destructive font-medium">Negative</div>
              </div>
            </div>

            {/* Top Reviews Preview */}
            <div className="space-y-2.5">
              {topReviews.map((review) => {
                const sentimentInfo = getSentimentIcon(review.sentiment);
                const sourceInfo = getSourceIcon(review.sourceType);
                const SentimentIcon = sentimentInfo.icon;
                const SourceIcon = sourceInfo.icon;

                return (
                  <div key={review.id} className="bg-secondary rounded-lg p-2.5">
                    <div className="flex items-start gap-2">
                      <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${sourceInfo.className}`}>
                        <SourceIcon className="w-3 h-3" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="font-semibold text-[11px] truncate">{review.source}</span>
                          <SentimentIcon className={`w-3 h-3 shrink-0 ${sentimentInfo.className}`} />
                        </div>
                        <p className="text-[10px] text-ink3 line-clamp-2 leading-relaxed">
                          {review.summary}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Link */}
            {reviews.length > 3 && (
              <button 
                onClick={() => {
                  const element = document.getElementById('expert-reviews-section');
                  if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="w-full mt-3 py-2 text-[11px] font-semibold text-primary-mid flex items-center justify-center gap-1 hover:bg-primary-bg rounded-lg transition-colors"
              >
                View all {reviews.length} reviews
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-[11px] text-ink3">Expert reviews will appear here once available.</p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="bg-gold-bg border border-gold/20 rounded-2xl p-4">
        <div className="flex gap-2">
          <AlertCircle className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-gold font-semibold mb-1">Disclaimer</p>
            <p className="text-[10.5px] text-gold/80 leading-relaxed">
              IPOGyani is not SEBI registered. AI predictions are probabilistic and NOT investment advice. 
              Always do your own research before investing.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
