'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  List,
  Pencil,
  Trash2,
  Plus,
  RefreshCw,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface IPOData {
  id: number
  name: string
  slug: string
  abbr: string
  status: string
  exchange: string
  price_min: number
  price_max: number
  open_date: string
  close_date: string
  list_date: string
  created_at: string
  logo_url?: string
  bg_color?: string
  fg_color?: string
}

interface AdminDashboardClientProps {
  ipos: IPOData[]
  stats: {
    total: number
    open: number
    upcoming: number
    closed: number
  }
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  lastday: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  allot: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  listing: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
}

export function AdminDashboardClient({ ipos, stats }: AdminDashboardClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [syncingStatus, setSyncingStatus] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false)
  const [migratingIpo, setMigratingIpo] = useState<IPOData | null>(null)
  const [listingPrice, setListingPrice] = useState('')
  const [migrating, setMigrating] = useState(false)

  // Auto-sync status on page load
  useEffect(() => {
    const autoSync = async () => {
      try {
        const response = await fetch('/api/admin/auto-status', { method: 'POST' })
        if (response.ok) {
          const data = await response.json()
          if (data.updates && data.updates.length > 0) {
            toast.success(`Updated ${data.updates.length} IPO status(es)`)
            router.refresh()
          }
          setLastSynced(new Date().toLocaleTimeString())
        }
      } catch (error) {
        console.error('Auto-sync error:', error)
      }
    }
    autoSync()
  }, [router])

  const handleSyncStatus = async () => {
    setSyncingStatus(true)
    try {
      const response = await fetch('/api/admin/auto-status', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        if (data.updates && data.updates.length > 0) {
          toast.success(`Updated ${data.updates.length} IPO(s): ${data.updates.map((u: { name: string }) => u.name).join(', ')}`)
          router.refresh()
        } else {
          toast.info('All IPO statuses are up to date')
        }
        setLastSynced(new Date().toLocaleTimeString())
      } else {
        throw new Error('Failed to sync')
      }
    } catch (error) {
      toast.error('Failed to sync IPO statuses')
      console.error('Sync error:', error)
    } finally {
      setSyncingStatus(false)
    }
  }

  // Manual trigger for GMP and subscription data refresh
  const [refreshingData, setRefreshingData] = useState(false)
  const handleRefreshData = async () => {
    setRefreshingData(true)
    try {
      const response = await fetch('/api/cron/update-subscriptions', { method: 'POST' })
      if (response.ok) {
        const data = await response.json()
        toast.success(`GMP & Subscription data refreshed for ${data.results?.length || 0} IPO(s)`)
        router.refresh()
      } else {
        throw new Error('Failed to refresh')
      }
    } catch (error) {
      toast.error('Failed to refresh GMP & subscription data')
      console.error('Refresh error:', error)
    } finally {
      setRefreshingData(false)
    }
  }

  const openMigrateDialog = (ipo: IPOData) => {
    setMigratingIpo(ipo)
    setListingPrice('')
    setMigrateDialogOpen(true)
  }

  const handleMigrate = async () => {
    if (!migratingIpo || !listingPrice) return
    
    setMigrating(true)
    try {
      const response = await fetch(`/api/admin/ipos/${migratingIpo.id}/migrate-listed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list_price: parseFloat(listingPrice) }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to migrate')
      }

      toast.success(`${migratingIpo.name} migrated to Listed IPOs`)
      setMigrateDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to migrate IPO')
    } finally {
      setMigrating(false)
    }
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/ipos/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete IPO')
      }

      toast.success('IPO deleted successfully')
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete IPO')
      console.error('Delete error:', error)
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage IPO data, GMP, and subscription information
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshData}
            disabled={refreshingData}
            className="border-cyan-600/50 text-cyan-300 hover:bg-cyan-700/20"
            title="Manually refresh GMP and subscription data from Chittorgarh (auto-refreshes every 15 mins)"
          >
            {refreshingData ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh GMP/Sub
          </Button>
          <Button
            variant="outline"
            onClick={handleSyncStatus}
            disabled={syncingStatus}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
            title="Update IPO statuses based on dates"
          >
            {syncingStatus ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Sync Status
          </Button>
          <Link href="/admin/ipos/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New IPO
            </Button>
          </Link>
        </div>
        {lastSynced && (
          <p className="text-xs text-slate-500 mt-2 sm:mt-0 sm:absolute sm:right-0 sm:top-full">
            Last synced: {lastSynced}
          </p>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={List}
          label="Total IPOs"
          value={stats.total}
          color="text-slate-400"
          bgColor="bg-slate-700/50"
        />
        <StatCard
          icon={TrendingUp}
          label="Open IPOs"
          value={stats.open}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={stats.upcoming}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={CheckCircle}
          label="Closed/Listed"
          value={stats.closed}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* IPO Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-white">All IPOs</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700/50">
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  IPO Name
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Exchange
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Price Band
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Open Date
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {ipos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No IPOs found. Add your first IPO to get started.
                  </td>
                </tr>
              ) : (
                ipos.map((ipo) => (
                  <tr key={ipo.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{ipo.name}</div>
                      <div className="text-sm text-slate-400">{ipo.slug}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {ipo.exchange}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      Rs {ipo.price_min} - {ipo.price_max}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {formatDate(ipo.open_date)}
                    </td>
                    <td className="px-6 py-4">
                      <Badge 
                        variant="outline" 
                        className={statusColors[ipo.status] || statusColors.closed}
                      >
                        {ipo.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
<div className="flex items-center justify-end gap-2">
  {/* Migrate to Listed button - show only for listing status */}
  {ipo.status === 'listing' && (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => openMigrateDialog(ipo)}
      className="text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
      title="Migrate to Listed IPOs"
    >
      <ArrowRight className="h-4 w-4" />
    </Button>
  )}
  <Link href={`/admin/ipos/${ipo.id}/edit`}>
  <Button
  variant="ghost"
  size="icon"
  className="text-slate-400 hover:text-white hover:bg-slate-700"
  >
  <Pencil className="h-4 w-4" />
  </Button>
  </Link>
  <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              disabled={deletingId === ipo.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-slate-800 border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-white">Delete IPO</AlertDialogTitle>
                              <AlertDialogDescription className="text-slate-400">
                                Are you sure you want to delete &quot;{ipo.name}&quot;? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(ipo.id)}
                                className="bg-red-600 text-white hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Migrate to Listed Dialog */}
      <Dialog open={migrateDialogOpen} onOpenChange={setMigrateDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Migrate to Listed IPOs
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {migratingIpo && (
                <>
                  Enter the listing price for <strong className="text-white">{migratingIpo.name}</strong> to migrate it to the Listed IPOs directory.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="listingPrice" className="text-slate-300">
                Listing Price (Rs)
              </Label>
              <Input
                id="listingPrice"
                type="number"
                value={listingPrice}
                onChange={(e) => setListingPrice(e.target.value)}
                placeholder={migratingIpo ? `Issue price: Rs ${migratingIpo.price_max}` : 'Enter listing price'}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            {listingPrice && migratingIpo && (
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gain/Loss:</span>
                  <span className={parseFloat(listingPrice) >= migratingIpo.price_max ? 'text-green-400' : 'text-red-400'}>
                    {((parseFloat(listingPrice) - migratingIpo.price_max) / migratingIpo.price_max * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setMigrateDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={!listingPrice || migrating}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {migrating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Migrate to Listed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
  }
  
  function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: string
  bgColor: string
}) {
  return (
    <div className={`${bgColor} rounded-xl p-4 lg:p-6 border border-slate-700`}>
      <div className={`${color} mb-3`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="text-2xl lg:text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400 mt-1">{label}</div>
    </div>
  )
}
