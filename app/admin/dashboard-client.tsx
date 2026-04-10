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

/* =========================================================================
   ADMIN DASHBOARD - IPO Management Guide
   =========================================================================
   
   This dashboard helps you manage IPOs through their lifecycle:
   
   IPO STATUS FLOW:
   ================
   upcoming → open → lastday → closed → allot → listing → listed
   
   The system automatically transitions IPOs based on dates:
   - upcoming: Before open_date (IPO not yet started)
   - open: Between open_date and close_date (accepting applications)
   - lastday: On close_date (last day to apply)
   - closed: After close_date, before allotment (processing)
   - allot: On/after allotment_date (allotment happening)
   - listing: On/after list_date (stock is listing today)
   - listed: Migrated to Listed IPOs directory (permanent record)
   
   SECTIONS ON THIS PAGE:
   ======================
   1. UPCOMING IPOs - IPOs not yet open for subscription
      → Click "Add New IPO" to add upcoming IPOs
      → Set status to "upcoming" when creating
   
   2. CURRENT/OPEN IPOs - IPOs currently accepting applications
      → These show GMP and subscription data
      → Includes "open" and "lastday" status
   
   3. PROCESSING IPOs - Between close and listing
      → "closed", "allot" statuses
      → Waiting for allotment results
   
   4. LISTING TODAY - IPOs listing on exchange today
      → Click arrow button to migrate to Listed IPOs
      → Enter the listing price to calculate gain/loss
   
   5. ALL IPOs TABLE - Complete list with all actions
   
   QUICK ACTIONS:
   ==============
   - "Sync Status" - Updates status based on dates (auto-runs on page load)
   - "Refresh GMP/Sub" - Fetches latest GMP and subscription from external source
   - "Add New IPO" - Create a new IPO entry
   
   ========================================================================= */

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
  Loader2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Eye
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
  allotment_date: string
  created_at: string
  logo_url?: string
  bg_color?: string
  fg_color?: string
  gmp?: number
  subscription_total?: number
  ai_prediction?: number
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

/* 
  STATUS COLORS:
  - upcoming (blue): IPO not yet started
  - open (green): Currently accepting applications  
  - lastday (amber): Last day to apply
  - allot (purple): Allotment in progress
  - listing (cyan): Listing happening today
  - closed (slate): Closed, waiting for next stage
  - listed (emerald): Successfully listed and archived
*/
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

export function AdminDashboardClient({ ipos, stats }: AdminDashboardClientProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [syncingStatus, setSyncingStatus] = useState(false)
  const [lastSynced, setLastSynced] = useState<string | null>(null)
  const [migrateDialogOpen, setMigrateDialogOpen] = useState(false)
  const [migratingIpo, setMigratingIpo] = useState<IPOData | null>(null)
  const [listingPrice, setListingPrice] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false)
  const [statusChangeIpo, setStatusChangeIpo] = useState<IPOData | null>(null)
  const [newStatus, setNewStatus] = useState('')
  const [changingStatus, setChangingStatus] = useState(false)
  
  // Section collapse states
  const [showAllIpos, setShowAllIpos] = useState(false)

  // Categorize IPOs for different sections
  // Upcoming: IPOs not yet open
  const upcomingIpos = ipos.filter(i => i.status === 'upcoming')
  // Current/Open: IPOs currently accepting applications
  const currentIpos = ipos.filter(i => i.status === 'open' || i.status === 'lastday')
  // Processing: Between close and listing
  const processingIpos = ipos.filter(i => i.status === 'closed' || i.status === 'allot')
  // Listing Today: Ready to migrate
  const listingIpos = ipos.filter(i => i.status === 'listing')
  // Already Listed (kept in ipos table with listed status)
  const listedIpos = ipos.filter(i => i.status === 'listed')

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

  // Quick status change function
  const openStatusChangeDialog = (ipo: IPOData) => {
    setStatusChangeIpo(ipo)
    setNewStatus(ipo.status)
    setStatusChangeDialogOpen(true)
  }

  const handleStatusChange = async () => {
    if (!statusChangeIpo || !newStatus) return
    
    setChangingStatus(true)
    try {
      const response = await fetch(`/api/admin/ipos/${statusChangeIpo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      toast.success(`${statusChangeIpo.name} status changed to ${statusLabels[newStatus]}`)
      setStatusChangeDialogOpen(false)
      router.refresh()
    } catch (error) {
      toast.error('Failed to change status')
      console.error('Status change error:', error)
    } finally {
      setChangingStatus(false)
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

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    })
  }

  return (
    <div className="p-6 lg:p-8">
      {/* ================================================================
          HEADER SECTION
          Contains: Title, sync buttons, and add new IPO button
          ================================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
            Admin Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Manage IPO data, GMP, and subscription information
            {lastSynced && <span className="text-xs text-slate-500 ml-2">• Last synced: {lastSynced}</span>}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* REFRESH GMP/SUB: Fetches latest GMP and subscription data from Chittorgarh */}
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
          
          {/* SYNC STATUS: Updates IPO statuses based on current date vs dates */}
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
          
          {/* ADD NEW IPO: Opens the IPO creation form */}
          <Link href="/admin/ipos/new">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Add New IPO
            </Button>
          </Link>
        </div>
      </div>

      {/* ================================================================
          STATS CARDS
          Quick overview of IPO counts by category
          ================================================================ */}
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
          label="Open/Current"
          value={currentIpos.length}
          color="text-green-400"
          bgColor="bg-green-500/10"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value={upcomingIpos.length}
          color="text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <StatCard
          icon={CheckCircle}
          label="Processing/Listing"
          value={processingIpos.length + listingIpos.length}
          color="text-purple-400"
          bgColor="bg-purple-500/10"
        />
      </div>

      {/* ================================================================
          SECTION 1: LISTING TODAY
          IPOs that are listing on the exchange today
          ACTION: Migrate to Listed IPOs directory with listing price
          ================================================================ */}
      {listingIpos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-lg font-semibold text-white">Listing Today</h2>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              {listingIpos.length} IPO(s)
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            These IPOs are listing on the exchange today. Click the arrow to migrate them to the Listed IPOs directory with their listing price.
          </p>
          <div className="grid gap-4">
            {listingIpos.map((ipo) => (
              <div
                key={ipo.id}
                className="bg-gradient-to-r from-cyan-500/10 to-slate-800 rounded-xl border border-cyan-500/30 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center font-bold"
                      style={{ backgroundColor: ipo.bg_color || '#f0f9ff', color: ipo.fg_color || '#0369a1' }}
                    >
                      {generateAbbr(ipo.name || 'IP')}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{ipo.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <span>{ipo.exchange}</span>
                        <span>•</span>
                        <span>Rs {ipo.price_min}-{ipo.price_max}</span>
                        {ipo.gmp && (
                          <>
                            <span>•</span>
                            <span className={ipo.gmp >= 0 ? 'text-green-400' : 'text-red-400'}>
                              GMP: Rs {ipo.gmp}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/ipos/${ipo.id}/edit`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      onClick={() => openMigrateDialog(ipo)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Migrate to Listed
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          SECTION 2: CURRENT/OPEN IPOs
          IPOs currently accepting applications (open + lastday status)
          Shows GMP and subscription data
          ================================================================ */}
      {currentIpos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <h2 className="text-lg font-semibold text-white">Current / Open IPOs</h2>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              {currentIpos.length} IPO(s)
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            These IPOs are currently accepting applications. GMP and subscription data refresh automatically every 15 minutes.
          </p>
          <div className="grid gap-3">
            {currentIpos.map((ipo) => (
              <div
                key={ipo.id}
                className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: ipo.bg_color || '#f0f9ff', color: ipo.fg_color || '#0369a1' }}
                    >
                      {generateAbbr(ipo.name || 'IP')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{ipo.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={statusColors[ipo.status]}
                        >
                          {statusLabels[ipo.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span>{ipo.exchange}</span>
                        <span>•</span>
                        <span>Rs {ipo.price_min}-{ipo.price_max}</span>
                        <span>•</span>
                        <span>Closes: {formatShortDate(ipo.close_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {/* GMP Display */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">GMP</div>
                      <div className={`font-semibold ${(ipo.gmp ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {ipo.gmp ? `Rs ${ipo.gmp}` : '-'}
                      </div>
                    </div>
                    {/* Subscription Display */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Subscription</div>
                      <div className="font-semibold text-white">
                        {ipo.subscription_total ? `${ipo.subscription_total.toFixed(2)}x` : '-'}
                      </div>
                    </div>
                    {/* AI Prediction Display */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">AI Pred</div>
                      <div className={`font-semibold flex items-center justify-center gap-1 ${(ipo.ai_prediction ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(ipo.ai_prediction ?? 0) >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {ipo.ai_prediction ? `${ipo.ai_prediction}%` : '-'}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openStatusChangeDialog(ipo)}
                        className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                        title="Change Status"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Link href={`/admin/ipos/${ipo.id}/edit`}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          SECTION 3: UPCOMING IPOs
          IPOs not yet open for subscription
          ================================================================ */}
      {upcomingIpos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <h2 className="text-lg font-semibold text-white">Upcoming IPOs</h2>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
              {upcomingIpos.length} IPO(s)
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            These IPOs will open for subscription soon. Status will automatically change to &quot;Open&quot; when the open date arrives.
          </p>
          <div className="grid gap-3">
            {upcomingIpos.map((ipo) => (
              <div
                key={ipo.id}
                className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-blue-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: ipo.bg_color || '#f0f9ff', color: ipo.fg_color || '#0369a1' }}
                    >
                      {generateAbbr(ipo.name || 'IP')}
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{ipo.name}</h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span>{ipo.exchange}</span>
                        <span>•</span>
                        <span>Rs {ipo.price_min}-{ipo.price_max}</span>
                        <span>•</span>
                        <span>Opens: {formatShortDate(ipo.open_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openStatusChangeDialog(ipo)}
                      className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                      title="Change Status"
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                    <Link href={`/admin/ipos/${ipo.id}/edit`}>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          SECTION 4: PROCESSING IPOs
          IPOs between close and listing (closed, allot status)
          ================================================================ */}
      {processingIpos.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-purple-400" />
            <h2 className="text-lg font-semibold text-white">Processing / Allotment</h2>
            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
              {processingIpos.length} IPO(s)
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            These IPOs have closed for subscription and are in processing or allotment phase.
          </p>
          <div className="grid gap-3">
            {processingIpos.map((ipo) => (
              <div
                key={ipo.id}
                className="bg-slate-800 rounded-xl border border-slate-700 p-4 hover:border-purple-500/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
                      style={{ backgroundColor: ipo.bg_color || '#f0f9ff', color: ipo.fg_color || '#0369a1' }}
                    >
                      {generateAbbr(ipo.name || 'IP')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-white">{ipo.name}</h3>
                        <Badge 
                          variant="outline" 
                          className={statusColors[ipo.status]}
                        >
                          {statusLabels[ipo.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span>{ipo.exchange}</span>
                        <span>•</span>
                        <span>Allotment: {formatShortDate(ipo.allotment_date)}</span>
                        <span>•</span>
                        <span>Listing: {formatShortDate(ipo.list_date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Final Subscription */}
                    <div className="text-center">
                      <div className="text-xs text-slate-500 mb-1">Final Sub</div>
                      <div className="font-semibold text-white">
                        {ipo.subscription_total ? `${ipo.subscription_total.toFixed(2)}x` : '-'}
                      </div>
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openStatusChangeDialog(ipo)}
                        className="text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                        title="Change Status"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                      <Link href={`/admin/ipos/${ipo.id}/edit`}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================
          SECTION 5: ALL IPOs TABLE (Collapsible)
          Complete list with all details and actions
          ================================================================ */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <button
          onClick={() => setShowAllIpos(!showAllIpos)}
          className="w-full px-6 py-4 border-b border-slate-700 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white">All IPOs</h2>
            <Badge variant="outline" className="border-slate-600 text-slate-400">
              {ipos.length} total
            </Badge>
          </div>
          {showAllIpos ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </button>
        
        {showAllIpos && (
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
                      <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
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
                          className={`cursor-pointer ${statusColors[ipo.status] || statusColors.closed}`}
                          onClick={() => openStatusChangeDialog(ipo)}
                        >
                          {statusLabels[ipo.status] || ipo.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* View details button */}
                          <Link href={`/admin/ipos/${ipo.id}`}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
                              title="View IPO Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
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
        )}
      </div>

      {/* ================================================================
          DIALOGS
          ================================================================ */}

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
                  This will archive the IPO with its final performance data.
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

      {/* Quick Status Change Dialog */}
      <Dialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Change IPO Status
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {statusChangeIpo && (
                <>
                  Manually change the status for <strong className="text-white">{statusChangeIpo.name}</strong>.
                  Note: Status normally updates automatically based on dates.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Current Status</Label>
              <Badge 
                variant="outline" 
                className={statusColors[statusChangeIpo?.status || 'upcoming']}
              >
                {statusLabels[statusChangeIpo?.status || 'upcoming']}
              </Badge>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newStatus" className="text-slate-300">
                New Status
              </Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem 
                      key={value} 
                      value={value} 
                      className="text-white hover:bg-slate-600"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStatusChangeDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={!newStatus || newStatus === statusChangeIpo?.status || changingStatus}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {changingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
