'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Loader2,
  Upload,
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  MessageSquareQuote,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  EXPERT_REVIEWS_TEMPLATE,
  AI_PROMPTS,
  parseExpertReviews,
} from '@/lib/bulk-data-parsers'
import { useAuth } from '@/lib/auth-context'

interface BulkReviewsEntryProps {
  onSuccess?: () => void
}

type ImportMode = 'append' | 'replace-per-ipo'

const MODE_LABELS: Record<ImportMode, { title: string; help: string }> = {
  append: {
    title: 'Append reviews',
    help: 'Insert every pasted review as a new row. Existing reviews are left untouched.',
  },
  'replace-per-ipo': {
    title: 'Replace per IPO',
    help: 'Danger: for each IPO referenced in the paste, delete all existing reviews before inserting. Other IPOs are untouched. You will be asked to confirm.',
  },
}

/**
 * Bulk import UI for the admin reviews page. Mirrors <BulkNewsEntry />
 * but targets the expert_reviews table and resolves IPOs by slug/name
 * server-side so one paste can span multiple IPOs.
 */
export function BulkReviewsEntry({ onSuccess }: BulkReviewsEntryProps) {
  const { authFetch } = useAuth()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<ImportMode>('append')
  const [loading, setLoading] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const preview = useMemo(() => {
    if (!text.trim()) return null
    const parsed = parseExpertReviews(text)
    const uniqueIpos = new Set(
      parsed.data.map(r => r.ipo_slug || r.ipo_name?.toLowerCase()).filter(Boolean),
    )
    return {
      success: parsed.success,
      count: parsed.data.length,
      errors: parsed.errors,
      ipoCount: uniqueIpos.size,
      firstSource: parsed.data[0]?.source ?? null,
    }
  }, [text])

  async function copyToClipboard(value: string, which: 'template' | 'prompt') {
    try {
      await navigator.clipboard.writeText(value)
      if (which === 'template') {
        setCopiedTemplate(true)
        setTimeout(() => setCopiedTemplate(false), 2000)
      } else {
        setCopiedPrompt(true)
        setTimeout(() => setCopiedPrompt(false), 2000)
      }
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  async function handleImport() {
    if (!text.trim()) {
      toast.error('Paste your reviews first')
      return
    }

    if (mode === 'replace-per-ipo') {
      const ok = window.confirm(
        'This will DELETE all existing reviews for every IPO referenced in the paste, then insert the new ones. Continue?',
      )
      if (!ok) return
    }

    setLoading(true)
    try {
      const res = await authFetch('/api/admin/reviews/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mode }),
      })

      const json = await res.json()
      if (!res.ok) {
        const detail = Array.isArray(json.details)
          ? json.details.join(', ')
          : typeof json.details === 'string'
            ? json.details
            : ''
        throw new Error(
          [json.error, detail].filter(Boolean).join(' — ') || 'Import failed',
        )
      }

      const unresolvedCount = Array.isArray(json.unresolved) ? json.unresolved.length : 0
      if (unresolvedCount > 0) {
        toast.warning(
          `${json.message || 'Imported'} ${unresolvedCount} IPO(s) could not be matched: ${(json.unresolved as string[]).slice(0, 3).join(', ')}${unresolvedCount > 3 ? '…' : ''}`,
        )
      } else {
        toast.success(json.message || 'Reviews imported')
      }
      setText('')
      onSuccess?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden mb-6">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white flex items-center gap-2">
                  Bulk Import Reviews
                  <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">
                    Copy-Paste Format
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Add multiple expert reviews (YouTuber / analyst / news / firm) across
                  several IPOs in one paste. IPOs are matched by slug or company name.
                </p>
              </div>
            </div>
            {open ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-300 text-sm">Format Template</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(EXPERT_REVIEWS_TEMPLATE, 'template')}
                    className="h-7 text-xs text-slate-400 hover:text-white"
                  >
                    {copiedTemplate ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <pre className="text-xs text-slate-500 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                  {EXPERT_REVIEWS_TEMPLATE.slice(0, 520)}...
                </pre>
              </div>

              <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-indigo-300 text-sm">
                    AI Prompt (ChatGPT / Claude)
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(AI_PROMPTS.expertReviews, 'prompt')}
                    className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    {copiedPrompt ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : (
                      <Copy className="h-3 w-3 mr-1" />
                    )}
                    Copy
                  </Button>
                </div>
                <p className="text-xs text-indigo-300/70">
                  Copy this prompt, paste raw YouTube links / analyst notes / news
                  articles into ChatGPT or Claude, and the model will format them
                  into the expected block. Paste the formatted output below.
                </p>
                <p className="text-[11px] text-indigo-300/60 mt-2">
                  <MessageSquareQuote className="inline h-3 w-3 mr-1" />
                  IPO_SLUG must match the slug on ipogyani.com — or use IPO_NAME.
                </p>
              </div>
            </div>

            <div>
              <Label className="text-slate-300 mb-2 block">
                Paste Formatted Reviews
              </Label>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the formatted === EXPERT_REVIEWS === block here..."
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm min-h-[220px]"
              />
            </div>

            {preview && (
              <div
                className={`flex items-start gap-2 p-3 rounded-lg ${
                  preview.success && preview.count > 0
                    ? 'bg-emerald-500/10 border border-emerald-500/20'
                    : 'bg-red-500/10 border border-red-500/20'
                }`}
              >
                {preview.success && preview.count > 0 ? (
                  <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      preview.success && preview.count > 0
                        ? 'text-emerald-300'
                        : 'text-red-300'
                    }`}
                  >
                    {preview.success && preview.count > 0
                      ? `Parsed ${preview.count} review(s) across ${preview.ipoCount} IPO(s)`
                      : 'Parse error'}
                  </p>
                  {preview.success && preview.firstSource && (
                    <p className="text-xs mt-0.5 text-emerald-300/70 truncate">
                      First: {preview.firstSource}
                    </p>
                  )}
                  {preview.errors.length > 0 && (
                    <ul className="text-xs mt-1 text-red-300/80 list-disc pl-4 space-y-0.5">
                      {preview.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {preview.errors.length > 5 && (
                        <li>{'...and ' + (preview.errors.length - 5) + ' more'}</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}

            <div>
              <Label className="text-slate-300 mb-2 block">Import mode</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(Object.keys(MODE_LABELS) as ImportMode[]).map(key => {
                  const active = mode === key
                  const danger = key === 'replace-per-ipo'
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMode(key)}
                      className={`text-left p-3 rounded-lg border transition-colors ${
                        active
                          ? danger
                            ? 'bg-red-500/10 border-red-500/50'
                            : 'bg-indigo-500/10 border-indigo-500/50'
                          : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div
                        className={`text-sm font-medium flex items-center gap-1.5 ${
                          active
                            ? danger
                              ? 'text-red-300'
                              : 'text-indigo-300'
                            : 'text-slate-200'
                        }`}
                      >
                        {danger && <AlertTriangle className="h-3.5 w-3.5" />}
                        {MODE_LABELS[key].title}
                      </div>
                      <p className="text-[11px] mt-1 leading-snug text-slate-400">
                        {MODE_LABELS[key].help}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || !text.trim()}
                className={
                  mode === 'replace-per-ipo'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'replace-per-ipo' ? 'Replace & Import' : 'Import Reviews'}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
