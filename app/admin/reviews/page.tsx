import { createClient } from '@/lib/supabase/server'
import { ReviewsClient } from './reviews-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manage Reviews | Admin',
  description: 'Add and manage expert reviews for IPOs',
}

async function getIPOs() {
  try {
    const supabase = await createClient()
    if (!supabase) return []
    const { data, error } = await supabase
      .from('ipos')
      .select('id, company_name, slug')
      .order('open_date', { ascending: false })
    
    if (error) {
      console.error('Error fetching IPOs:', error)
      return []
    }
    // Transform company_name to name for component compatibility
    return (data || []).map(ipo => ({
      id: ipo.id,
      name: ipo.company_name,
      slug: ipo.slug
    }))
  } catch (error) {
    console.error('Error in getIPOs:', error)
    return []
  }
}

async function getReviews() {
  try {
    const supabase = await createClient()
    if (!supabase) return []
    const { data, error } = await supabase
      .from('expert_reviews')
      .select(`
        *,
        ipos (id, company_name, slug)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching reviews:', error)
      return []
    }
    // Transform company_name to name in the nested ipos object
    return (data || []).map(review => ({
      ...review,
      ipos: review.ipos ? {
        id: (review.ipos as { id: number; company_name: string; slug: string }).id,
        name: (review.ipos as { id: number; company_name: string; slug: string }).company_name,
        slug: (review.ipos as { id: number; company_name: string; slug: string }).slug
      } : null
    }))
  } catch (error) {
    console.error('Error in getReviews:', error)
    return []
  }
}

export default async function ReviewsPage() {
  const [ipos, reviews] = await Promise.all([getIPOs(), getReviews()])
  
  // If no IPOs found, show a helpful message
  if (ipos.length === 0) {
    return (
      <div className="p-6 lg:p-8">
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-amber-300 mb-2">No IPOs Found</h2>
          <p className="text-amber-300/70 mb-4">
            Unable to load IPOs for reviews. This might be due to a database schema cache issue.
          </p>
          <ol className="text-sm text-amber-300/70 text-left max-w-md mx-auto mb-4">
            <li className="mb-2"><strong>1.</strong> Go to Supabase Dashboard &gt; Project Settings &gt; API</li>
            <li className="mb-2"><strong>2.</strong> Click the "Reload schema" button</li>
            <li><strong>3.</strong> Refresh this page</li>
          </ol>
          <p className="text-xs text-amber-300/50 mt-4">
            Alternatively, run <code className="bg-amber-900/30 px-2 py-1 rounded">NOTIFY pgrst, 'reload schema';</code> in Supabase SQL Editor
          </p>
        </div>
      </div>
    )
  }
  
  return <ReviewsClient ipos={ipos} initialReviews={reviews} />
}
