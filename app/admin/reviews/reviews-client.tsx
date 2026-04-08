'use client'

/* =========================================================================
   REVIEWS MANAGEMENT - User Guide
   =========================================================================
   
   This page lets you add expert reviews for IPOs. Reviews are categorized as:
   
   1. YOUTUBE REVIEWS
      - Source: Channel name (e.g., "CA Rachana Ranade", "Asset Yogi")
      - Author: Same as channel name or presenter name
      - Summary: 2-line summary of their opinion (max ~150 chars)
      - Sentiment: Positive / Neutral / Negative
      - URL: YouTube video link
   
   2. ANALYST REVIEWS
      - Source: Brokerage or analyst firm (e.g., "ICICI Direct", "Zerodha")
      - Author: Analyst name if available
      - Summary: Their recommendation summary
      - Sentiment: Based on their rating (Subscribe/Avoid/Neutral)
   
   3. NEWS REVIEWS
      - Source: News outlet (e.g., "Moneycontrol", "Economic Times")
      - Author: Reporter/Editor name
      - Summary: Key points from the article
      - URL: Article link
   
   4. BROKERAGE/FIRM REVIEWS
      - Source: Brokerage firm name
      - Author: Research team or analyst
      - Summary: Their rating and recommendation
   
   Tips:
   - Keep summaries to 2 lines (around 150 characters)
   - Be objective in sentiment selection
   - Add URLs when available for credibility
   ========================================================================= */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Plus,
  Youtube,
  Newspaper,
  Building2,
  User,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Info,
  Filter,
} from 'lucide-react'

interface IPO {
  id: number
  name: string
  slug: string
}

interface Review {
  id: string
  ipo_id: number
  source: string
  source_type: 'youtube' | 'analyst' | 'news' | 'firm'
  author: string
  summary: string
  sentiment: 'positive' | 'neutral' | 'negative'
  url?: string
  logo_url?: string
  review_date?: string
  created_at: string
  ipos?: { id: number; name: string; slug: string }
}

interface ReviewsClientProps {
  ipos: IPO[]
  initialReviews: Review[]
}

const sourceTypes = [
  { value: 'youtube', label: 'YouTuber Review', icon: Youtube, color: 'text-red-400' },
  { value: 'analyst', label: 'Analyst Opinion', icon: User, color: 'text-blue-400' },
  { value: 'news', label: 'News Article', icon: Newspaper, color: 'text-purple-400' },
  { value: 'firm', label: 'Brokerage/Firm', icon: Building2, color: 'text-green-400' },
]

const sentiments = [
  { value: 'positive', label: 'Positive', icon: ThumbsUp, color: 'bg-green-500/20 text-green-400' },
  { value: 'neutral', label: 'Neutral', icon: Minus, color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'negative', label: 'Negative', icon: ThumbsDown, color: 'bg-red-500/20 text-red-400' },
]

const defaultFormData = {
  ipo_id: 0,
  source: '',
  source_type: 'youtube' as const,
  author: '',
  summary: '',
  sentiment: 'neutral' as const,
  url: '',
  review_date: new Date().toISOString().split('T')[0],
}

export function ReviewsClient({ ipos, initialReviews }: ReviewsClientProps) {
  const router = useRouter()
  const [reviews, setReviews] = useState<Review[]>(initialReviews)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingReview, setEditingReview] = useState<Review | null>(null)
  const [formData, setFormData] = useState(defaultFormData)
  const [loading, setLoading] = useState(false)
  const [filterIpo, setFilterIpo] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const filteredReviews = reviews.filter((review) => {
    if (filterIpo !== 'all' && review.ipo_id !== parseInt(filterIpo)) return false
    if (filterType !== 'all' && review.source_type !== filterType) return false
    return true
  })

  const openAddDialog = () => {
    setEditingReview(null)
    setFormData(defaultFormData)
    setDialogOpen(true)
  }

  const openEditDialog = (review: Review) => {
    setEditingReview(review)
    setFormData({
      ipo_id: review.ipo_id,
      source: review.source,
      source_type: review.source_type,
      author: review.author,
      summary: review.summary,
      sentiment: review.sentiment,
      url: review.url || '',
      review_date: review.review_date || new Date().toISOString().split('T')[0],
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.ipo_id || !formData.source || !formData.author || !formData.summary) {
      toast.error('Please fill all required fields')
      return
    }

    setLoading(true)
    try {
      const url = editingReview
        ? `/api/admin/reviews/${editingReview.id}`
        : '/api/admin/reviews'
      const method = editingReview ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save review')
      }

      toast.success(editingReview ? 'Review updated' : 'Review added')
      setDialogOpen(false)
      router.refresh()
      
      // Refresh reviews list
      const reviewsRes = await fetch('/api/admin/reviews')
      const { data } = await reviewsRes.json()
      setReviews(data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save review')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/reviews/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete review')
      }

      toast.success('Review deleted')
      setReviews((prev) => prev.filter((r) => r.id !== id))
    } catch (error) {
      toast.error('Failed to delete review')
      console.error(error)
    }
  }

  const getSourceIcon = (type: string) => {
    const source = sourceTypes.find((s) => s.value === type)
    return source ? source.icon : User
  }

  const getSourceColor = (type: string) => {
    const source = sourceTypes.find((s) => s.value === type)
    return source?.color || 'text-slate-400'
  }

  const getSentimentBadge = (sentiment: string) => {
    const sent = sentiments.find((s) => s.value === sentiment)
    return sent || sentiments[1]
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin">
            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
              Manage Reviews
            </h1>
            <p className="text-slate-400 mt-1">
              Add YouTuber reviews, analyst opinions, and news articles
            </p>
          </div>
        </div>
        <Button 
          onClick={openAddDialog}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Review
        </Button>
      </div>

      {/* Help Box */}
      <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-indigo-300 font-medium">How to Add Reviews</p>
            <ul className="text-sm text-indigo-300/70 mt-2 space-y-1 list-disc list-inside">
              <li><strong>YouTuber:</strong> Channel name, 2-line summary of opinion, video URL</li>
              <li><strong>Analyst:</strong> Analyst/firm name, their recommendation summary</li>
              <li><strong>News:</strong> News outlet, key points from article, article URL</li>
              <li><strong>Brokerage:</strong> Firm name, research team rating</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <span className="text-sm text-slate-400">Filter:</span>
        </div>
        <Select value={filterIpo} onValueChange={setFilterIpo}>
          <SelectTrigger className="w-[200px] bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="All IPOs" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">All IPOs</SelectItem>
            {ipos.map((ipo) => (
              <SelectItem key={ipo.id} value={ipo.id.toString()} className="text-white">
                {ipo.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[180px] bg-slate-800 border-slate-600 text-white">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-600">
            <SelectItem value="all" className="text-white">All Types</SelectItem>
            {sourceTypes.map((type) => (
              <SelectItem key={type.value} value={type.value} className="text-white">
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-slate-500">
          {filteredReviews.length} review{filteredReviews.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Reviews List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filteredReviews.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-400 mb-4">No reviews found</p>
            <Button onClick={openAddDialog} variant="outline" className="border-slate-600 text-slate-300">
              <Plus className="h-4 w-4 mr-2" />
              Add First Review
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredReviews.map((review) => {
              const SourceIcon = getSourceIcon(review.source_type)
              const sentimentBadge = getSentimentBadge(review.sentiment)
              const SentimentIcon = sentimentBadge.icon

              return (
                <div key={review.id} className="p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Source Icon */}
                    <div className={`w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center ${getSourceColor(review.source_type)}`}>
                      <SourceIcon className="h-5 w-5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-white">{review.source}</span>
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          {sourceTypes.find((s) => s.value === review.source_type)?.label}
                        </Badge>
                        <Badge className={`text-xs ${sentimentBadge.color}`}>
                          <SentimentIcon className="h-3 w-3 mr-1" />
                          {sentimentBadge.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        By {review.author} | {review.ipos?.name || 'Unknown IPO'}
                      </p>
                      <p className="text-sm text-slate-300 line-clamp-2">{review.summary}</p>
                      {review.url && (
                        <a
                          href={review.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:underline mt-2"
                        >
                          View Source <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(review)}
                        className="text-slate-400 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-400 hover:text-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-800 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Delete Review</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-400">
                              Are you sure you want to delete this review from {review.source}?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-700 text-white border-slate-600">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(review.id)}
                              className="bg-red-600 text-white hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingReview ? 'Edit Review' : 'Add New Review'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingReview 
                ? 'Update the review details below'
                : 'Add a YouTuber review, analyst opinion, or news article'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* IPO Selection */}
            <div>
              <Label className="text-slate-300">
                Select IPO *
                <span className="text-xs text-slate-500 ml-2">Which IPO is this review for?</span>
              </Label>
              <Select
                value={formData.ipo_id ? formData.ipo_id.toString() : ''}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, ipo_id: parseInt(value) }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Select IPO" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {ipos.map((ipo) => (
                    <SelectItem key={ipo.id} value={ipo.id.toString()} className="text-white">
                      {ipo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Source Type */}
            <div>
              <Label className="text-slate-300">
                Review Type *
                <span className="text-xs text-slate-500 ml-2">YouTuber, Analyst, News, or Firm</span>
              </Label>
              <Select
                value={formData.source_type}
                onValueChange={(value: 'youtube' | 'analyst' | 'news' | 'firm') => 
                  setFormData((prev) => ({ ...prev, source_type: value }))
                }
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {sourceTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <SelectItem key={type.value} value={type.value} className="text-white">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${type.color}`} />
                          {type.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Source Name */}
            <div>
              <Label className="text-slate-300">
                Source Name *
                <span className="text-xs text-slate-500 ml-2">
                  {formData.source_type === 'youtube' ? 'Channel name' : 
                   formData.source_type === 'news' ? 'News outlet' : 
                   'Company/Firm name'}
                </span>
              </Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                placeholder={
                  formData.source_type === 'youtube' ? 'e.g., CA Rachana Ranade' :
                  formData.source_type === 'news' ? 'e.g., Moneycontrol' :
                  formData.source_type === 'analyst' ? 'e.g., ICICI Direct' :
                  'e.g., Zerodha Research'
                }
              />
            </div>

            {/* Author */}
            <div>
              <Label className="text-slate-300">
                Author/Presenter *
                <span className="text-xs text-slate-500 ml-2">Person who gave the review</span>
              </Label>
              <Input
                value={formData.author}
                onChange={(e) => setFormData((prev) => ({ ...prev, author: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                placeholder="e.g., Rachana Ranade, Research Team"
              />
            </div>

            {/* Sentiment */}
            <div>
              <Label className="text-slate-300">
                Sentiment *
                <span className="text-xs text-slate-500 ml-2">Overall opinion on the IPO</span>
              </Label>
              <div className="flex gap-2 mt-2">
                {sentiments.map((sent) => {
                  const Icon = sent.icon
                  const isSelected = formData.sentiment === sent.value
                  return (
                    <button
                      key={sent.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, sentiment: sent.value as 'positive' | 'neutral' | 'negative' }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-all ${
                        isSelected
                          ? `${sent.color} border-current`
                          : 'border-slate-600 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{sent.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Summary */}
            <div>
              <Label className="text-slate-300">
                Summary *
                <span className="text-xs text-slate-500 ml-2">2-line summary (max 150 chars)</span>
              </Label>
              <Textarea
                value={formData.summary}
                onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1 resize-none"
                placeholder="Brief summary of their opinion on the IPO..."
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-slate-500 mt-1 text-right">
                {formData.summary.length}/200
              </p>
            </div>

            {/* URL */}
            <div>
              <Label className="text-slate-300">
                URL
                <span className="text-xs text-slate-500 ml-2">Link to video/article (optional)</span>
              </Label>
              <Input
                value={formData.url}
                onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                placeholder="https://..."
              />
            </div>

            {/* Date */}
            <div>
              <Label className="text-slate-300">Review Date</Label>
              <Input
                type="date"
                value={formData.review_date}
                onChange={(e) => setFormData((prev) => ({ ...prev, review_date: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingReview ? 'Update Review' : 'Add Review'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
