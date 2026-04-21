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
import { Loader2, Upload, X, Image as ImageIcon, Info, RefreshCw, Brain } from 'lucide-react'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'

/* =========================================================================
   IPO ADMIN FORM - User Guide
   =========================================================================
   
   This form is divided into sections:
   
   1. BASIC INFO (Required) - IPO name, exchange, sector, dates
      - Name: Full company name (e.g., "Fractal Analytics Limited")
      - Slug: Auto-generated URL slug (e.g., "fractal-analytics-ipo")
      - Exchange: BSE SME / NSE SME / Mainboard / REIT
      
   2. LOGO & BRANDING - Upload company logo or set brand colors
      - Logo: Upload PNG/JPG (max 2MB)
      - If no logo, initials will be displayed with brand colors
      
   3. PRICING & ISSUE DETAILS - Price band, lot size, issue size
      - Price Min/Max: Price band in Rs (e.g., 100-120)
      - Lot Size: Minimum shares to apply (e.g., 100)
      - Issue Size: Total issue size in Cr
      
   4. AI PREDICTION (Manual Entry) - Your AI prediction values
      - AI Prediction: Expected listing gain/loss % (e.g., +15 or -5)
      - AI Confidence: How confident you are (0-100%)
      - Sentiment Score: Market sentiment (-100 to +100)
      - Sentiment Label: Bullish / Neutral / Bearish
      
   5. GMP & SUBSCRIPTION - Auto-refreshed every 15 mins
      - These values are fetched automatically from external sources
      - You can manually override if needed
      
   Note: YouTuber reviews, analyst opinions, and news reviews 
   are managed in a separate Reviews page after IPO is created.
   ========================================================================= */

interface IPOFormData {
  id?: number
  name: string
  slug: string
  exchange: string
  sector: string
  price_min: number
  price_max: number
  lot_size: number
  issue_size: string
  fresh_issue: string
  ofs: string
  open_date: string
  close_date: string
  allotment_date: string
  listing_date: string
  status: string
  registrar: string
  lead_manager: string
  about_company: string
  chittorgarh_url: string
  investorgain_gmp_url: string
  investorgain_sub_url: string
  ipowatch_gmp_url: string
  ipocentral_gmp_url: string
  nse_symbol: string
  bse_scrip_code: string
  bg_color: string
  fg_color: string
  logo_url: string
  // AI Prediction fields (Manual Entry)
  ai_prediction: number
  ai_confidence: number
  sentiment_score: number
  sentiment_label: string
  // Allotment URL (admin override for "Check Allotment" button)
  allotment_url: string
  // Listing day data (captured post-listing to enable auto-migration to listed_ipos)
  listing_price: number | null
  list_day_close: number | null
  list_day_change_pct: number | null
  // Document URLs (migration 020) - surfaced as buttons on the public page
  drhp_url: string
  rhp_url: string
  anchor_investors_url: string
}

const defaultFormData: IPOFormData = {
  name: '',
  slug: '',
  exchange: 'BSE SME',
  sector: '',
  price_min: 0,
  price_max: 0,
  lot_size: 0,
  issue_size: '',
  fresh_issue: '',
  ofs: 'Nil',
  open_date: '',
  close_date: '',
  allotment_date: '',
  listing_date: '',
  status: 'upcoming',
  registrar: '',
  lead_manager: '',
  about_company: '',
  chittorgarh_url: '',
  investorgain_gmp_url: '',
  investorgain_sub_url: '',
  ipowatch_gmp_url: '',
  ipocentral_gmp_url: '',
  nse_symbol: '',
  bse_scrip_code: '',
  bg_color: '#f0f9ff',
  fg_color: '#0369a1',
  logo_url: '',
  ai_prediction: 0,
  ai_confidence: 50,
  sentiment_score: 50,
  sentiment_label: 'Neutral',
  allotment_url: '',
  listing_price: null,
  list_day_close: null,
  list_day_change_pct: null,
  drhp_url: '',
  rhp_url: '',
  anchor_investors_url: '',
}

const exchanges = ['Mainboard', 'BSE SME', 'NSE SME', 'REIT']
const statuses = ['upcoming', 'open', 'lastday', 'allot', 'listing', 'closed']
const sentimentLabels = ['Bullish', 'Neutral', 'Bearish']

interface IPOFormProps {
  initialData?: Partial<IPOFormData>
  isEditing?: boolean
}

export function IPOForm({ initialData, isEditing = false }: IPOFormProps) {
  const router = useRouter()
  const { authFetch } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [bulkData, setBulkData] = useState<string>('')
  const [bulkLoading, setBulkLoading] = useState(false)
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

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: generateSlug(name),
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB')
      return
    }

    setUploadingLogo(true)
    try {
      const formDataUpload = new FormData()
      formDataUpload.append('file', file)
      formDataUpload.append('slug', formData.slug || 'temp')

      const response = await authFetch('/api/admin/upload-logo', {
        method: 'POST',
        body: formDataUpload,
      })

      if (!response.ok) {
        throw new Error('Failed to upload logo')
      }

      const { url } = await response.json()
      setFormData((prev) => ({ ...prev, logo_url: url }))
      toast.success('Logo uploaded successfully')
    } catch (error) {
      console.error('Logo upload error:', error)
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeLogo = () => {
    setFormData((prev) => ({ ...prev, logo_url: '' }))
  }

  const handleBulkUpload = async () => {
    if (!bulkData.trim()) {
      toast.error('Please paste JSON data')
      return
    }

    setBulkLoading(true)
    try {
      // Parse JSON data
      const parsedData = JSON.parse(bulkData)
      const ipos = Array.isArray(parsedData) ? parsedData : [parsedData]

      if (ipos.length === 0) {
        toast.error('No IPO data found in JSON')
        return
      }

      // Validate and upload each IPO
      let successCount = 0
      const errors: string[] = []

      for (const ipo of ipos) {
        if (!ipo.name) {
          errors.push(`IPO missing required field: name`)
          continue
        }

        try {
          const url = '/api/admin/ipos'
          const response = await authFetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(ipo),
          })

          if (response.ok) {
            successCount++
          } else {
            const error = await response.json()
            errors.push(`${ipo.name}: ${error.error || 'Failed to save'}`)
          }
        } catch (error) {
          errors.push(`${ipo.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} IPO${successCount !== 1 ? 's' : ''}`)
        setBulkData('')
        router.refresh()
      }

      if (errors.length > 0) {
        toast.error(`${errors.length} IPO${errors.length !== 1 ? 's' : ''} failed:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? '\n...' : ''}`)
      }
    } catch (error) {
      toast.error(`Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setBulkLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = isEditing
        ? `/api/admin/ipos/${initialData?.id}`
        : '/api/admin/ipos'
      const method = isEditing ? 'PUT' : 'POST'

      const response = await authFetch(url, {
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
      {/* SECTION 1: BASIC INFO - REQUIRED FIELDS */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">1. Basic Information</h2>
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Required</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Enter the IPO company name, exchange type, and sector. The slug and abbreviation are auto-generated.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* IPO Name - Most Important Field */}
          <div className="lg:col-span-3">
            <Label htmlFor="name" className="text-slate-300">
              IPO Name *
              <span className="text-xs text-slate-500 ml-2">Full company name</span>
            </Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., Fractal Analytics Limited"
            />
          </div>
          
          <div className="lg:col-span-2">
            <Label htmlFor="slug" className="text-slate-300">
              URL Slug
              <span className="text-xs text-slate-500 ml-2">Auto-generated from name</span>
            </Label>
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
            <Label htmlFor="sector" className="text-slate-300">
              Sector *
              <span className="text-xs text-slate-500 ml-2">Industry type</span>
            </Label>
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

      {/* SECTION 2: LOGO & BRANDING */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">2. Logo & Branding</h2>
          <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-0.5 rounded">Optional</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Upload company logo (PNG/JPG, max 2MB). If no logo, initials will be displayed with the brand colors.
        </p>
        
        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div 
            className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden shrink-0"
            style={{ backgroundColor: formData.bg_color }}
          >
            {formData.logo_url ? (
              <Image
                src={formData.logo_url}
                alt="Company logo"
                width={96}
                height={96}
                className="w-full h-full object-contain"
              />
            ) : (
              <span
                className="font-bold text-2xl"
                style={{ color: formData.fg_color }}
              >
                {(formData.name || 'IP').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'IP'}
              </span>
            )}
          </div>
          
          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  disabled={uploadingLogo}
                />
                <div className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  <span>{uploadingLogo ? 'Uploading...' : 'Upload Logo'}</span>
                </div>
              </label>
              {formData.logo_url && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={removeLogo}
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            {formData.logo_url && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <ImageIcon className="h-4 w-4" />
                <span className="truncate max-w-xs">{formData.logo_url}</span>
              </div>
            )}
            
            {/* Brand Colors */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <Label htmlFor="bg_color" className="text-slate-300 text-sm">Background Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="bg_color"
                    name="bg_color"
                    type="color"
                    value={formData.bg_color}
                    onChange={handleChange}
                    className="w-12 h-9 p-1 bg-slate-700 border-slate-600"
                  />
                  <Input
                    name="bg_color"
                    value={formData.bg_color}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                    placeholder="#f0f9ff"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="fg_color" className="text-slate-300 text-sm">Text Color</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="fg_color"
                    name="fg_color"
                    type="color"
                    value={formData.fg_color}
                    onChange={handleChange}
                    className="w-12 h-9 p-1 bg-slate-700 border-slate-600"
                  />
                  <Input
                    name="fg_color"
                    value={formData.fg_color}
                    onChange={handleChange}
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 text-sm"
                    placeholder="#0369a1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: PRICING & ISSUE DETAILS */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">3. Pricing & Issue Details</h2>
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Required</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Enter the price band, lot size, and issue size. These are essential for calculating investment amounts.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="price_min" className="text-slate-300">
              Price Min (Rs) *
              <span className="text-xs text-slate-500 ml-1">Lower band</span>
            </Label>
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
            <Label htmlFor="price_max" className="text-slate-300">
              Price Max (Rs) *
              <span className="text-xs text-slate-500 ml-1">Upper band</span>
            </Label>
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
            <Label htmlFor="lot_size" className="text-slate-300">
              Lot Size *
              <span className="text-xs text-slate-500 ml-1">Min shares</span>
            </Label>
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
            <Label htmlFor="issue_size" className="text-slate-300">
              Issue Size *
              <span className="text-xs text-slate-500 ml-1">e.g., 100.5 Cr</span>
            </Label>
            <Input
              id="issue_size"
              name="issue_size"
              value={formData.issue_size}
              onChange={handleChange}
              required
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
            <Label htmlFor="ofs" className="text-slate-300">OFS (Offer for Sale)</Label>
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

      {/* SECTION 4: IMPORTANT DATES */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">4. Important Dates</h2>
          <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Required</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Enter IPO timeline dates. These dates are used to auto-update IPO status.
        </p>
        
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
            <Label htmlFor="listing_date" className="text-slate-300">Listing Date *</Label>
            <Input
              id="listing_date"
              name="listing_date"
              type="date"
              value={formData.listing_date}
              onChange={handleChange}
              required
              className="bg-slate-700 border-slate-600 text-white mt-1"
            />
          </div>
        </div>
      </div>

      {/* SECTION 5: AI PREDICTION - MANUAL ENTRY */}
      <div className="bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded-xl border border-indigo-500/30 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold text-white">5. AI Prediction</h2>
          <span className="text-xs text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded">Manual Entry</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Enter your AI prediction values manually. These will be displayed on the IPO detail page.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="ai_prediction" className="text-slate-300">
              AI Prediction (%)
              <span className="text-xs text-slate-500 ml-1">Listing gain/loss</span>
            </Label>
            <Input
              id="ai_prediction"
              name="ai_prediction"
              type="number"
              step="0.1"
              value={formData.ai_prediction || ''}
              onChange={handleChange}
              className="bg-slate-700/50 border-indigo-500/30 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., +15 or -5"
            />
            <p className="text-xs text-slate-500 mt-1">Positive = gain, Negative = loss</p>
          </div>
          <div>
            <Label htmlFor="ai_confidence" className="text-slate-300">
              AI Confidence (%)
              <span className="text-xs text-slate-500 ml-1">0-100</span>
            </Label>
            <Input
              id="ai_confidence"
              name="ai_confidence"
              type="number"
              min="0"
              max="100"
              value={formData.ai_confidence || ''}
              onChange={handleChange}
              className="bg-slate-700/50 border-indigo-500/30 text-white placeholder:text-slate-400 mt-1"
              placeholder="50"
            />
            <p className="text-xs text-slate-500 mt-1">How confident is the prediction</p>
          </div>
          <div>
            <Label htmlFor="sentiment_score" className="text-slate-300">
              Sentiment Score
              <span className="text-xs text-slate-500 ml-1">-100 to +100</span>
            </Label>
            <Input
              id="sentiment_score"
              name="sentiment_score"
              type="number"
              min="-100"
              max="100"
              value={formData.sentiment_score || ''}
              onChange={handleChange}
              className="bg-slate-700/50 border-indigo-500/30 text-white placeholder:text-slate-400 mt-1"
              placeholder="50"
            />
            <p className="text-xs text-slate-500 mt-1">Market sentiment indicator</p>
          </div>
          <div>
            <Label htmlFor="sentiment_label" className="text-slate-300">Sentiment Label</Label>
            <Select
              value={formData.sentiment_label}
              onValueChange={(value) => handleSelectChange('sentiment_label', value)}
            >
              <SelectTrigger className="bg-slate-700/50 border-indigo-500/30 text-white mt-1">
                <SelectValue placeholder="Select sentiment" />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {sentimentLabels.map((label) => (
                  <SelectItem key={label} value={label} className="text-white hover:bg-slate-600">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 mt-1">Overall market mood</p>
          </div>
        </div>
        
        {/* AI Prediction Preview */}
        <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <p className="text-sm text-slate-400 mb-2">Preview:</p>
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold ${formData.ai_prediction >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formData.ai_prediction >= 0 ? '+' : ''}{formData.ai_prediction || 0}%
            </div>
            <div className="text-sm text-slate-400">
              {formData.ai_confidence || 50}% confidence
            </div>
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              formData.sentiment_label === 'Bullish' ? 'bg-green-500/20 text-green-400' :
              formData.sentiment_label === 'Bearish' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {formData.sentiment_label || 'Neutral'}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: GMP & SUBSCRIPTION - AUTO-REFRESHED */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">6. GMP & Subscription</h2>
            <span className="text-xs text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">Auto-refreshed every 15 mins</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4" />
            <span>Values fetched from external sources automatically</span>
          </div>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          GMP and subscription data are auto-fetched. You can manually override if needed.
          Set the Chittorgarh URL below to enable auto-scraping.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-3">
            <Label htmlFor="chittorgarh_url" className="text-slate-300">
              Chittorgarh URL
              <span className="text-xs text-slate-500 ml-2">For basic IPO info (fallback)</span>
            </Label>
            <Input
              id="chittorgarh_url"
              name="chittorgarh_url"
              value={formData.chittorgarh_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://www.chittorgarh.com/ipo/company-name-ipo/123/"
            />
            <p className="text-xs text-slate-500 mt-1">
              e.g., https://www.chittorgarh.com/ipo/propshare-celestia-ipo/2965/
            </p>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="investorgain_gmp_url" className="text-slate-300">
              InvestorGain GMP URL
              <span className="text-xs text-emerald-400 ml-2">Optional direct GMP source (used when URL is set)</span>
            </Label>
            <Input
              id="investorgain_gmp_url"
              name="investorgain_gmp_url"
              value={formData.investorgain_gmp_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://www.investorgain.com/gmp/ipo-name-gmp/1234/"
            />
            <p className="text-xs text-slate-500 mt-1">
              Add a direct InvestorGain GMP URL to include this source in scraping + averaging.
            </p>
          </div>
          <div className="md:col-span-3">
            <Label htmlFor="investorgain_sub_url" className="text-slate-300">
              InvestorGain Subscription URL
              <span className="text-xs text-cyan-400 ml-2">Primary source for live subscription</span>
            </Label>
            <Input
              id="investorgain_sub_url"
              name="investorgain_sub_url"
              value={formData.investorgain_sub_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://www.investorgain.com/subscription/ipo-name/1234/"
            />
            <p className="text-xs text-slate-500 mt-1">
              e.g., https://www.investorgain.com/subscription/om-power-transmission-ipo/1941/
            </p>
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="ipowatch_gmp_url" className="text-slate-300">
              IPOWatch GMP URL
              <span className="text-xs text-emerald-400 ml-2">Primary configurable GMP source (used in averaging)</span>
            </Label>
            <Input
              id="ipowatch_gmp_url"
              name="ipowatch_gmp_url"
              value={formData.ipowatch_gmp_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://ipowatch.in/ipo-name-gmp-today/"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional direct article URL. Scraper always checks IPOWatch constant listing URL; when this is set it also checks this page.
            </p>
          </div>

          <div className="md:col-span-3">
            <Label htmlFor="ipocentral_gmp_url" className="text-slate-300">
              IPOCentral GMP URL
              <span className="text-xs text-emerald-400 ml-2">Optional direct GMP source (used when URL is set)</span>
            </Label>
            <Input
              id="ipocentral_gmp_url"
              name="ipocentral_gmp_url"
              value={formData.ipocentral_gmp_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://ipocentral.in/ipo-name-gmp/"
            />
            <p className="text-xs text-slate-500 mt-1">
              Add a direct IPOCentral GMP URL to include this source in scraping + averaging.
            </p>
          </div>
        </div>

        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
          <p className="text-sm text-cyan-300 font-medium mb-2">How Auto-Refresh Works:</p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>GMP data is fetched every 15 minutes and averaged only across sources that return numeric values</li>
            <li>Automation logs show per-source URL + outcome (value/no_data/no_url/error) for easier debugging</li>
            <li>Subscription data is scraped from Chittorgarh during IPO open period</li>
            <li>Status is auto-updated based on IPO dates</li>
            <li>You can manually edit values anytime to override auto-fetched data</li>
          </ul>
        </div>
      </div>

      {/* SECTION 7: COMPANY & MANAGER DETAILS */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">7. Company & Manager Details</h2>
          <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-0.5 rounded">Optional</span>
        </div>
        
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
            <Label htmlFor="allotment_url" className="text-slate-300">
              Allotment URL
              <span className="text-xs text-slate-500 ml-2">Overrides default registrar link</span>
            </Label>
            <Input
              id="allotment_url"
              name="allotment_url"
              value={formData.allotment_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://kosmic.kfintech.com/ipostatus/?ipoid=..."
            />
            <p className="text-xs text-slate-500 mt-1">
              Direct link to the registrar&apos;s allotment-status page for this IPO. If blank,
              the public page falls back to the default link for the chosen registrar.
            </p>
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
              placeholder="Brief description of the company and its business..."
            />
          </div>
        </div>
      </div>

      {/* SECTION 7b: DOCUMENTS & DISCLOSURES */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">7b. Documents &amp; Disclosures</h2>
          <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-0.5 rounded">Optional</span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Paste public PDF URLs. These render as DRHP, RHP and Anchor Investors
          buttons at the bottom of the public IPO page. Leave blank to hide the
          button.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="drhp_url" className="text-slate-300">
              DRHP URL
              <span className="text-xs text-slate-500 ml-2">Draft Red Herring Prospectus (PDF)</span>
            </Label>
            <Input
              id="drhp_url"
              name="drhp_url"
              type="url"
              value={formData.drhp_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://.../drhp.pdf"
            />
          </div>
          <div>
            <Label htmlFor="rhp_url" className="text-slate-300">
              RHP URL
              <span className="text-xs text-slate-500 ml-2">Red Herring Prospectus (PDF)</span>
            </Label>
            <Input
              id="rhp_url"
              name="rhp_url"
              type="url"
              value={formData.rhp_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://.../rhp.pdf"
            />
          </div>
          <div>
            <Label htmlFor="anchor_investors_url" className="text-slate-300">
              Anchor Investors URL
              <span className="text-xs text-slate-500 ml-2">Exchange announcement / PDF</span>
            </Label>
            <Input
              id="anchor_investors_url"
              name="anchor_investors_url"
              type="url"
              value={formData.anchor_investors_url}
              onChange={handleChange}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="https://.../anchor-investors.pdf"
            />
          </div>
        </div>
      </div>

      {/* SECTION 8: EXCHANGE SYMBOLS */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">8. Exchange Symbols</h2>
          <span className="text-xs text-slate-400 bg-slate-600/50 px-2 py-0.5 rounded">Optional - For listed IPOs</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

      {/* SECTION 9: LISTING DAY DATA */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold text-white">9. Listing Day Data</h2>
          <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
            Fill on / after listing day
          </span>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Enter the listing-day open price, close price, and change %. Once both listing price
          and list-day close are set, the IPO is eligible for automatic migration to the Listed
          IPOs directory on the day after the listing date.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="listing_price" className="text-slate-300">
              Listing Price (Rs)
              <span className="text-xs text-slate-500 ml-1">Open on listing day</span>
            </Label>
            <Input
              id="listing_price"
              name="listing_price"
              type="number"
              step="0.01"
              value={formData.listing_price ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                const listingPrice = raw === '' ? null : parseFloat(raw)
                setFormData((prev) => {
                  const close = prev.list_day_close
                  const computed =
                    listingPrice && listingPrice > 0 && close != null
                      ? Math.round(((close - listingPrice) / listingPrice) * 10000) / 100
                      : prev.list_day_change_pct
                  return {
                    ...prev,
                    listing_price: listingPrice,
                    list_day_change_pct: computed,
                  }
                })
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 125.50"
            />
          </div>
          <div>
            <Label htmlFor="list_day_close" className="text-slate-300">
              List Day Close (Rs)
              <span className="text-xs text-slate-500 ml-1">Close on listing day</span>
            </Label>
            <Input
              id="list_day_close"
              name="list_day_close"
              type="number"
              step="0.01"
              value={formData.list_day_close ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                const close = raw === '' ? null : parseFloat(raw)
                setFormData((prev) => {
                  const listingPrice = prev.listing_price
                  const computed =
                    listingPrice && listingPrice > 0 && close != null
                      ? Math.round(((close - listingPrice) / listingPrice) * 10000) / 100
                      : prev.list_day_change_pct
                  return {
                    ...prev,
                    list_day_close: close,
                    list_day_change_pct: computed,
                  }
                })
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 138.75"
            />
          </div>
          <div>
            <Label htmlFor="list_day_change_pct" className="text-slate-300">
              List Day Change (%)
              <span className="text-xs text-slate-500 ml-1">Auto-computed, editable</span>
            </Label>
            <Input
              id="list_day_change_pct"
              name="list_day_change_pct"
              type="number"
              step="0.01"
              value={formData.list_day_change_pct ?? ''}
              onChange={(e) => {
                const raw = e.target.value
                const pct = raw === '' ? null : parseFloat(raw)
                setFormData((prev) => ({ ...prev, list_day_change_pct: pct }))
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 mt-1"
              placeholder="e.g., 10.56"
            />
            <p className="text-xs text-slate-500 mt-1">
              Auto-computed from listing price and close. Override manually if needed.
            </p>
          </div>
        </div>
      </div>

      {/* Bulk Upload Section */}
      {!isEditing && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-semibold text-white">Bulk Upload IPOs</h2>
            <span className="text-xs text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Optional</span>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Upload multiple IPOs at once using JSON format. Paste an array of IPO objects or a single IPO object.
          </p>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="bulk-data" className="text-slate-300">
                JSON Data
              </Label>
              <Textarea
                id="bulk-data"
                value={bulkData}
                onChange={(e) => setBulkData(e.target.value)}
                placeholder={`[
  {
    "name": "Company Name",
    "exchange": "NSE",
    "sector": "Technology",
    "price_min": 100,
    "price_max": 150,
    "lot_size": 10,
    "open_date": "2026-04-20",
    "close_date": "2026-04-24"
  }
]`}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-400 font-mono text-xs h-40 mt-1"
              />
            </div>
            
            <Button
              type="button"
              onClick={handleBulkUpload}
              disabled={bulkLoading || !bulkData.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {bulkLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload IPOs
            </Button>
          </div>
        </div>
      )}

      {/* Reviews Note */}
      {isEditing && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-300 font-medium">Managing Reviews</p>
              <p className="text-sm text-amber-300/70 mt-1">
                YouTuber reviews, analyst opinions, and news reviews are managed separately.
                After saving this IPO, go to <strong>Admin &gt; Reviews</strong> to add expert reviews.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Submit Buttons */}
      <div className="flex items-center gap-4 sticky bottom-4 bg-slate-900/90 backdrop-blur-sm p-4 rounded-xl border border-slate-700">
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
        {isEditing && (
          <span className="text-xs text-slate-500 ml-auto">
            After saving, manage reviews at Admin &gt; Reviews
          </span>
        )}
      </div>
    </form>
  )
}
