'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  Loader2,
  Upload,
  Copy,
  Check,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Newspaper,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  MARKET_NEWS_TEMPLATE,
  AI_PROMPTS,
  parseMarketNews,
} from '@/lib/bulk-data-parsers'
import { useAuth } from '@/lib/auth-context'

interface BulkNewsEntryProps {
  onSuccess?: () => void
}

/**
 * Bulk import UI for the homepage "IPO Market News" section. Mirrors the
 * look + flow of `<BulkDataEntry />` (used on IPO admin pages) but scoped to
 * a single section, since market news is homepage-level and not tied to an
 * individual IPO.
 */
export function BulkNewsEntry({ onSuccess }: BulkNewsEntryProps) {
  const { authFetch } = useAuth()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [loading, setLoading] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)

  const preview = useMemo(() => {
    if (!text.trim()) return null
    const parsed = parseMarketNews(text)
    return {
      success: parsed.success,
      count: parsed.data.length,
      errors: parsed.errors,
      firstTitle: parsed.data[0]?.title ?? null,
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
      toast.error('Paste your news data first')
      return
    }

    setLoading(true)
    try {
      const res = await authFetch('/api/admin/market-news/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, skipDuplicates }),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(
          json.error ||
            (json.details && Array.isArray(json.details)
              ? json.details.join(', ')
              : 'Import failed'),
        )
      }

      toast.success(json.message || 'News imported')
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
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                <Upload className="h-4 w-4" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-white flex items-center gap-2">
                  Bulk Import News
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                    Copy-Paste Format
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Add multiple market news items at once by pasting a simple
                  structured block. Duplicates (by URL) are skipped by default.
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
            {/* Template + AI prompt */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-slate-300 text-sm">Format Template</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(MARKET_NEWS_TEMPLATE, 'template')}
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
                  {MARKET_NEWS_TEMPLATE.slice(0, 480)}...
                </pre>
              </div>

              <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/20">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-indigo-300 text-sm">AI Prompt (ChatGPT/Claude)</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(AI_PROMPTS.marketNews, 'prompt')}
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
                  Copy this prompt, paste raw headlines/URLs into ChatGPT or
                  Claude, and the model will format them into the expected
                  block. Paste the formatted output below.
                </p>
                <p className="text-[11px] text-indigo-300/60 mt-2">
                  <Newspaper className="inline h-3 w-3 mr-1" />
                  Only the DATE is stored — no time component.
                </p>
              </div>
            </div>

            {/* Paste area */}
            <div>
              <Label className="text-slate-300 mb-2 block">
                Paste Formatted News
              </Label>
              <Textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Paste the formatted === MARKET_NEWS === block here..."
                className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm min-h-[220px]"
              />
            </div>

            {/* Preview */}
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
                      ? `Parsed ${preview.count} news item(s)`
                      : 'Parse error'}
                  </p>
                  {preview.success && preview.firstTitle && (
                    <p className="text-xs mt-0.5 text-emerald-300/70 truncate">
                      First: {preview.firstTitle}
                    </p>
                  )}
                  {preview.errors.length > 0 && (
                    <ul className="text-xs mt-1 text-red-300/80 list-disc pl-4 space-y-0.5">
                      {preview.errors.slice(0, 5).map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                      {preview.errors.length > 5 && (
                        <li>...and {preview.errors.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Options + submit */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="skip-duplicates"
                  checked={skipDuplicates}
                  onCheckedChange={checked => setSkipDuplicates(checked === true)}
                  className="border-slate-600"
                />
                <Label
                  htmlFor="skip-duplicates"
                  className="text-sm text-slate-400 cursor-pointer"
                >
                  Skip duplicates (by URL)
                </Label>
              </div>

              <Button
                type="button"
                onClick={handleImport}
                disabled={loading || !text.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Import News
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  )
}
