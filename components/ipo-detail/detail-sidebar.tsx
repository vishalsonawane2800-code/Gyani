'use client';

import { TrendingUp, Users, Building2, Calendar, IndianRupee, Percent, BarChart3, Target, ThumbsUp, ThumbsDown, Minus, Youtube, Newspaper, ExternalLink } from 'lucide-react';
import type { IPO, ExpertReview } from '@/lib/data';
import { formatDate } from '@/lib/data';
import Link from 'next/link';

interface DetailSidebarProps {
  ipo: IPO;
  relatedIPOs?: IPO[];
}

export function DetailSidebar({ ipo, relatedIPOs = [] }: DetailSidebarProps) {
  const reviews = ipo.expertReviews || [];
  const positiveCount = reviews.filter(r => r.sentiment === 'positive').length;
  const neutralCount = reviews.filter(r => r.sentiment === 'neutral').length;
  const negativeCount = reviews.filter(r => r.sentiment === 'negative').length;
  const topReviews = reviews.slice(0, 2);

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
      default:
        return { icon: Building2, className: 'bg-cobalt/10 text-cobalt' };
    }
  };

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-20">
      {/* Quick Info Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Quick Info</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <IndianRupee className="w-3.5 h-3.5" />
              Issue Size
            </div>
            <span className="text-[12px] font-semibold">{ipo.issueSize}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Target className="w-3.5 h-3.5" />
              Market Cap
            </div>
            <span className="text-[12px] font-semibold">{ipo.marketCap}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Percent className="w-3.5 h-3.5" />
              P/E Ratio
            </div>
            <span className="text-[12px] font-semibold">{ipo.peRatio}x</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Building2 className="w-3.5 h-3.5" />
              Lead Manager
            </div>
            <span className="text-[12px] font-semibold truncate max-w-[140px]">{ipo.leadManager}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[12px] text-ink3">
              <Users className="w-3.5 h-3.5" />
              Registrar
            </div>
            <span className="text-[12px] font-semibold">{ipo.registrar}</span>
          </div>
        </div>
      </div>

      {/* Key Dates */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="p-3 border-b border-border bg-secondary">
          <h3 className="text-[13px] font-bold">Key Dates</h3>
        </div>
        <div className="p-4">
          <div className="relative pl-4 border-l-2 border-primary/30 space-y-4">
            <div className="relative">
              <div className="absolute -left-[21px] w-3 h-3 rounded-full bg-emerald border-2 border-background" />
              <p className="text-[10px] text-ink4 font-semibold">Open</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.openDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'lastday' ? 'bg-gold animate-pulse' : 'bg-emerald'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Close</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.closeDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'allot' ? 'bg-gold animate-pulse' : ipo.status === 'listing' ? 'bg-emerald' : 'bg-ink4'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Allotment</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.allotmentDate)}</p>
            </div>
            <div className="relative">
              <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 border-background ${ipo.status === 'listing' ? 'bg-gold animate-pulse' : 'bg-ink4'}`} />
              <p className="text-[10px] text-ink4 font-semibold">Listing</p>
              <p className="text-[12px] font-bold">{formatDate(ipo.listDate)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Sentiment Summary */}
      <div className="bg-gradient-to-br from-primary/5 to-cobalt/5 border border-primary/20 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cobalt flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-[11px] font-bold">AI Prediction</p>
            <p className="text-[10px] text-ink3">{ipo.aiConfidence}% confidence</p>
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`font-[family-name:var(--font-sora)] text-3xl font-extrabold ${ipo.aiPrediction >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
            {ipo.aiPrediction >= 0 ? '+' : ''}{ipo.aiPrediction}%
          </span>
          <span className="text-[11px] text-ink3">expected listing gain</span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
            ipo.sentimentLabel === 'Bullish' ? 'bg-emerald-bg text-emerald' :
            ipo.sentimentLabel === 'Bearish' ? 'bg-destructive-bg text-destructive' :
            'bg-gold-bg text-gold'
          }`}>
            {ipo.sentimentLabel}
          </div>
          <span className="text-[10px] text-ink3">Market sentiment</span>
        </div>
      </div>

      {/* Expert Reviews Summary */}
      {reviews.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border bg-secondary">
            <h3 className="text-[13px] font-bold">Expert Reviews</h3>
          </div>
          <div className="p-4">
            {/* Sentiment Pills */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1 bg-emerald-bg/50 rounded-lg py-1.5 text-center">
                <span className="font-bold text-[13px] text-emerald-mid">{positiveCount}</span>
                <span className="text-[10px] text-emerald ml-1">Positive</span>
              </div>
              <div className="flex-1 bg-gold-bg/50 rounded-lg py-1.5 text-center">
                <span className="font-bold text-[13px] text-gold-mid">{neutralCount}</span>
                <span className="text-[10px] text-gold ml-1">Neutral</span>
              </div>
              <div className="flex-1 bg-destructive-bg/50 rounded-lg py-1.5 text-center">
                <span className="font-bold text-[13px] text-destructive">{negativeCount}</span>
                <span className="text-[10px] text-destructive ml-1">Avoid</span>
              </div>
            </div>

            {/* Top 2 Reviews */}
            <div className="space-y-2">
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

            {reviews.length > 2 && (
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
        </div>
      )}

      {/* Related IPOs */}
      {relatedIPOs.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-3 border-b border-border bg-secondary">
            <h3 className="text-[13px] font-bold">Related IPOs</h3>
          </div>
          <div className="p-3 space-y-2">
            {relatedIPOs.slice(0, 3).map((relatedIPO) => (
              <Link
                key={relatedIPO.id}
                href={`/ipo/${relatedIPO.slug}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-[family-name:var(--font-sora)] font-bold text-xs shrink-0"
                  style={{ backgroundColor: relatedIPO.bgColor, color: relatedIPO.fgColor }}
                >
                  {relatedIPO.abbr}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold truncate">{relatedIPO.name}</p>
                  <p className="text-[10px] text-ink3">{relatedIPO.exchange}</p>
                </div>
                <div className={`text-[11px] font-bold ${relatedIPO.gmp >= 0 ? 'text-emerald-mid' : 'text-destructive'}`}>
                  {relatedIPO.gmp >= 0 ? '+' : ''}Rs {relatedIPO.gmp}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
