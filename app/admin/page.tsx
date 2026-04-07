import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Edit2, Trash2, ExternalLink, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { DeleteIPOButton } from '@/components/admin/delete-ipo-button'

interface IPORow {
  id: string
  name: string
  slug: string
  status: string
  exchange: string
  price_min: number
  price_max: number
  lot_size: number
  open_date: string
  close_date: string
  chittorgarh_url: string | null
  subscription_total: number | null
  created_at: string
}

async function getIPOs() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('ipos')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching IPOs:', error)
    return []
  }

  return data as IPORow[]
}

async function getStats() {
  const supabase = await createClient()
  
  const { data: allIPOs } = await supabase.from('ipos').select('status')
  
  const stats = {
    total: allIPOs?.length || 0,
    open: allIPOs?.filter(i => i.status === 'open' || i.status === 'lastday').length || 0,
    upcoming: allIPOs?.filter(i => i.status === 'upcoming').length || 0,
    closed: allIPOs?.filter(i => i.status === 'closed' || i.status === 'allot' || i.status === 'listing').length || 0,
  }
  
  return stats
}

function getStatusColor(status: string) {
  switch (status) {
    case 'open':
    case 'lastday':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'upcoming':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
    case 'allot':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
    case 'listing':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    case 'closed':
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
    default:
      return 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

export default async function AdminDashboard() {
  const [ipos, stats] = await Promise.all([getIPOs(), getStats()])

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white">IPO Dashboard</h1>
          <p className="text-sm text-[#71717a] mt-1">Manage all IPOs and their data</p>
        </div>
        <Link
          href="/admin/ipos/new"
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New IPO
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <p className="text-sm text-[#71717a] mb-1">Total IPOs</p>
          <p className="text-3xl font-semibold text-white">{stats.total}</p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <p className="text-sm text-[#71717a]">Open</p>
          </div>
          <p className="text-3xl font-semibold text-emerald-400">{stats.open}</p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <p className="text-sm text-[#71717a]">Upcoming</p>
          </div>
          <p className="text-3xl font-semibold text-blue-400">{stats.upcoming}</p>
        </div>
        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown className="w-4 h-4 text-zinc-400" />
            <p className="text-sm text-[#71717a]">Closed</p>
          </div>
          <p className="text-3xl font-semibold text-zinc-400">{stats.closed}</p>
        </div>
      </div>

      {/* IPO Table */}
      <div className="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#27272a]">
          <h2 className="text-lg font-medium text-white">All IPOs</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#27272a] text-left">
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Exchange</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Price Band</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Subscription</th>
                <th className="px-6 py-3 text-xs font-medium text-[#71717a] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#27272a]">
              {ipos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[#71717a]">
                    No IPOs found. Add your first IPO to get started.
                  </td>
                </tr>
              ) : (
                ipos.map((ipo) => (
                  <tr key={ipo.id} className="hover:bg-[#27272a]/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-white">{ipo.name}</p>
                        <p className="text-xs text-[#71717a]">{ipo.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(ipo.status)}`}>
                        {ipo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[#a1a1aa]">{ipo.exchange}</td>
                    <td className="px-6 py-4 text-sm text-[#a1a1aa]">
                      {ipo.price_min && ipo.price_max 
                        ? `₹${ipo.price_min} - ₹${ipo.price_max}` 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[#a1a1aa]">
                      <div>
                        <p>{formatDate(ipo.open_date)}</p>
                        <p className="text-xs text-[#52525b]">to {formatDate(ipo.close_date)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {ipo.subscription_total 
                        ? <span className="text-emerald-400">{ipo.subscription_total.toFixed(2)}x</span>
                        : <span className="text-[#52525b]">-</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/ipos/${ipo.id}/edit`}
                          className="p-2 text-[#71717a] hover:text-white hover:bg-[#27272a] rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        {ipo.chittorgarh_url && (
                          <a
                            href={ipo.chittorgarh_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-[#71717a] hover:text-white hover:bg-[#27272a] rounded-lg transition-colors"
                            title="View on Chittorgarh"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <DeleteIPOButton ipoId={ipo.id} ipoName={ipo.name} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
