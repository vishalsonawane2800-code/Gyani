'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface IPOFormData {
  id?: number
  name: string
  slug: string
  abbr: string
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
  status: string
  registrar: string
  lead_manager: string
  about_company: string
  chittorgarh_url: string
  nse_symbol: string
  bse_scrip_code: string
  bg_color: string
  fg_color: string
}

const defaultFormData: IPOFormData = {
  name: '',
  slug: '',
  abbr: '',
  exchange: 'BSE SME',
  sector: '',
  price_min: 0,
  price_max: 0,
  lot_size: 0,
  issue_size: '',
  issue_size_cr: 0,
  fresh_issue: '',
  ofs: 'Nil',
  open_date: '',
  close_date: '',
  allotment_date: '',
  list_date: '',
  status: 'upcoming',
  registrar: '',
  lead_manager: '',
  about_company: '',
  chittorgarh_url: '',
  nse_symbol: '',
  bse_scrip_code: '',
  bg_color: '#f0f9ff',
  fg_color: '#0369a1',
}

const exchanges = ['Mainboard', 'BSE SME', 'NSE SME', 'REIT']
const statuses = ['upcoming', 'open', 'lastday', 'allot', 'listing', 'closed']

interface IPOFormProps {
  initialData?: Partial<IPOFormData>
  isEditing?: boolean
}

export function IPOForm({ initialData, isEditing = false }: IPOFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<IPOFormData>({
    ...defaultFormData,
    ...initialData,
  })

  // Auto-generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .concat('-ipo')
  }

  // Auto-generate abbreviation from name
  const generateAbbr = (name: string) => {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 3)
      .toUpperCase()
  }

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
      abbr: generateAbbr(name),
    }))
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing
        ? `/api/admin/ipos/${initialData?.id}`
        : '/api/admin/ipos'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save IPO')
      }

      toast.success(isEditing ? 'IPO updated successfully' : 'IPO created successfully')
      router.push('/admin')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save IPO')
      console.error('Submit error:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Basic Information */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <Label htmlFor="name" className="text-slate-300">IPO Name *</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., Fractal Analytics"
            />
          </div>
          <div>
            <Label htmlFor="abbr" className="text-slate-300">Abbreviation</Label>
            <Input
              id="abbr"
              name="abbr"
              value={formData.abbr}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., FA"
            />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="slug" className="text-slate-300">URL Slug</Label>
            <Input
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="auto-generated-from-name"
            />
          </div>
          <div>
            <Label htmlFor="exchange" className="text-slate-300">Exchange *</Label>
            <Select
              value={formData.exchange}
              onValueChange={(value) => handleSelectChange('exchange', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select exchange" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {exchanges.map((ex) => (
                  <SelectItem key={ex} value={ex} className="text-white hover:bg-slate-600">
                    {ex}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sector" className="text-slate-300">Sector *</Label>
            <Input
              id="sector"
              name="sector"
              value={formData.sector}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., Technology / AI Analytics"
            />
          </div>
          <div>
            <Label htmlFor="status" className="text-slate-300">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {statuses.map((status) => (
                  <SelectItem key={status} value={status} className="text-white hover:bg-slate-600">
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Pricing & Issue Details */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Pricing & Issue Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="price_min" className="text-slate-300">Price Min (Rs) *</Label>
            <Input
              id="price_min"
              name="price_min"
              type="number"
              value={formData.price_min || ''}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="100"
            />
          </div>
          <div>
            <Label htmlFor="price_max" className="text-slate-300">Price Max (Rs) *</Label>
            <Input
              id="price_max"
              name="price_max"
              type="number"
              value={formData.price_max || ''}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="120"
            />
          </div>
          <div>
            <Label htmlFor="lot_size" className="text-slate-300">Lot Size *</Label>
            <Input
              id="lot_size"
              name="lot_size"
              type="number"
              value={formData.lot_size || ''}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="100"
            />
          </div>
          <div>
            <Label htmlFor="issue_size_cr" className="text-slate-300">Issue Size (Cr) *</Label>
            <Input
              id="issue_size_cr"
              name="issue_size_cr"
              type="number"
              step="0.01"
              value={formData.issue_size_cr || ''}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="100.5"
            />
          </div>
          <div>
            <Label htmlFor="issue_size" className="text-slate-300">Issue Size (Display)</Label>
            <Input
              id="issue_size"
              name="issue_size"
              value={formData.issue_size}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 100.5 Cr"
            />
          </div>
          <div>
            <Label htmlFor="fresh_issue" className="text-slate-300">Fresh Issue</Label>
            <Input
              id="fresh_issue"
              name="fresh_issue"
              value={formData.fresh_issue}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 80 Cr (75%)"
            />
          </div>
          <div>
            <Label htmlFor="ofs" className="text-slate-300">OFS</Label>
            <Input
              id="ofs"
              name="ofs"
              value={formData.ofs}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 20 Cr or Nil"
            />
          </div>
        </div>
      </div>

      {/* Important Dates */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Important Dates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="open_date" className="text-slate-300">Open Date *</Label>
            <Input
              id="open_date"
              name="open_date"
              type="date"
              value={formData.open_date}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="close_date" className="text-slate-300">Close Date *</Label>
            <Input
              id="close_date"
              name="close_date"
              type="date"
              value={formData.close_date}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="allotment_date" className="text-slate-300">Allotment Date *</Label>
            <Input
              id="allotment_date"
              name="allotment_date"
              type="date"
              value={formData.allotment_date}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
          <div>
            <Label htmlFor="list_date" className="text-slate-300">Listing Date *</Label>
            <Input
              id="list_date"
              name="list_date"
              type="date"
              value={formData.list_date}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* Company & Manager Details */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Company & Manager Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="registrar" className="text-slate-300">Registrar</Label>
            <Input
              id="registrar"
              name="registrar"
              value={formData.registrar}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., Link Intime India"
            />
          </div>
          <div>
            <Label htmlFor="lead_manager" className="text-slate-300">Lead Manager</Label>
            <Input
              id="lead_manager"
              name="lead_manager"
              value={formData.lead_manager}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., Kotak Mahindra Capital"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="about_company" className="text-slate-300">About Company</Label>
            <Textarea
              id="about_company"
              name="about_company"
              value={formData.about_company}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1 min-h-[100px]"
              placeholder="Brief description of the company..."
            />
          </div>
        </div>
      </div>

      {/* External Links & Symbols */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">External Links & Symbols</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="chittorgarh_url" className="text-slate-300">Chittorgarh URL</Label>
            <Input
              id="chittorgarh_url"
              name="chittorgarh_url"
              value={formData.chittorgarh_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://www.chittorgarh.com/ipo/..."
            />
          </div>
          <div>
            <Label htmlFor="nse_symbol" className="text-slate-300">NSE Symbol</Label>
            <Input
              id="nse_symbol"
              name="nse_symbol"
              value={formData.nse_symbol}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., FRACTAL"
            />
          </div>
          <div>
            <Label htmlFor="bse_scrip_code" className="text-slate-300">BSE Scrip Code</Label>
            <Input
              id="bse_scrip_code"
              name="bse_scrip_code"
              value={formData.bse_scrip_code}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 543555"
            />
          </div>
        </div>
      </div>

      {/* Colors */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Brand Colors</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="bg_color" className="text-slate-300">Background Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="bg_color"
                name="bg_color"
                type="color"
                value={formData.bg_color}
                onChange={handleChange}
                className="w-16 h-10 p-1 bg-slate-700 border-slate-600"
              />
              <Input
                name="bg_color"
                value={formData.bg_color}
                onChange={handleChange}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                placeholder="#f0f9ff"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="fg_color" className="text-slate-300">Foreground/Text Color</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="fg_color"
                name="fg_color"
                type="color"
                value={formData.fg_color}
                onChange={handleChange}
                className="w-16 h-10 p-1 bg-slate-700 border-slate-600"
              />
              <Input
                name="fg_color"
                value={formData.fg_color}
                onChange={handleChange}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                placeholder="#0369a1"
              />
            </div>
          </div>
          {/* Color Preview */}
          <div className="md:col-span-2">
            <Label className="text-slate-300">Preview</Label>
            <div
              className="mt-2 p-4 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: formData.bg_color }}
            >
              <span
                className="font-bold text-lg"
                style={{ color: formData.fg_color }}
              >
                {formData.abbr || 'AB'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center gap-4">
        <Button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8"
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEditing ? 'Update IPO' : 'Create IPO'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/admin')}
          className="border-slate-600 text-slate-300 hover:bg-slate-700"
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
