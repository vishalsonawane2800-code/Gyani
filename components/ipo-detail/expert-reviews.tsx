'use client';

import { useState } from 'react';
import { Youtube, Newspaper, Building2, User, ThumbsUp, ThumbsDown, Minus, ExternalLink } from 'lucide-react';
import type { ExpertReview } from '@/lib/data';

interface ExpertReviewsProps {
  reviews?: ExpertReview[];
  ipoName: string;
}

type FilterType = 'all' | 'youtube' | 'analyst' | 'news' | 'firm';

export function ExpertReviews({ reviews = [], ipoName }: ExpertReviewsProps) {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredReviews = reviews.filter((review) => {
    if (filter === 'all') return true;
    return review.sourceType === filter;
  });

  // Group reviews by source type
  const youtubeReviews = reviews.filter(r => r.sourceType === 'youtube');
  const analystReviews = reviews.filter(r => r.sourceType === 'analyst');
  const newsReviews = reviews.filter(r => r.sourceType === 'news');
  const firmReviews = reviews.filter(r => r.sourceType === 'firm');

  const getSentimentBadge = (sentiment: ExpertReview['sentiment']) => {
    switch (sentiment) {
      case 'positive':
        return { 
          label: 'Positive', 
          className: 'bg-emerald-bg text-emerald',
          icon: ThumbsUp 
        };
      case 'negative':
        return { 
          label: 'Negative', 
          className: 'bg-destructive-bg text-destructive',
          icon: ThumbsDown 
        };
      default:
        return { 
          label: 'Neutral', 
          className: 'bg-gold-bg text-gold',
          icon: Minus 
        };
    }
  };

  const getSourceIcon = (sourceType: ExpertReview['sourceType']) => {
    switch (sourceType) {
      case 'youtube':
        return Youtube;
      case 'news':
        return Newspaper;
      case 'firm':
        return Building2;
      default:
        return User;
    }
  };

  const getSourceBadge = (sourceType: ExpertReview['sourceType']) => {
    switch (sourceType) {
      case 'youtube':
        return { label: 'YouTuber', className: 'bg-destructive-bg text-destructive' };
      case 'analyst':
        return { label: 'Analyst', className: 'bg-cobalt-bg text-cobalt' };
      case 'news':
        return { label: 'News', className: 'bg-primary-bg text-primary' };
      case 'firm':
        return { label: 'Brokerage', className: 'bg-emerald-bg text-emerald' };
      default:
        return { label: 'Review', className: 'bg-secondary text-ink3' };
    }
  };

  if (reviews.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 mb-6">
        <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold mb-4">
          Expert Reviews & Opinions
        </h2>
        <div className="text-center py-8">
          <p className="text-ink3 text-[13px]">Expert reviews for {ipoName} IPO will appear here once available.</p>
          <p className="text-[11px] text-ink4 mt-2">Reviews are summarized from YouTubers, analysts, news channels, and brokerage firms using AI.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="font-[family-name:var(--font-sora)] text-[15px] font-bold">
          Expert Reviews & Opinions
        </h2>
        
        {/* Filter Toggle */}
        <div className="flex bg-secondary rounded-lg p-0.5 gap-0.5 overflow-x-auto">
          {([
            { key: 'all', label: 'All' },
            { key: 'youtube', label: 'YouTubers' },
            { key: 'news', label: 'News' },
            { key: 'firm', label: 'Brokerages' },
          ] as const).map((type) => (
            <button
              key={type.key}
              onClick={() => setFilter(type.key)}
              className={`text-[11px] font-semibold py-1 px-2.5 rounded-md transition-all whitespace-nowrap ${
                filter === type.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-ink3 hover:text-foreground'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment Summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-emerald-bg/50 rounded-xl p-3 text-center">
          <div className="font-[family-name:var(--font-sora)] text-lg font-bold text-emerald-mid">
            {reviews.filter(r => r.sentiment === 'positive').length}
          </div>
          <div className="text-[10px] text-emerald font-medium">Positive</div>
        </div>
        <div className="bg-gold-bg/50 rounded-xl p-3 text-center">
          <div className="font-[family-name:var(--font-sora)] text-lg font-bold text-gold-mid">
            {reviews.filter(r => r.sentiment === 'neutral').length}
          </div>
          <div className="text-[10px] text-gold font-medium">Neutral</div>
        </div>
        <div className="bg-destructive-bg/50 rounded-xl p-3 text-center">
          <div className="font-[family-name:var(--font-sora)] text-lg font-bold text-destructive">
            {reviews.filter(r => r.sentiment === 'negative').length}
          </div>
          <div className="text-[10px] text-destructive font-medium">Negative</div>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-3">
        {filteredReviews.map((review) => {
          const sentimentBadge = getSentimentBadge(review.sentiment);
          const sourceBadge = getSourceBadge(review.sourceType);
          const SourceIcon = getSourceIcon(review.sourceType);
          const SentimentIcon = sentimentBadge.icon;

          return (
            <div 
              key={review.id} 
              className="bg-secondary rounded-xl p-4 hover:bg-secondary/80 transition-colors"
            >
              <div className="flex items-start gap-3">
                {/* Source Icon */}
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  review.sourceType === 'youtube' ? 'bg-destructive/10 text-destructive' :
                  review.sourceType === 'news' ? 'bg-primary/10 text-primary' :
                  review.sourceType === 'firm' ? 'bg-emerald/10 text-emerald' :
                  'bg-cobalt/10 text-cobalt'
                }`}>
                  <SourceIcon className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="font-bold text-[13px]">{review.source}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${sourceBadge.className}`}>
                      {sourceBadge.label}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${sentimentBadge.className}`}>
                      <SentimentIcon className="w-2.5 h-2.5" />
                      {sentimentBadge.label}
                    </span>
                  </div>

                  {/* Author */}
                  <p className="text-[11px] text-ink3 mb-2">By {review.author}</p>

                  {/* Summary - 2 lines */}
                  <p className="text-[13px] text-ink2 leading-relaxed line-clamp-2">
                    {review.summary}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center gap-3 mt-2.5">
                    <span className="text-[10px] text-ink4">
                      {review.createdAt.includes('2026') 
                        ? new Date(review.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                        : review.createdAt
                      }
                    </span>
                    {review.url && (
                      <a 
                        href={review.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] text-primary-mid font-medium flex items-center gap-1 hover:underline"
                      >
                        View Source
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Sections by Category */}
      {filter === 'all' && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-[11px] text-ink4">
            Reviews are AI-summarized from {youtubeReviews.length > 0 ? 'top financial YouTubers, ' : ''}
            {newsReviews.length > 0 ? 'news channels, ' : ''}
            {firmReviews.length > 0 ? 'brokerage firms, ' : ''}
            and other expert sources. Each summary is limited to 2 lines for quick reading.
          </p>
        </div>
      )}
    </div>
  );
}
