import { createClient } from '@/lib/supabase/server'
import { IPOForm } from '@/components/admin/ipo-form'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface EditIPOPageProps {
  params: Promise<{ id: string }>
}

export default async function EditIPOPage({ params }: EditIPOPageProps) {
  const { id } = await params
  const supabase = await createClient()

  if (!supabase) {
    notFound()
  }

  const { data: ipo, error } = await supabase
    .from('ipos')
    .select('*')
    .eq('id', parseInt(id))
    .single()

  if (error || !ipo) {
    notFound()
  }

  // Transform database fields to form fields
  const formData = {
    id: ipo.id,
    name: ipo.name || '',
    slug: ipo.slug || '',
    abbr: ipo.abbr || '',
    exchange: ipo.exchange || 'BSE SME',
    sector: ipo.sector || '',
    price_min: ipo.price_min || 0,
    price_max: ipo.price_max || 0,
    lot_size: ipo.lot_size || 0,
    issue_size: ipo.issue_size || '',
    issue_size_cr: ipo.issue_size_cr || 0,
    fresh_issue: ipo.fresh_issue || '',
    ofs: ipo.ofs || 'Nil',
    open_date: ipo.open_date || '',
    close_date: ipo.close_date || '',
    allotment_date: ipo.allotment_date || '',
    listing_date: ipo.listing_date || '',
    status: ipo.status || 'upcoming',
    registrar: ipo.registrar || '',
    lead_manager: ipo.lead_manager || '',
    about_company: ipo.about_company || '',
    chittorgarh_url: ipo.chittorgarh_url || '',
    investorgain_gmp_url: ipo.investorgain_gmp_url || '',
    investorgain_sub_url: ipo.investorgain_sub_url || '',
    nse_symbol: ipo.nse_symbol || '',
    bse_scrip_code: ipo.bse_scrip_code || '',
    bg_color: ipo.bg_color || '#f0f9ff',
    fg_color: ipo.fg_color || '#0369a1',
    logo_url: ipo.logo_url || '',
    ai_prediction: ipo.ai_prediction || 0,
    ai_confidence: ipo.ai_confidence || 50,
    sentiment_score: ipo.sentiment_score || 50,
    sentiment_label: ipo.sentiment_label || 'Neutral',
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading text-2xl lg:text-3xl font-bold text-white">
          Edit IPO
        </h1>
        <p className="text-slate-400 mt-1">
          Update details for {ipo.name}
        </p>
      </div>

      <IPOForm initialData={formData} isEditing />
    </div>
  )
}
