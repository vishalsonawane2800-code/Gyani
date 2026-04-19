import { createAdminClient } from '@/lib/supabase/admin'
import { NewsClient, type MarketNewsRecord } from './news-client'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Manage Market News | Admin',
  description: 'Curate the IPO Market News section shown on the homepage.',
}

async function getMarketNews(): Promise<MarketNewsRecord[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('market_news')
      .select('*')
      .order('display_order', { ascending: false })
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching market news:', error)
      return []
    }
    return (data ?? []) as MarketNewsRecord[]
  } catch (err) {
    console.error('Error in getMarketNews:', err)
    return []
  }
}

export default async function AdminNewsPage() {
  const news = await getMarketNews()
  return <NewsClient initialNews={news} />
}
