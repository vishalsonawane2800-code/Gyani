'use client'

// Admin Automation dashboard.
// - Dispatcher heartbeat card (sticky)
// - 3 scraper health cards (gmp, subscription, dispatcher)
// - Recent runs table with filters
// - IPOs needing attention panel (stale data)
// All data via SWR with 30s refresh.

import { Fragment, useMemo, useState } from 'react'
import useSWR from 'swr'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  PlayCircle,
  RefreshCw,
  TrendingUp,
  Users,
  Workflow,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/lib/auth-context'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScraperKey = 'gmp' | 'subscription' | 'dispatcher'

type ScraperSummary = {
  lastRun: string | null
  lastStatus: 'success' | 'failed' | 'skipped' | null
  lastError: string | null
  successRate24h: number
  itemsLastRun: number
  runsLast24h: number
  successRuns24h: number
  avgDurationMs24h: number | null
}

type HealthResponse = {
  scrapers: Record<ScraperKey, ScraperSummary>
  recentRuns: Array<{
    id: string | number
    scraper_name: string
    status: 'success' | 'failed' | 'skipped'
    items_processed: number | null
    error_message: string | null
    duration_ms: number | null
    ran_at: string
  }>
}

type DataQualityResponse = {
  cutoffs: { gmp_hours: number; subscription_hours: number }
  totals: {
    stale_gmp: number
    stale_subscription: number
    needs_attention: number
  }
  needs_attention: Array<{
    ipo_id: number
    company_name: string
    slug: string
    status: string
    exchange: string | null
    stale: string[]
  }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeAgo(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'just now'
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const days = Math.floor(hr / 24)
  return `${days}d ago`
}

function formatAbsolute(iso: string | null): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`
}

function healthTone(
  summary: ScraperSummary
): { label: string; cls: string } {
  if (!summary.lastRun) return { label: 'No runs', cls: 'bg-slate-700 text-slate-300' }
  if (summary.lastStatus === 'failed')
    return { label: 'Failed', cls: 'bg-red-500/20 text-red-300 border border-red-500/40' }
  if (summary.successRate24h < 0.8)
    return { label: 'Warning', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/40' }
  return { label: 'Healthy', cls: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AutomationClient() {
  const { authFetch } = useAuth()

  const fetcher = async (url: string) => {
    const res = await authFetch(url)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res.json()
  }

  const {
    data: health,
    error: healthError,
    isLoading: healthLoading,
    mutate: mutateHealth,
  } = useSWR<HealthResponse>('/api/admin/scraper-health', fetcher, {
    refreshInterval: 30_000,
  })

  const {
    data: quality,
    error: qualityError,
    isLoading: qualityLoading,
    mutate: mutateQuality,
  } = useSWR<DataQualityResponse>('/api/admin/data-quality', fetcher, {
    refreshInterval: 30_000,
  })

  const [runningName, setRunningName] = useState<string | null>(null)
  const [refreshingId, setRefreshingId] = useState<number | null>(null)
  const [scraperFilter, setScraperFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [visibleCount, setVisibleCount] = useState<number>(50)

  const triggerScraper = async (name: string) => {
    setRunningName(name)
    try {
      const res = await authFetch(`/api/admin/scrapers/${name}/trigger`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok || data.ok === false) {
        toast.error(data.error || `Failed to run ${name}`)
      } else {
        toast.success(`${name} finished`)
        mutateHealth()
        mutateQuality()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Failed to run ${name}`)
    } finally {
      setRunningName(null)
    }
  }

  const forceRefreshIpo = async (ipoId: number, companyName: string) => {
    setRefreshingId(ipoId)
    try {
      // Trigger both scrapers for this IPO. We reuse the existing per-IPO
      // admin endpoints that were built in earlier prompts.
      const [gmpRes, subRes] = await Promise.allSettled([
        authFetch(`/api/admin/scrape-gmp/${ipoId}`, { method: 'POST' }),
        authFetch(`/api/admin/scrape-subscription/${ipoId}`, { method: 'POST' }),
      ])
      const okGmp = gmpRes.status === 'fulfilled' && gmpRes.value.ok
      const okSub = subRes.status === 'fulfilled' && subRes.value.ok
      if (okGmp || okSub) {
        toast.success(`${companyName}: refreshed`)
      } else {
        toast.error(`${companyName}: refresh failed`)
      }
      mutateQuality()
      mutateHealth()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Refresh failed')
    } finally {
      setRefreshingId(null)
    }
  }

  // Dispatcher heartbeat check: last dispatcher run within 20 min?
  const dispatcherSummary = health?.scrapers.dispatcher
  const dispatcherStale = useMemo(() => {
    if (!dispatcherSummary?.lastRun) return true
    return Date.now() - new Date(dispatcherSummary.lastRun).getTime() > 20 * 60 * 1000
  }, [dispatcherSummary])

  // Filtered recent runs
  const filteredRuns = useMemo(() => {
    if (!health?.recentRuns) return []
    return health.recentRuns.filter((r) => {
      if (scraperFilter !== 'all') {
        const aliases: Record<string, string[]> = {
          gmp: ['gmp', 'scrape-gmp'],
          subscription: ['subscription', 'scrape-subscription'],
          dispatcher: ['dispatcher'],
        }
        if (!aliases[scraperFilter]?.includes(r.scraper_name)) return false
      }
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      return true
    })
  }, [health?.recentRuns, scraperFilter, statusFilter])

  const visibleRuns = filteredRuns.slice(0, visibleCount)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
            Automation
          </h1>
          <p className="text-slate-400 mt-1">
            Scraper health, recent runs, and data quality (auto-refreshes every 30s)
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            mutateHealth()
            mutateQuality()
          }}
          disabled={healthLoading}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', healthLoading && 'animate-spin')} />
          Refresh now
        </Button>
      </div>

      {/* Dispatcher heartbeat (sticky) */}
      <div className="sticky top-0 z-10">
        <DispatcherHeartbeat
          summary={dispatcherSummary}
          stale={dispatcherStale}
        />
      </div>

      {/* Scraper Health Cards */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-white mb-3">
          Scraper Health
        </h2>
        {healthError ? (
          <ErrorState message="Failed to load scraper health" />
        ) : healthLoading && !health ? (
          <LoadingGrid />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <ScraperCard
              name="GMP"
              icon={TrendingUp}
              summary={health!.scrapers.gmp}
              onRun={() => triggerScraper('gmp')}
              loading={runningName === 'gmp'}
              triggerName="gmp"
            />
            <ScraperCard
              name="Subscription"
              icon={Users}
              summary={health!.scrapers.subscription}
              onRun={() => triggerScraper('subscription')}
              loading={runningName === 'subscription'}
              triggerName="subscription"
            />
            <ScraperCard
              name="Dispatcher"
              icon={Workflow}
              summary={health!.scrapers.dispatcher}
              onRun={() => triggerScraper('dispatcher')}
              loading={runningName === 'dispatcher'}
              triggerName="dispatcher"
            />
          </div>
        )}
      </section>

      {/* Data Quality */}
      <section>
        <h2 className="font-heading text-lg font-semibold text-white mb-3">
          IPOs Needing Attention
        </h2>
        {qualityError ? (
          <ErrorState message="Failed to load data quality" />
        ) : qualityLoading && !quality ? (
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <DataQualityPanel
            data={quality!}
            refreshingId={refreshingId}
            onRefresh={forceRefreshIpo}
          />
        )}
      </section>

      {/* Recent Runs */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <h2 className="font-heading text-lg font-semibold text-white">Recent Runs</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={scraperFilter} onValueChange={setScraperFilter}>
              <SelectTrigger className="w-[180px] bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="Scraper" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectItem value="all">All scrapers</SelectItem>
                <SelectItem value="gmp">GMP</SelectItem>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="dispatcher">Dispatcher</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-slate-200">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {healthError ? (
          <ErrorState message="Failed to load recent runs" />
        ) : !health ? (
          <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <RecentRunsTable
            runs={visibleRuns}
            total={filteredRuns.length}
            onLoadMore={() => setVisibleCount((c) => c + 50)}
          />
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DispatcherHeartbeat({
  summary,
  stale,
}: {
  summary: ScraperSummary | undefined
  stale: boolean
}) {
  const nextRun = useMemo(() => {
    if (!summary?.lastRun) return null
    // Vercel cron runs every 15 min; next is last + 15 min (approx).
    const next = new Date(new Date(summary.lastRun).getTime() + 15 * 60 * 1000)
    return next
  }, [summary?.lastRun])

  if (stale) {
    return (
      <div className="rounded-2xl border border-red-500/40 bg-red-500/10 backdrop-blur px-4 py-3 flex items-center gap-3 shadow-lg">
        <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-200">
            Dispatcher not running
          </p>
          <p className="text-xs text-red-300/80 truncate">
            Last run {summary?.lastRun ? timeAgo(summary.lastRun) : 'never'}. Check Vercel cron config and CRON_SECRET.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/80 backdrop-blur px-4 py-3 flex items-center gap-3 shadow-lg">
      <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
      <div className="flex-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="text-slate-200">Dispatcher</span>
        <span className="text-slate-400">
          Last: <span className="text-slate-200">{timeAgo(summary?.lastRun ?? null)}</span>
        </span>
        {nextRun && (
          <span className="text-slate-400">
            Next: <span className="text-slate-200">{timeAgo(nextRun.toISOString()).replace(' ago', '')} from now</span>
          </span>
        )}
        <span className="text-slate-400">
          24h success: <span className="text-slate-200">{summary ? pct(summary.successRate24h) : '-'}</span>
        </span>
      </div>
    </div>
  )
}

function ScraperCard({
  name,
  icon: Icon,
  summary,
  onRun,
  loading,
  triggerName,
}: {
  name: string
  icon: React.ComponentType<{ className?: string }>
  summary: ScraperSummary
  onRun: () => void
  loading: boolean
  triggerName: string
}) {
  const tone = healthTone(summary)
  return (
    <div className="rounded-2xl bg-slate-800 border border-slate-700 p-5 shadow-sm flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-slate-700/60">
            <Icon className="h-4 w-4 text-slate-200" />
          </div>
          <h3 className="font-heading text-base font-semibold text-white">{name}</h3>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', tone.cls)}>
          {tone.label}
        </span>
      </div>

      <div className="text-sm space-y-1">
        <div className="flex justify-between text-slate-400">
          <span>Last run</span>
          <span className="text-slate-200" title={formatAbsolute(summary.lastRun)}>
            {timeAgo(summary.lastRun)}
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>24h success</span>
          <span className="text-slate-200">
            {pct(summary.successRate24h)} ({summary.successRuns24h}/{summary.runsLast24h})
          </span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Items last run</span>
          <span className="text-slate-200">{summary.itemsLastRun}</span>
        </div>
        {summary.avgDurationMs24h !== null && (
          <div className="flex justify-between text-slate-400">
            <span>Avg duration (24h)</span>
            <span className="text-slate-200">{summary.avgDurationMs24h}ms</span>
          </div>
        )}
        {summary.lastStatus === 'failed' && summary.lastError && (
          <div className="mt-2 text-xs text-red-300/90 bg-red-500/10 border border-red-500/30 rounded p-2 line-clamp-3">
            {summary.lastError}
          </div>
        )}
      </div>

      <Button
        onClick={onRun}
        disabled={loading}
        size="sm"
        className="bg-indigo-600 hover:bg-indigo-700 text-white self-start"
        title={`Run ${triggerName} now`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <PlayCircle className="h-4 w-4 mr-2" />
        )}
        Run Now
      </Button>
    </div>
  )
}

function DataQualityPanel({
  data,
  refreshingId,
  onRefresh,
}: {
  data: DataQualityResponse
  refreshingId: number | null
  onRefresh: (id: number, name: string) => void
}) {
  if (data.needs_attention.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center text-slate-400">
        <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
        All active IPOs have fresh GMP and subscription data.
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="text-sm text-slate-200 font-medium">
            {data.needs_attention.length} IPO{data.needs_attention.length === 1 ? '' : 's'} need attention
          </span>
        </div>
        <span className="text-xs text-slate-500">
          GMP &gt; {data.cutoffs.gmp_hours}h · Subscription &gt; {data.cutoffs.subscription_hours}h
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Company</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-left px-4 py-2.5 font-medium">Exchange</th>
              <th className="text-left px-4 py-2.5 font-medium">Stale</th>
              <th className="text-right px-4 py-2.5 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {data.needs_attention.map((row) => (
              <tr key={row.ipo_id} className="hover:bg-slate-900/30">
                <td className="px-4 py-3 text-slate-200">{row.company_name}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="border-slate-600 text-slate-300 capitalize">
                    {row.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-400">{row.exchange || '-'}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {row.stale.map((tag) => (
                      <span
                        key={tag}
                        className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 capitalize"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/10"
                    disabled={refreshingId === row.ipo_id}
                    onClick={() => onRefresh(row.ipo_id, row.company_name)}
                  >
                    {refreshingId === row.ipo_id ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Force refresh
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RecentRunsTable({
  runs,
  total,
  onLoadMore,
}: {
  runs: HealthResponse['recentRuns']
  total: number
  onLoadMore: () => void
}) {
  const [expanded, setExpanded] = useState<Set<string | number>>(new Set())

  const toggle = (id: string | number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-800 border border-slate-700 p-6 text-center text-slate-400 text-sm">
        No runs match the current filters.
      </div>
    )
  }
  return (
    <div className="rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/40 text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">Scraper</th>
              <th className="text-left px-4 py-2.5 font-medium">Status</th>
              <th className="text-right px-4 py-2.5 font-medium">Items</th>
              <th className="text-right px-4 py-2.5 font-medium">Duration</th>
              <th className="text-left px-4 py-2.5 font-medium">Ran at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {runs.map((r) => (
              <Fragment key={r.id}>
                <tr
                  className={cn(
                    'hover:bg-slate-900/30',
                    r.error_message && 'cursor-pointer'
                  )}
                  onClick={() => r.error_message && toggle(r.id)}
                >
                  <td className="px-4 py-3 text-slate-200 font-mono text-xs">
                    {r.scraper_name}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={r.status} />
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                    {r.items_processed ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 tabular-nums">
                    {r.duration_ms ? `${r.duration_ms}ms` : '-'}
                  </td>
                  <td
                    className="px-4 py-3 text-slate-400"
                    title={formatAbsolute(r.ran_at)}
                  >
                    <Clock className="h-3.5 w-3.5 inline mr-1.5 opacity-70" />
                    {timeAgo(r.ran_at)}
                  </td>
                </tr>
                {expanded.has(r.id) && r.error_message && (
                  <tr className="bg-red-500/5">
                    <td colSpan={5} className="px-4 py-3">
                      <pre className="text-xs text-red-300/90 whitespace-pre-wrap break-words font-mono">
                        {r.error_message}
                      </pre>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {runs.length < total && (
        <div className="p-3 border-t border-slate-700 flex justify-center">
          <Button
            onClick={onLoadMore}
            size="sm"
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Load more ({total - runs.length} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: 'success' | 'failed' | 'skipped' }) {
  const map = {
    success: { cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', Icon: CheckCircle2 },
    failed: { cls: 'bg-red-500/20 text-red-300 border-red-500/40', Icon: XCircle },
    skipped: { cls: 'bg-slate-500/20 text-slate-300 border-slate-500/40', Icon: Clock },
  }
  const { cls, Icon } = map[status]
  return (
    <span className={cn('text-xs px-2 py-0.5 rounded-full border inline-flex items-center gap-1 capitalize', cls)}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl bg-slate-800 border border-slate-700 p-5 animate-pulse">
          <div className="h-5 bg-slate-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-slate-700 rounded w-full mb-2" />
          <div className="h-4 bg-slate-700 rounded w-2/3 mb-4" />
          <div className="h-8 bg-slate-700 rounded w-24" />
        </div>
      ))}
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-sm text-red-200 flex items-center gap-2">
      <XCircle className="h-4 w-4" />
      {message}
    </div>
  )
}
