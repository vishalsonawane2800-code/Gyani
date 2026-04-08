import { createClient } from '@/lib/supabase/server'
import { ReviewsClient } from './reviews-client'

export const metadata = {
  title: 'Manage Reviews | Admin',
  description: 'Add and manage expert reviews for IPOs',
}

async function getIPOs() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('ipos')
    .select('id, name, slug')
    .order('open_date', { ascending: false })
  return data || []
}

async function getReviews() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('expert_reviews')
    .select(`
      *,
      ipos (id, name, slug)
    `)
    .order('created_at', { ascending: false })
  return data || []
}

export default async function ReviewsPage() {
  const [ipos, reviews] = await Promise.all([getIPOs(), getReviews()])
  
  return <ReviewsClient ipos={ipos} initialReviews={reviews} />
}
