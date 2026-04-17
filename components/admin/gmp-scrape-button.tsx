"use client"

import { useState } from "react"
import { useSWRConfig } from "swr"
import { Loader2, RefreshCw, ChevronDown, CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth-context"

type SourceOutcome = {
  source: string
  gmp: number | null
  cached: boolean
  skipped: boolean
  error?: string
}

type ScrapeResponse = {
  ipo_id: number
  company_name: string
  averaged_gmp: number | null
  sources_used: string[]
  inserted: boolean
  skipped: boolean
  failed: boolean
  error: string | null
  per_source: SourceOutcome[]
  duration_ms: number
}

interface Props {
  ipoId: number
  /** SWR keys to revalidate after a successful scrape. */
  revalidateKeys?: string[]
  className?: string
}

export function GMPScrapeButton({ ipoId, revalidateKeys = [], className }: Props) {
  const { authFetch } = useAuth()
  const { mutate } = useSWRConfig()
  const [loading, setLoading] = useState(false)
  const [lastResult, setLastResult] = useState<ScrapeResponse | null>(null)

  const handleScrape = async () => {
    setLoading(true)
    try {
      const res = await authFetch(`/api/admin/scrape-gmp/${ipoId}`, {
        method: "POST",
      })
      const data = (await res.json()) as ScrapeResponse | { error: string }

      if (!res.ok || "error" in data && !("per_source" in data)) {
        const msg = "error" in data && data.error ? data.error : "Scrape failed"
        toast.error(msg as string)
        return
      }

      const result = data as ScrapeResponse
      setLastResult(result)

      if (result.inserted) {
        toast.success(
          `GMP updated: Rs ${result.averaged_gmp} (from ${result.sources_used.join(", ")})`
        )
      } else if (result.skipped) {
        toast.info(`No change (Rs ${result.averaged_gmp})`)
      } else if (result.failed) {
        toast.error(result.error || "All sources failed")
      }

      // Revalidate caller-provided SWR keys
      for (const key of revalidateKeys) {
        mutate(key)
      }
      mutate(`/api/admin/ipos/${ipoId}/gmp-history`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scrape failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleScrape}
        disabled={loading}
        className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-2" />
        )}
        {loading ? "Scraping..." : "Scrape GMP Now"}
      </Button>

      {lastResult && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" className="text-slate-400">
              Details
              <ChevronDown className="h-4 w-4 ml-1" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72 bg-slate-800 border-slate-700 text-slate-200">
            <DropdownMenuLabel className="text-white">
              {lastResult.company_name}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-700" />
            <div className="px-2 py-1.5 text-xs text-slate-400">
              Averaged GMP:{" "}
              <span className="text-white font-medium">
                {lastResult.averaged_gmp !== null
                  ? `Rs ${lastResult.averaged_gmp}`
                  : "—"}
              </span>
            </div>
            <DropdownMenuSeparator className="bg-slate-700" />
            {lastResult.per_source.map((s) => (
              <div
                key={s.source}
                className="flex items-center justify-between px-2 py-1.5 text-xs"
              >
                <span className="flex items-center gap-2 capitalize">
                  {s.gmp !== null ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : s.skipped ? (
                    <MinusCircle className="h-3.5 w-3.5 text-yellow-400" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 text-red-400" />
                  )}
                  {s.source}
                  {s.cached && (
                    <span className="text-[10px] text-slate-500">(cached)</span>
                  )}
                </span>
                <span className="text-slate-300">
                  {s.gmp !== null ? `Rs ${s.gmp}` : s.error || "—"}
                </span>
              </div>
            ))}
            <DropdownMenuSeparator className="bg-slate-700" />
            <div className="px-2 py-1.5 text-[11px] text-slate-500">
              Took {lastResult.duration_ms}ms
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
