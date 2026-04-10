'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { Loader2, Plus, Trash2, TrendingUp, RefreshCw, Clock } from 'lucide-react'

interface IPO {
  id: number
  name: string
  slug: string
  status: string
  price_max: number
}

interface GMPHistoryEntry {
  id: number
  ipo_id: number
  gmp: number
  gmp_percent: number
  date: string
  time_slot: 'morning' | 'evening' | null
  source: string | null
  created_at: string
  ipos: {
    name: string
    slug: string
    company_name?: string
  } | null
}

interface GMPManagementClientProps {
  ipos: IPO[]
  gmpHistory: GMPHistoryEntry[]
}

export function GMPManagementClient({ ipos, gmpHistory }: GMPManagementClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [scraping, setScraping] = useState(false)
  const [selectedIpoId, setSelectedIpoId] = useState<string>('')
  const [gmpValue, setGmpValue] = useState<string>('')
  const [gmpDate, setGmpDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [gmpTimeSlot, setGmpTimeSlot] = useState<'morning' | 'evening'>('morning')
  const [gmpSource, setGmpSource] = useState<string>('manual')

  const selectedIpo = ipos.find(i => i.id.toString() === selectedIpoId)

  const calculateGmpPercent = () => {
    if (!selectedIpo || !gmpValue) return 0
    return Math.round((parseFloat(gmpValue) / selectedIpo.price_max) * 100 * 10) / 10
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedIpoId || !gmpValue || !gmpDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/admin/gmp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipo_id: parseInt(selectedIpoId),
          gmp: parseFloat(gmpValue),
          gmp_percent: calculateGmpPercent(),
          date: gmpDate,
          time_slot: gmpTimeSlot,
          source: gmpSource || 'manual',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add GMP entry')
      }

      toast.success('GMP entry added successfully')
      
      // Reset form
      setSelectedIpoId('')
      setGmpValue('')
      setGmpSource('manual')
      
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add GMP entry')
      console.error('GMP submit error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualScrape = async () => {
    setScraping(true)
    try {
      const response = await fetch('/api/cron/scrape-gmp', {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to scrape GMP data')
      }

      toast.success(`GMP scrape completed: ${result.successCount}/${result.totalCount} IPOs updated`)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scrape GMP data')
      console.error('Scrape error:', error)
    } finally {
      setScraping(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const response = await fetch(`/api/admin/gmp/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete GMP entry')
      }

      toast.success('GMP entry deleted')
      router.refresh()
    } catch (error) {
      toast.error('Failed to delete GMP entry')
      console.error('Delete error:', error)
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
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
          GMP Management
        </h1>
        <p className="text-slate-400 mt-1">
          Add and manage Grey Market Premium entries for IPOs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add GMP Form */}
        <div className="lg:col-span-1">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-semibold text-white">Add GMP Entry</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="ipo" className="text-slate-300">Select IPO *</Label>
                <Select
                  value={selectedIpoId}
                  onValueChange={setSelectedIpoId}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue placeholder="Choose an IPO" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {ipos.length === 0 ? (
                      <SelectItem value="none" disabled className="text-slate-400">
                        No active IPOs found
                      </SelectItem>
                    ) : (
                      ipos.map((ipo) => (
                        <SelectItem 
                          key={ipo.id} 
                          value={ipo.id.toString()} 
                          className="text-white hover:bg-slate-600"
                        >
                          {ipo.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="gmp" className="text-slate-300">GMP Value (Rs) *</Label>
                <Input
                  id="gmp"
                  type="number"
                  step="0.01"
                  value={gmpValue}
                  onChange={(e) => setGmpValue(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
                  placeholder="e.g., 25"
                />
                {selectedIpo && gmpValue && (
                  <p className="text-sm text-slate-400 mt-1">
                    GMP %: {calculateGmpPercent()}% (based on Rs {selectedIpo.price_max})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="date" className="text-slate-300">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={gmpDate}
                  onChange={(e) => setGmpDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white mt-1"
                />
              </div>

<div>
  <Label htmlFor="time_slot" className="text-slate-300">Time Slot *</Label>
  <Select
    value={gmpTimeSlot}
    onValueChange={(value: 'morning' | 'evening') => setGmpTimeSlot(value)}
  >
    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
      <SelectValue placeholder="Select time slot" />
    </SelectTrigger>
    <SelectContent className="bg-slate-700 border-slate-600">
      <SelectItem value="morning" className="text-white hover:bg-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Morning (12 PM IST)</span>
        </div>
      </SelectItem>
      <SelectItem value="evening" className="text-white hover:bg-slate-600">
        <div className="flex items-center gap-2">
          <Clock className="h-3 w-3" />
          <span>Evening (10 PM IST)</span>
        </div>
      </SelectItem>
    </SelectContent>
  </Select>
  <p className="text-xs text-slate-500 mt-1">Morning: 12 PM IST | Evening: 10 PM IST</p>
  </div>

  <div>
  <Label htmlFor="source" className="text-slate-300">Source</Label>
                <Input
                  id="source"
                  value={gmpSource}
                  onChange={(e) => setGmpSource(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
                  placeholder="e.g., IPOWatch, InvestorGain"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || ipos.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Plus className="h-4 w-4 mr-2" />
                Add GMP Entry
              </Button>
            </form>
          </div>
        </div>

        {/* GMP History Table */}
        <div className="lg:col-span-2">
<div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
  <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
  <h2 className="font-semibold text-white">Recent GMP History</h2>
  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={handleManualScrape}
    disabled={scraping}
    className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
  >
    {scraping ? (
      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
    ) : (
      <RefreshCw className="h-4 w-4 mr-2" />
    )}
    {scraping ? 'Scraping...' : 'Scrape GMP Now'}
  </Button>
  </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700/50">
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      IPO Name
                    </th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      GMP
                    </th>
<th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
  Date
  </th>
  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
  Slot
  </th>
  <th className="text-left px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Source
                    </th>
                    <th className="text-right px-6 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gmpHistory.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No GMP entries found. Add your first entry to get started.
                      </td>
                    </tr>
                  ) : (
                    gmpHistory.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-white">
                            {entry.ipos?.name || 'Unknown IPO'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-medium ${entry.gmp >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            Rs {entry.gmp}
                            <span className="text-slate-400 font-normal ml-1">
                              ({entry.gmp_percent}%)
                            </span>
                          </div>
                        </td>
<td className="px-6 py-4 text-slate-300">
  {formatDate(entry.date)}
  </td>
  <td className="px-6 py-4">
  {entry.time_slot && (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
      entry.time_slot === 'morning' 
        ? 'bg-yellow-500/20 text-yellow-400' 
        : 'bg-blue-500/20 text-blue-400'
    }`}>
      {entry.time_slot === 'morning' ? '12 PM' : '10 PM'}
    </span>
  )}
  {!entry.time_slot && <span className="text-slate-500">-</span>}
  </td>
  <td className="px-6 py-4 text-slate-400">
  {entry.source || '-'}
  </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent className="bg-slate-800 border-slate-700">
                                <AlertDialogHeader>
                                  <AlertDialogTitle className="text-white">Delete GMP Entry</AlertDialogTitle>
                                  <AlertDialogDescription className="text-slate-400">
                                    Are you sure you want to delete this GMP entry? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(entry.id)}
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
        </div>
      </div>
    </div>
  )
}
