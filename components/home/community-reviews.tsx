'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { MessageSquare, Star, Loader2, Send, User as UserIcon } from 'lucide-react'
import { useUserAuth } from '@/lib/user-auth-context'

interface CommunityReview {
  id: string
  user_name: string
  rating: number | null
  comment: string
  ipo_id: number | null
  created_at: string
}

const fetcher = (url: string) =>
  fetch(url).then((r) => r.json() as Promise<{ reviews: CommunityReview[] }>)

// Human-readable "x days ago". Kept tiny on purpose — no date-fns dep.
function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffSec = Math.max(1, Math.floor((Date.now() - then) / 1000))
  if (diffSec < 60) return 'just now'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  const days = Math.floor(diffSec / 86400)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

function Avatar({ name }: { name: string }) {
  // Consistent deterministic pastel from the seed palette using the name hash.
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U'

  const palette = [
    'bg-cobalt-bg text-cobalt',
    'bg-emerald-bg text-emerald',
    'bg-gold-bg text-gold',
    'bg-primary-bg text-primary',
    'bg-rose-bg text-rose',
  ]
  const hash = Array.from(name).reduce((a, c) => a + c.charCodeAt(0), 0)
  const cls = palette[hash % palette.length]

  return (
    <div
      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${cls}`}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating ? 'fill-gold text-gold' : 'text-ink4'
          }`}
        />
      ))}
    </div>
  )
}

interface ReviewFormProps {
  token: string
  onPosted: (review: CommunityReview) => void
}

function ReviewForm({ token, onPosted }: ReviewFormProps) {
  const [comment, setComment] = useState('')
  const [rating, setRating] = useState<number>(5)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (comment.trim().length < 10) {
      setError('Review must be at least 10 characters.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/community-reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ comment: comment.trim(), rating }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Could not post review')
        return
      }
      onPosted(data.review)
      setComment('')
      setRating(5)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-ink3">Your rating:</span>
        {Array.from({ length: 5 }).map((_, i) => {
          const v = i + 1
          return (
            <button
              key={v}
              type="button"
              onClick={() => setRating(v)}
              className="p-0.5"
              aria-label={`${v} star${v > 1 ? 's' : ''}`}
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  v <= rating ? 'fill-gold text-gold' : 'text-ink4 hover:text-gold'
                }`}
              />
            </button>
          )
        })}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience using IPOGyani..."
        rows={3}
        maxLength={2000}
        required
        className="w-full resize-y px-3 py-2 rounded-lg border border-border bg-background text-sm text-ink placeholder:text-ink4 outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      />

      {error ? (
        <p role="alert" className="text-xs text-rose-mid">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-ink4">{comment.length}/2000</p>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 bg-primary hover:bg-primary-mid text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Post review
        </button>
      </div>
    </form>
  )
}

export function CommunityReviews() {
  const { user, token, isAuthenticated, isLoading } = useUserAuth()
  const { data, mutate } = useSWR('/api/community-reviews?limit=6', fetcher, {
    revalidateOnFocus: false,
  })

  const reviews = data?.reviews ?? []

  return (
    <section id="community-reviews" className="mt-6">
      <div className="bg-card rounded-xl border border-border card-shadow p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 bg-primary-bg rounded-lg">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-ink">Community reviews</h2>
            <p className="text-xs text-ink3">
              What investors are saying about IPOGyani
            </p>
          </div>
        </div>

        {/* Review form / login nudge */}
        <div className="bg-secondary/60 border border-border rounded-lg p-4 mb-5">
          {isLoading ? (
            <div className="h-16 animate-pulse bg-muted rounded" />
          ) : isAuthenticated && token && user ? (
            <div className="space-y-2">
              <p className="text-xs text-ink3 inline-flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                Posting as <span className="font-semibold text-ink2">{user.name}</span>
              </p>
              <ReviewForm
                token={token}
                onPosted={(newReview) => {
                  // Optimistically prepend so the user sees their review immediately.
                  mutate(
                    {
                      reviews: [newReview, ...reviews].slice(0, 6),
                    },
                    { revalidate: false }
                  )
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-ink">
                  Have an experience to share?
                </p>
                <p className="text-xs text-ink3">
                  Log in with your email to post a review — takes 10 seconds.
                </p>
              </div>
              <Link
                href="/login?next=%2F%23community-reviews"
                className="shrink-0 inline-flex items-center gap-1.5 bg-primary hover:bg-primary-mid text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Log in to review
              </Link>
            </div>
          )}
        </div>

        {/* Review list */}
        {reviews.length === 0 ? (
          <p className="text-sm text-ink3 text-center py-6">
            No reviews yet. Be the first to share your experience.
          </p>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="border border-border rounded-lg p-4 bg-background flex gap-3"
              >
                <Avatar name={r.user_name} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-ink truncate">
                      {r.user_name}
                    </span>
                    <span className="text-xs text-ink4">{timeAgo(r.created_at)}</span>
                  </div>
                  <Stars rating={r.rating} />
                  <p className="text-sm text-ink2 mt-1.5 leading-relaxed">{r.comment}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
