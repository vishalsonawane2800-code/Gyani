'use client'

/* =========================================================================
   MARKET NEWS MANAGEMENT
   =========================================================================

   Curate the "IPO Market News" section shown on the public homepage.
   Each entry stores an external article URL - clicking a news item on the
   homepage opens the linked article in a new tab.

   Fields:
   - Title: Short headline (shown on homepage).
   - URL:   Must be http(s). Clicked on homepage -> opens in a new tab.
   - Source: Publication name (e.g. "Moneycontrol", "ET Markets").
   - Tag:    Short label shown as a pill before the title (ALERT / MARKET / IPO / REG ...).
   - Impact: Inline badge next to the title (Bullish / Bearish / Caution / Watch / Neutral).
   - Sentiment: Normalized positive / neutral / negative (used for analytics).
   - Published At: When the article was originally published.
   - Display Order: Higher number = pinned higher. 0 = unpinned.
   - Published: Toggle to show/hide on the homepage.
   ========================================================================= */

import { useMemo, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
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
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  Loader2,
  Eye,
  EyeOff,
  Newspaper,
} from 'lucide-react'

export interface MarketNewsRecord {
  id: string
  title: string
  url: string
  source: string | null
  tag: string
  impact: string | null
  sentiment: 'positive' | 'neutral' | 'negative' | null
  image_url: string | null
  summary: string | null
  published_at: string | null
  is_published: boolean
  display_order: number
  created_at: string
  updated_at: string
}

const TAG_SUGGESTIONS = ['ALERT', 'MARKET', 'IPO', 'REG', 'SME', 'LISTING']
const IMPACT_OPTIONS = ['Bullish', 'Bearish', 'Caution', 'Watch', 'Neutral']

interface FormState {
  title: string
  url: string
  source: string
  tag: string
  impact: string
  sentiment: '' | 'positive' | 'neutral' | 'negative'
  summary: string
  published_at: string
  is_published: boolean
  display_order: number
}

const EMPTY_FORM: FormState = {
  title: '',
  url: '',
  source: '',
  tag: 'IPO',
  impact: '',
  sentiment: '',
  summary: '',
  published_at: '',
  is_published: true,
  display_order: 0,
}

function toDatetimeLocal(value: string | null | undefined): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function formatTimeAgo(value: string | null): string {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const diffMs = Date.now() - d.getTime()
  const mins = Math.round(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return d.toLocaleDateString()
}

export function NewsClient({ initialNews }: { initialNews: MarketNewsRecord[] }) {
  // The admin API is protected by middleware.ts which requires a Bearer
  // JWT. Using authFetch here automatically attaches the token stored in
  // AuthContext - without it every POST/PUT/DELETE from this page fails
  // with 401 "Missing authorization header".
  const { authFetch } = useAuth()
  const [news, setNews] = useState<MarketNewsRecord[]>(initialNews)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MarketNewsRecord | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<MarketNewsRecord | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const stats = useMemo(
    () => ({
      total: news.length,
      published: news.filter(n => n.is_published).length,
      drafts: news.filter(n => !n.is_published).length,
    }),
    [news]
  )

  function openNewDialog() {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      published_at: toDatetimeLocal(new Date().toISOString()),
    })
    setDialogOpen(true)
  }

  function openEditDialog(record: MarketNewsRecord) {
    setEditing(record)
    setForm({
      title: record.title,
      url: record.url,
      source: record.source ?? '',
      tag: record.tag ?? 'IPO',
      impact: record.impact ?? '',
      sentiment: (record.sentiment ?? '') as FormState['sentiment'],
      summary: record.summary ?? '',
      published_at: toDatetimeLocal(record.published_at),
      is_published: record.is_published,
      display_order: record.display_order ?? 0,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!form.url.trim()) {
      toast.error('URL is required')
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: form.title.trim(),
        url: form.url.trim(),
        source: form.source.trim() || null,
        tag: form.tag.trim() || 'IPO',
        impact: form.impact.trim() || null,
        sentiment: form.sentiment || null,
        summary: form.summary.trim() || null,
        published_at: fromDatetimeLocal(form.published_at),
        is_published: form.is_published,
        display_order: Number(form.display_order) || 0,
      }

      const url = editing
        ? `/api/admin/market-news/${editing.id}`
        : '/api/admin/market-news'
      const method = editing ? 'PUT' : 'POST'

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save')
      }

      const saved: MarketNewsRecord = json.data
      setNews(prev => {
        if (editing) {
          return prev.map(n => (n.id === saved.id ? saved : n))
        }
        return [saved, ...prev]
      })

      toast.success(editing ? 'News item updated' : 'News item added')
      setDialogOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(record: MarketNewsRecord) {
    setSaving(true)
    try {
      const res = await authFetch(`/api/admin/market-news/${record.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to delete')
      }
      setNews(prev => prev.filter(n => n.id !== record.id))
      toast.success('News item deleted')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete'
      toast.error(message)
    } finally {
      setSaving(false)
      setDeleting(null)
    }
  }

  async function togglePublished(record: MarketNewsRecord) {
    setTogglingId(record.id)
    try {
      const res = await authFetch(`/api/admin/market-news/${record.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !record.is_published }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to update')
      const saved: MarketNewsRecord = json.data
      setNews(prev => prev.map(n => (n.id === saved.id ? saved : n)))
      toast.success(saved.is_published ? 'Published' : 'Unpublished')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update'
      toast.error(message)
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
              <Newspaper className="h-4 w-4" />
              <span>Homepage content</span>
            </div>
            <h1 className="text-2xl font-bold text-white">IPO Market News</h1>
            <p className="text-sm text-slate-400 mt-1">
              Add news items that appear in the "IPO Market News" section on
              the homepage. Each item links to the source article.
            </p>
          </div>
          <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-500 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add News Item
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Total</div>
            <div className="text-2xl font-bold text-white mt-1">{stats.total}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Published</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{stats.published}</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Drafts</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">{stats.drafts}</div>
          </div>
        </div>

        {/* List */}
        {news.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-10 text-center">
            <Newspaper className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-white font-semibold mb-1">No market news yet</h3>
            <p className="text-sm text-slate-400 mb-4">
              Add news items to populate the homepage "IPO Market News" section.
            </p>
            <Button onClick={openNewDialog} className="bg-indigo-600 hover:bg-indigo-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add your first news item
            </Button>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
            {news.map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-col md:flex-row md:items-center gap-3 p-4 ${
                  idx !== news.length - 1 ? 'border-b border-slate-700' : ''
                }`}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <Badge
                    variant="secondary"
                    className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shrink-0"
                  >
                    {item.tag}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </h3>
                      {item.impact && (
                        <Badge
                          variant="outline"
                          className="border-slate-600 text-slate-300 text-[10px] py-0 px-1.5"
                        >
                          {item.impact}
                        </Badge>
                      )}
                      {!item.is_published && (
                        <Badge className="bg-amber-500/10 text-amber-300 border-amber-500/20 text-[10px] py-0 px-1.5">
                          Draft
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 flex-wrap">
                      <span>{item.source || 'Unknown source'}</span>
                      <span className="text-slate-600">-</span>
                      <span>{formatTimeAgo(item.published_at)}</span>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span className="truncate max-w-[220px]">{item.url}</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublished(item)}
                    disabled={togglingId === item.id}
                    className="text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    {togglingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : item.is_published ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(item)}
                    className="text-slate-300 hover:text-white hover:bg-slate-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(item)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit news item' : 'Add news item'}</DialogTitle>
            <DialogDescription className="text-slate-400">
              This appears on the homepage "IPO Market News" section and links
              to the source URL.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-2">
              <Label htmlFor="title">
                Title <span className="text-red-400">*</span>
              </Label>
              <Input
                id="title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="SEBI tightens SME IPO listing norms"
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="url">
                Source URL <span className="text-red-400">*</span>
              </Label>
              <Input
                id="url"
                type="url"
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="https://www.moneycontrol.com/news/..."
                className="bg-slate-900 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500">
                Clicking the news item on the homepage opens this URL in a new tab.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={form.source}
                  onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                  placeholder="Moneycontrol"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="published_at">Published at</Label>
                <Input
                  id="published_at"
                  type="datetime-local"
                  value={form.published_at}
                  onChange={e => setForm(f => ({ ...f, published_at: e.target.value }))}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="tag">Tag</Label>
                <Select
                  value={form.tag}
                  onValueChange={v => setForm(f => ({ ...f, tag: v }))}
                >
                  <SelectTrigger id="tag" className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {TAG_SUGGESTIONS.map(t => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="impact">Impact</Label>
                <Select
                  value={form.impact || 'none'}
                  onValueChange={v => setForm(f => ({ ...f, impact: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger id="impact" className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="none">None</SelectItem>
                    {IMPACT_OPTIONS.map(i => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sentiment">Sentiment</Label>
                <Select
                  value={form.sentiment || 'none'}
                  onValueChange={v =>
                    setForm(f => ({
                      ...f,
                      sentiment: v === 'none' ? '' : (v as FormState['sentiment']),
                    }))
                  }
                >
                  <SelectTrigger id="sentiment" className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="summary">Summary (optional)</Label>
              <Textarea
                id="summary"
                value={form.summary}
                onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                placeholder="One-line context shown on hover / detail pages."
                rows={2}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="display_order">Display order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={form.display_order}
                  onChange={e =>
                    setForm(f => ({ ...f, display_order: Number(e.target.value) || 0 }))
                  }
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <p className="text-xs text-slate-500">
                  Higher = pinned higher on the homepage. 0 = unpinned.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="is_published">Visibility</Label>
                <Select
                  value={form.is_published ? 'published' : 'draft'}
                  onValueChange={v => setForm(f => ({ ...f, is_published: v === 'published' }))}
                >
                  <SelectTrigger id="is_published" className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editing ? 'Save changes' : 'Add news item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={open => !open && setDeleting(null)}>
        <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete news item?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This cannot be undone. The article will immediately disappear
              from the homepage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-600 text-slate-200 hover:bg-slate-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && handleDelete(deleting)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
