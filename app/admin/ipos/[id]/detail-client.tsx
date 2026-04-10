'use client'

// Generate abbreviation from company name
function generateAbbr(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'IP';
}

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import {
  Pencil,
  Trash2,
  ArrowLeft,
  Plus,
  TrendingUp,
  Calendar,
  Building2,
  Users,
  ExternalLink,
  Loader2,
  RefreshCw,
} from 'lucide-react'

interface IPOData {
  id: number
  name: string
  slug: string
  abbr: string
  status: string
  exchange: string
  sector: string
  price_min: number
  price_max: number
  lot_size: number
  issue_size: string
  issue_size_cr: number
  fresh_issue: string
  ofs: string
  open_date: string
  close_date: string
  allotment_date: string
  list_date: string
  registrar: string
  lead_manager: string
  about_company: string
  bg_color: string
  fg_color: string
  logo_url: string
  gmp: number
  gmp_percent: number
  gmp_last_updated: string
  subscription_total: number
  subscription_retail: string
  subscription_nii: string
  subscription_qib: string
  subscription_day: number
  subscription_is_final: boolean
  ai_prediction: number
  ai_confidence: number
  sentiment_score: number
  sentiment_label: string
  chittorgarh_url: string
  investorgain_gmp_url: string
  investorgain_sub_url: string
  nse_symbol: string
  bse_scrip_code: string
  created_at: string
}

interface GMPHistoryEntry {
  id: number
  ipo_id: number
  gmp: number
  gmp_percent: number
  date: string
  source: string | null
  created_at: string
}

interface IPODetailClientProps {
  ipo: IPOData
  gmpHistory: GMPHistoryEntry[]
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  lastday: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  allot: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  listing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  listed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
}

const statusLabels: Record<string, string> = {
  upcoming: 'Upcoming',
  open: 'Open',
  lastday: 'Last Day',
  allot: 'Allotment',
  listing: 'Listing Today',
  closed: 'Closed',
  listed: 'Listed',
}

export function IPODetailClient({ ipo, gmpHistory }: IPODetailClientProps) {
  const router = useRouter()
  const [addGmpOpen, setAddGmpOpen] = useState(false)
  const [gmpValue, setGmpValue] = useState('')
  const [gmpDate, setGmpDate] = useState(new Date().toISOString().split('T')[0])
  const [addingGmp, setAddingGmp] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const latestGmp = gmpHistory[0]

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const calculateGmpPercent = () => {
    if (!gmpValue || !ipo.price_max) return 0
    return Math.round((parseFloat(gmpValue) / ipo.price_max) * 100 * 10) / 10
  }

  const handleAddGmp = async () => {
    if (!gmpValue || !gmpDate) {
      toast.error('Please fill in all fields')
      return
    }

    setAddingGmp(true)
    try {
      const response = await fetch('/api/admin/gmp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ipo_id: ipo.id,
          gmp: parseFloat(gmpValue),
          gmp_percent: calculateGmpPercent(),
          date: gmpDate,
          source: 'Manual Entry',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add GMP')
      }

      toast.success('GMP entry added')
      setAddGmpOpen(false)
      setGmpValue('')
      router.refresh()
    } catch (error) {
      toast.error('Failed to add GMP entry')
      console.error(error)
    } finally {
      setAddingGmp(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const response = await fetch(`/api/admin/ipos/${ipo.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete IPO')
      }

      toast.success('IPO deleted successfully')
      router.push('/admin')
    } catch (error) {
      toast.error('Failed to delete IPO')
      console.error(error)
    } finally {
      setDeleting(false)
    }
  }

  const handleRefreshData = async () => {
    setRefreshing(true)
    try {
      const response = await fetch('/api/cron/update-subscriptions', {
        method: 'POST',
      })

      if (!response.ok) {
        throw new Error('Failed to refresh')
      }

      toast.success('Data refreshed')
      router.refresh()
    } catch (error) {
      toast.error('Failed to refresh data')
      console.error(error)
    } finally {
      setRefreshing(false)
    }
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
          <div className="flex items-center gap-4">
            {ipo.logo_url ? (
              <Image
                src={ipo.logo_url}
                alt={ipo.name}
                width={56}
                height={56}
                className="rounded-lg"
              />
            ) : (
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-xl"
                style={{ backgroundColor: ipo.bg_color || '#f0f9ff', color: ipo.fg_color || '#0369a1' }}
              >
                {generateAbbr(ipo.name || 'IP')}
              </div>
            )}
            <div>
              <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
                {ipo.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <Badge variant="outline" className={statusColors[ipo.status]}>
                  {statusLabels[ipo.status] || ipo.status}
                </Badge>
                <span className="text-slate-400">{ipo.exchange}</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{ipo.sector}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshing}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>
          <Link href={`/admin/ipos/${ipo.id}/edit`}>
            <Button variant="outline" className="border-indigo-600/50 text-indigo-300 hover:bg-indigo-600/20">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-600/50 text-red-400 hover:bg-red-600/20">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-800 border-slate-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete IPO</AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  Are you sure you want to delete {ipo.name}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* GMP Highlight */}
          <div className="bg-gradient-to-r from-green-500/10 to-slate-800 rounded-xl border border-green-500/30 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-400" />
                <h2 className="text-lg font-semibold text-white">Latest GMP</h2>
              </div>
              <Button
                onClick={() => setAddGmpOpen(true)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add GMP
              </Button>
            </div>
            {latestGmp ? (
              <div className="flex items-baseline gap-4">
                <span className={`text-4xl font-bold ${latestGmp.gmp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Rs {latestGmp.gmp}
                </span>
                <span className="text-slate-400">
                  ({latestGmp.gmp_percent || calculateGmpPercent()}%)
                </span>
                <span className="text-sm text-slate-500">
                  as of {formatDate(latestGmp.date)}
                </span>
              </div>
            ) : (
              <p className="text-slate-400">No GMP data available. Add an entry to get started.</p>
            )}
          </div>

          {/* IPO Details */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">IPO Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Price Band" value={`Rs ${ipo.price_min} - ${ipo.price_max}`} />
              <DetailItem label="Lot Size" value={`${ipo.lot_size} shares`} />
              <DetailItem label="Issue Size" value={`Rs ${ipo.issue_size_cr} Cr`} />
              <DetailItem label="Fresh Issue" value={ipo.fresh_issue || '-'} />
              <DetailItem label="OFS" value={ipo.ofs || 'Nil'} />
              <DetailItem label="Est. List Price" value={latestGmp ? `Rs ${ipo.price_max + latestGmp.gmp}` : '-'} />
            </div>
          </div>

          {/* Key Dates */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">Key Dates</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <DetailItem label="Open Date" value={formatDate(ipo.open_date)} />
              <DetailItem label="Close Date" value={formatDate(ipo.close_date)} />
              <DetailItem label="Allotment" value={formatDate(ipo.allotment_date)} />
              <DetailItem label="Listing" value={formatDate(ipo.list_date)} />
            </div>
          </div>

          {/* Subscription Data */}
          {(ipo.subscription_total > 0 || ipo.subscription_retail) && (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Subscription Status</h2>
                {ipo.subscription_is_final && (
                  <Badge className="bg-green-500/20 text-green-400">Final</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DetailItem
                  label="Total"
                  value={ipo.subscription_total ? `${ipo.subscription_total.toFixed(2)}x` : '-'}
                  highlight
                />
                <DetailItem label="Retail" value={ipo.subscription_retail || '-'} />
                <DetailItem label="NII" value={ipo.subscription_nii || '-'} />
                <DetailItem label="QIB" value={ipo.subscription_qib || '-'} />
              </div>
              {ipo.subscription_day > 0 && (
                <p className="text-sm text-slate-500 mt-2">Day {ipo.subscription_day} subscription</p>
              )}
            </div>
          )}

          {/* GMP History */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-white">GMP History</h2>
              <span className="text-sm text-slate-400">{gmpHistory.length} entries</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">GMP</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">GMP %</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gmpHistory.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                        No GMP history available
                      </td>
                    </tr>
                  ) : (
                    gmpHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-700/30">
                        <td className="px-6 py-3 text-slate-300">{formatDate(entry.date)}</td>
                        <td className={`px-6 py-3 font-medium ${entry.gmp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          Rs {entry.gmp}
                        </td>
                        <td className="px-6 py-3 text-slate-400">{entry.gmp_percent}%</td>
                        <td className="px-6 py-3 text-slate-500">{entry.source || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Prediction */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">AI Prediction</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Prediction</span>
                <span className={`font-semibold ${ipo.ai_prediction >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {ipo.ai_prediction >= 0 ? '+' : ''}{ipo.ai_prediction}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Confidence</span>
                <span className="text-white">{ipo.ai_confidence}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Sentiment</span>
                <Badge className={
                  ipo.sentiment_label === 'Bullish' ? 'bg-green-500/20 text-green-400' :
                  ipo.sentiment_label === 'Bearish' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }>
                  {ipo.sentiment_label || 'Neutral'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Company Info */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-slate-400" />
              <h2 className="text-lg font-semibold text-white">Company Info</h2>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-slate-500">Registrar</span>
                <p className="text-slate-300">{ipo.registrar || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Lead Manager</span>
                <p className="text-slate-300">{ipo.lead_manager || '-'}</p>
              </div>
              {ipo.nse_symbol && (
                <div>
                  <span className="text-slate-500">NSE Symbol</span>
                  <p className="text-slate-300">{ipo.nse_symbol}</p>
                </div>
              )}
              {ipo.bse_scrip_code && (
                <div>
                  <span className="text-slate-500">BSE Scrip Code</span>
                  <p className="text-slate-300">{ipo.bse_scrip_code}</p>
                </div>
              )}
            </div>
          </div>

          {/* Scraper URLs */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Data Sources</h2>
            <div className="space-y-3">
              {ipo.chittorgarh_url && (
                <a
                  href={ipo.chittorgarh_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  Chittorgarh
                </a>
              )}
              {ipo.investorgain_gmp_url && (
                <a
                  href={ipo.investorgain_gmp_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  InvestorGain GMP
                </a>
              )}
              {ipo.investorgain_sub_url && (
                <a
                  href={ipo.investorgain_sub_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="h-4 w-4" />
                  InvestorGain Subscription
                </a>
              )}
              {!ipo.chittorgarh_url && !ipo.investorgain_gmp_url && !ipo.investorgain_sub_url && (
                <p className="text-sm text-slate-500">No external URLs configured</p>
              )}
            </div>
          </div>

          {/* Meta Info */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Meta</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Created</span>
                <span className="text-slate-300">{formatDateTime(ipo.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">GMP Updated</span>
                <span className="text-slate-300">{ipo.gmp_last_updated ? formatDateTime(ipo.gmp_last_updated) : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Slug</span>
                <span className="text-slate-300 truncate max-w-[150px]">{ipo.slug}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add GMP Dialog */}
      <Dialog open={addGmpOpen} onOpenChange={setAddGmpOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Add GMP Entry</DialogTitle>
            <DialogDescription className="text-slate-400">
              Manually add a GMP entry for {ipo.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">GMP Value (Rs)</Label>
              <Input
                type="number"
                step="0.01"
                value={gmpValue}
                onChange={(e) => setGmpValue(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
                placeholder="e.g., 25"
              />
              {gmpValue && (
                <p className="text-sm text-slate-400 mt-1">
                  GMP %: {calculateGmpPercent()}% (based on Rs {ipo.price_max})
                </p>
              )}
            </div>
            <div>
              <Label className="text-slate-300">Date</Label>
              <Input
                type="date"
                value={gmpDate}
                onChange={(e) => setGmpDate(e.target.value)}
                className="bg-slate-700 border-slate-600 text-white mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddGmpOpen(false)}
              className="border-slate-600 text-slate-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddGmp}
              disabled={addingGmp || !gmpValue}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {addingGmp && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add GMP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailItem({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <span className="text-xs text-slate-500 uppercase tracking-wider">{label}</span>
      <p className={`font-medium ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  )
}
