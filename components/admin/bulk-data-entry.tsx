'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { 
  Loader2, 
  Upload, 
  FileText, 
  Users, 
  TrendingUp, 
  ChevronDown, 
  ChevronUp,
  Copy,
  Check,
  AlertCircle,
  Info,
  HelpCircle,
  BookOpen
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  FINANCIALS_TEMPLATE,
  PEER_COMPARISON_TEMPLATE,
  GMP_HISTORY_TEMPLATE,
  KPI_TEMPLATE,
  ISSUE_DETAILS_TEMPLATE,
  SUBSCRIPTION_HISTORY_TEMPLATE,
  FAQS_TEMPLATE,
  COMPANY_PROFILE_TEMPLATE,
  AI_PROMPTS,
  parseFinancials,
  parsePeerComparison,
  parseGMPHistory,
  parseKPI,
  parseIssueDetails,
  parseSubscriptionHistory,
  parseFAQs,
  parseCompanyProfile,
} from '@/lib/bulk-data-parsers'
import { useAuth } from '@/lib/auth-context'

interface BulkDataEntryProps {
  ipoId: string
  onSuccess?: () => void
}

type DataType =
  | 'financials'
  | 'peers'
  | 'gmp'
  | 'kpi'
  | 'issueDetails'
  | 'subscriptions'
  | 'faqs'
  | 'companyProfile'

interface SectionConfig {
  type: DataType
  title: string
  icon: React.ReactNode
  description: string
  template: string
  aiPrompt: string
  endpoint: string
  parsePreview: (text: string) => { success: boolean; count: number; preview: string }
}

export function BulkDataEntry({ ipoId, onSuccess }: BulkDataEntryProps) {
  const { authFetch } = useAuth()
  const [openSections, setOpenSections] = useState<Record<DataType, boolean>>({
    financials: false,
    peers: false,
    gmp: false,
    kpi: false,
    issueDetails: false,
    subscriptions: false,
    faqs: false,
    companyProfile: false,
  })
  
  const [texts, setTexts] = useState<Record<DataType, string>>({
    financials: '',
    peers: '',
    gmp: '',
    kpi: '',
    issueDetails: '',
    subscriptions: '',
    faqs: '',
    companyProfile: '',
  })
  
  const [loading, setLoading] = useState<Record<DataType, boolean>>({
    financials: false,
    peers: false,
    gmp: false,
    kpi: false,
    issueDetails: false,
    subscriptions: false,
    faqs: false,
    companyProfile: false,
  })
  
  const [clearExisting, setClearExisting] = useState<Record<DataType, boolean>>({
    financials: true,
    peers: true,
    gmp: false,
    kpi: true,
    issueDetails: true,
    subscriptions: false,
    faqs: true,
    companyProfile: true,
  })

  const [copiedTemplate, setCopiedTemplate] = useState<DataType | null>(null)
  const [copiedPrompt, setCopiedPrompt] = useState<DataType | null>(null)

  const sections: SectionConfig[] = [
    {
      type: 'financials',
      title: 'Financial Data',
      icon: <FileText className="h-4 w-4" />,
      description: 'Bulk import financial data for FY23, FY24, FY25 etc. with revenue, PAT, EBITDA, and ratios.',
      template: FINANCIALS_TEMPLATE,
      aiPrompt: AI_PROMPTS.financials,
      endpoint: `/api/admin/ipos/${ipoId}/financials`,
      parsePreview: (text) => {
        const result = parseFinancials(text)
        return {
          success: result.success,
          count: result.data.length,
          preview: result.success 
            ? `${result.data.length} fiscal years: ${result.data.map(d => d.fiscal_year).join(', ')}`
            : result.errors.join(', '),
        }
      },
    },
    {
      type: 'peers',
      title: 'Peer Comparison',
      icon: <Users className="h-4 w-4" />,
      description: 'Bulk import peer companies for comparison table with market cap, P/E, ROE, etc.',
      template: PEER_COMPARISON_TEMPLATE,
      aiPrompt: AI_PROMPTS.peerComparison,
      endpoint: `/api/admin/ipos/${ipoId}/peers`,
      parsePreview: (text) => {
        const result = parsePeerComparison(text)
        return {
          success: result.success,
          count: result.data.length,
          preview: result.success 
            ? `${result.data.length} companies: ${result.data.map(d => d.company_name).join(', ')}`
            : result.errors.join(', '),
        }
      },
    },
    {
      type: 'gmp',
      title: 'GMP History',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Bulk import historical GMP data with morning/evening slots for charts.',
      template: GMP_HISTORY_TEMPLATE,
      aiPrompt: AI_PROMPTS.gmpHistory,
      endpoint: `/api/admin/ipos/${ipoId}/gmp-history`,
      parsePreview: (text) => {
        const result = parseGMPHistory(text)
        return {
          success: result.success,
          count: result.data.length,
          preview: result.success 
            ? `${result.data.length} entries from ${result.data[result.data.length - 1]?.date || 'N/A'} to ${result.data[0]?.date || 'N/A'}`
            : result.errors.join(', '),
        }
      },
    },
    {
      type: 'kpi',
      title: 'KPI Data',
      icon: <FileText className="h-4 w-4" />,
      description: 'Bulk import KPI data including ROE, ROCE, EPS, P/E, Promoter Holding, etc.',
      template: KPI_TEMPLATE,
      aiPrompt: AI_PROMPTS.kpi,
      endpoint: `/api/admin/ipos/${ipoId}/kpi`,
      parsePreview: (text) => {
        const result = parseKPI(text)
        return {
          success: result.success,
          count: result.data.length,
          preview: result.success 
            ? `${result.data.length} KPI metrics parsed`
            : result.errors.join(', '),
        }
      },
    },
    {
      type: 'issueDetails',
      title: 'Issue Details',
      icon: <FileText className="h-4 w-4" />,
      description: 'Import issue details: total size, fresh issue, OFS, quotas, and IPO objectives.',
      template: ISSUE_DETAILS_TEMPLATE,
      aiPrompt: AI_PROMPTS.issueDetails,
      endpoint: `/api/admin/ipos/${ipoId}/issue-details`,
      parsePreview: (text) => {
        const result = parseIssueDetails(text)
        if (!result.success || result.data.length === 0) {
          return {
            success: false,
            count: 0,
            preview: result.errors.join(', '),
          }
        }
        const d = result.data[0]
        return {
          success: true,
          count: 1,
          preview: `Issue Size: ${d.total_issue_size_cr} Cr, Fresh: ${d.fresh_issue_cr} Cr, OFS: ${d.ofs_cr || 0} Cr, ${d.ipo_objectives.length} objectives`,
        }
      },
    },
    {
      type: 'subscriptions',
      title: 'Subscription History',
      icon: <TrendingUp className="h-4 w-4" />,
      description: 'Import historical subscription data by day. Latest data is auto-fetched via cron workers.',
      template: SUBSCRIPTION_HISTORY_TEMPLATE,
      aiPrompt: AI_PROMPTS.subscriptionHistory,
      endpoint: `/api/admin/ipos/${ipoId}/subscription-history`,
      parsePreview: (text) => {
        const result = parseSubscriptionHistory(text)
        if (!result.success || result.data.length === 0) {
          return {
            success: false,
            count: 0,
            preview: result.errors.join(', '),
          }
        }
        const firstEntry = result.data[0]
        const lastEntry = result.data[result.data.length - 1]
        return {
          success: true,
          count: result.data.length,
          preview: `${result.data.length} entries from Day ${firstEntry.day_number} to Day ${lastEntry.day_number}. Latest: ${lastEntry.total}x total`,
        }
      },
    },
    {
      type: 'faqs',
      title: 'FAQs (SEO)',
      icon: <HelpCircle className="h-4 w-4" />,
      description:
        'Bulk import 10-15 FAQs (chittorgarh / ipoji style). Renders as a public accordion + FAQPage JSON-LD schema for Google rich results.',
      template: FAQS_TEMPLATE,
      aiPrompt: AI_PROMPTS.faqs,
      endpoint: `/api/admin/ipos/${ipoId}/faqs`,
      parsePreview: (text) => {
        const result = parseFAQs(text)
        if (!result.success || result.data.length === 0) {
          return {
            success: false,
            count: 0,
            preview: result.errors.join(', '),
          }
        }
        return {
          success: true,
          count: result.data.length,
          preview: `${result.data.length} FAQs parsed. First: "${result.data[0].question.slice(0, 60)}..."`,
        }
      },
    },
    {
      type: 'companyProfile',
      title: 'Company & IPO Details',
      icon: <BookOpen className="h-4 w-4" />,
      description:
        'Long-form company description + IPO commentary. Shown as two "Read more" cards on the public IPO page (keeps the page clean while feeding SEO).',
      template: COMPANY_PROFILE_TEMPLATE,
      aiPrompt: AI_PROMPTS.companyProfile,
      endpoint: `/api/admin/ipos/${ipoId}/company-profile`,
      parsePreview: (text) => {
        const result = parseCompanyProfile(text)
        if (!result.success || result.data.length === 0) {
          return {
            success: false,
            count: 0,
            preview: result.errors.join(', '),
          }
        }
        const p = result.data[0]
        const filled = [
          p.about_company && 'About',
          p.company_details && 'Company Details',
          p.ipo_details_long && 'IPO Details',
        ].filter(Boolean) as string[]
        return {
          success: true,
          count: filled.length,
          preview: `Will update: ${filled.join(', ')}`,
        }
      },
    },
  ]

  const toggleSection = (type: DataType) => {
    setOpenSections(prev => ({ ...prev, [type]: !prev[type] }))
  }

  const copyToClipboard = async (text: string, type: DataType, isPrompt: boolean) => {
    try {
      await navigator.clipboard.writeText(text)
      if (isPrompt) {
        setCopiedPrompt(type)
        setTimeout(() => setCopiedPrompt(null), 2000)
      } else {
        setCopiedTemplate(type)
        setTimeout(() => setCopiedTemplate(null), 2000)
      }
      toast.success('Copied to clipboard!')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleImport = async (section: SectionConfig) => {
    const text = texts[section.type]
    if (!text.trim()) {
      toast.error('Please paste your data first')
      return
    }

    setLoading(prev => ({ ...prev, [section.type]: true }))

    try {
      const response = await authFetch(section.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          clearExisting: clearExisting[section.type],
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.details?.join(', ') || 'Import failed')
      }

      toast.success(result.message || 'Data imported successfully!')
      setTexts(prev => ({ ...prev, [section.type]: '' }))
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setLoading(prev => ({ ...prev, [section.type]: false }))
    }
  }

  const getPreview = (section: SectionConfig) => {
    const text = texts[section.type]
    if (!text.trim()) return null
    return section.parsePreview(text)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="h-5 w-5 text-emerald-400" />
        <h2 className="text-lg font-semibold text-white">Bulk Data Entry</h2>
        <span className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">Copy-Paste Format</span>
      </div>
      
      <p className="text-sm text-slate-400 mb-4">
        Use AI tools to format your data, then paste it here. Each section has a template and AI prompt you can copy.
      </p>

      {sections.map((section) => {
        const preview = getPreview(section)
        
        return (
          <Collapsible
            key={section.type}
            open={openSections[section.type]}
            onOpenChange={() => toggleSection(section.type)}
          >
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      {section.icon}
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium text-white">{section.title}</h3>
                      <p className="text-xs text-slate-400">{section.description}</p>
                    </div>
                  </div>
                  {openSections[section.type] ? (
                    <ChevronUp className="h-5 w-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <div className="p-4 pt-0 border-t border-slate-700 space-y-4">
                  {/* Template and AI Prompt */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Template */}
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-slate-300 text-sm">Format Template</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(section.template, section.type, false)}
                          className="h-7 text-xs text-slate-400 hover:text-white"
                        >
                          {copiedTemplate === section.type ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                      <pre className="text-xs text-slate-500 overflow-x-auto max-h-32 whitespace-pre-wrap font-mono">
                        {section.template.slice(0, 300)}...
                      </pre>
                    </div>
                    
                    {/* AI Prompt */}
                    <div className="bg-indigo-900/20 rounded-lg p-3 border border-indigo-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-indigo-300 text-sm">AI Prompt (ChatGPT/Claude)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(section.aiPrompt, section.type, true)}
                          className="h-7 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          {copiedPrompt === section.type ? (
                            <Check className="h-3 w-3 mr-1" />
                          ) : (
                            <Copy className="h-3 w-3 mr-1" />
                          )}
                          Copy
                        </Button>
                      </div>
                      <p className="text-xs text-indigo-300/70">
                        Copy this prompt, paste your raw data in ChatGPT/Claude, then paste the formatted result below.
                      </p>
                    </div>
                  </div>

                  {/* Data Input */}
                  <div>
                    <Label className="text-slate-300 mb-2 block">
                      Paste Formatted Data
                    </Label>
                    <Textarea
                      value={texts[section.type]}
                      onChange={(e) => setTexts(prev => ({ ...prev, [section.type]: e.target.value }))}
                      placeholder={`Paste your ${section.title.toLowerCase()} data here...`}
                      className="bg-slate-900 border-slate-600 text-white placeholder:text-slate-500 font-mono text-sm min-h-[150px]"
                    />
                  </div>

                  {/* Preview */}
                  {preview && (
                    <div className={`flex items-start gap-2 p-3 rounded-lg ${
                      preview.success 
                        ? 'bg-emerald-500/10 border border-emerald-500/20' 
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}>
                      {preview.success ? (
                        <Info className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className={`text-sm font-medium ${preview.success ? 'text-emerald-300' : 'text-red-300'}`}>
                          {preview.success ? `Parsed ${preview.count} records` : 'Parse Error'}
                        </p>
                        <p className={`text-xs mt-0.5 ${preview.success ? 'text-emerald-300/70' : 'text-red-300/70'}`}>
                          {preview.preview}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Options and Submit */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`clear-${section.type}`}
                        checked={clearExisting[section.type]}
                        onCheckedChange={(checked) => 
                          setClearExisting(prev => ({ ...prev, [section.type]: checked === true }))
                        }
                        className="border-slate-600"
                      />
                      <Label 
                        htmlFor={`clear-${section.type}`}
                        className="text-sm text-slate-400 cursor-pointer"
                      >
                        {section.type === 'gmp' ? 'Replace matching entries' : 'Replace existing data'}
                      </Label>
                    </div>
                    
                    <Button
                      type="button"
                      onClick={() => handleImport(section)}
                      disabled={loading[section.type] || !texts[section.type].trim()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {loading[section.type] && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Import {section.title}
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}
    </div>
  )
}
