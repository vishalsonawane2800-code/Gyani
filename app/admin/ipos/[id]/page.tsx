import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { IPODetailClient } from './detail-client'

export const dynamic = 'force-dynamic'

interface IPODetailPageProps {
  params: Promise<{ id: string }>
}

export default async function IPODetailPage({ params }: IPODetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  if (!supabase) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 text-center">
          <p className="text-slate-400">Database connection unavailable.</p>
        </div>
      </div>
    )
  }

  // Fetch IPO details
  const { data: ipo, error: ipoError } = await supabase
    .from('ipos')
    .select('*')
    .eq('id', parseInt(id))
    .single()

  if (ipoError || !ipo) {
    notFound()
  }

  // Fetch GMP history for this IPO
  const { data: gmpHistory, error: gmpError } = await supabase
    .from('gmp_history')
    .select('*')
    .eq('ipo_id', parseInt(id))
    .order('date', { ascending: false })

  if (gmpError) {
    console.error('Error fetching GMP history:', gmpError)
  }

  return <IPODetailClient ipo={ipo} gmpHistory={gmpHistory || []} />
}
