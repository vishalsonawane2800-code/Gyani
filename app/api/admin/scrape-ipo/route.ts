import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/admin/scrape-ipo
// Body: { ipo_id: string, type: 'gmp' | 'subscription' | 'both' }
// Triggers a scrape for a specific IPO by calling the cron endpoints
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ipo_id, type = 'both' } = body

    if (!ipo_id) {
      return NextResponse.json({ error: 'ipo_id is required' }, { status: 400 })
    }

    const supabase = await createClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    // Get the IPO
    const { data: ipo, error: fetchError } = await supabase
      .from('ipos')
      .select('id, company_name, slug, price_max, investorgain_gmp_url, investorgain_sub_url, chittorgarh_url')
      .eq('id', ipo_id)
      .maybeSingle()

    if (fetchError || !ipo) {
      return NextResponse.json({ error: 'IPO not found' }, { status: 404 })
    }

    const results: { type: string; success: boolean; value?: number | null; error?: string }[] = []

    // Scrape GMP
    if (type === 'gmp' || type === 'both') {
      let gmp: number | null = null
      let gmpSource = ''

      if (ipo.investorgain_gmp_url) {
        const r = await fetchGMP(ipo.investorgain_gmp_url, 'investorgain')
        gmp = r.gmp
        gmpSource = r.source
      }
      if (gmp === null && ipo.chittorgarh_url) {
        const r = await fetchGMP(ipo.chittorgarh_url, 'chittorgarh')
        gmp = r.gmp
        gmpSource = r.source
      }

      if (gmp !== null) {
        const priceMax = ipo.price_max || 0
        const gmpPercent = priceMax > 0 ? Math.round((gmp / priceMax) * 100 * 10) / 10 : 0
        const now = new Date().toISOString()
        const today = now.split('T')[0]

        await supabase.from('ipos').update({
          gmp,
          gmp_percent: gmpPercent,
          gmp_last_updated: now,
          last_scraped_at: now,
        }).eq('id', ipo.id)

        await supabase.from('gmp_history').upsert({
          ipo_id: ipo.id,
          date: today,
          gmp,
          gmp_percent: gmpPercent,
          source: gmpSource,
          recorded_at: now,
        }, { onConflict: 'ipo_id,date', ignoreDuplicates: false })

        results.push({ type: 'gmp', success: true, value: gmp })
      } else {
        results.push({ type: 'gmp', success: false, error: 'No GMP found. Check investorgain_gmp_url in IPO settings.' })
      }
    }

    // Scrape Subscription
    if (type === 'subscription' || type === 'both') {
      let subData: { total: number; retail: number; nii: number; qib: number } | null = null

      if (ipo.investorgain_sub_url) {
        subData = await fetchSubscription(ipo.investorgain_sub_url)
      }
      if (!subData && ipo.chittorgarh_url) {
        subData = await fetchSubscription(ipo.chittorgarh_url)
      }

      if (subData) {
        const now = new Date().toISOString()
        const today = now.split('T')[0]
        const d = new Date()
        const mins = d.getMinutes() < 30 ? '00' : '30'
        const slot = `${String(d.getHours()).padStart(2, '0')}:${mins}`

        await supabase.from('ipos').update({
          subscription_total: subData.total,
          subscription_retail: subData.retail,
          subscription_nii: subData.nii,
          subscription_qib: subData.qib,
          last_scraped_at: now,
        }).eq('id', ipo.id)

        await supabase.from('subscription_history').upsert({
          ipo_id: ipo.id,
          date: today,
          time: slot,
          retail: subData.retail,
          nii: subData.nii,
          qib: subData.qib,
          total: subData.total,
          recorded_at: now,
        }, { onConflict: 'ipo_id,date,time', ignoreDuplicates: false })

        results.push({ type: 'subscription', success: true, value: subData.total })
      } else {
        results.push({ type: 'subscription', success: false, error: 'No subscription data found. Check investorgain_sub_url in IPO settings.' })
      }
    }

    return NextResponse.json({ success: true, ipo: ipo.company_name, results })
  } catch (error) {
    console.error('Scrape IPO error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// Shared scrape helpers
interface GMPResult { gmp: number | null; source: string }

async function fetchGMP(url: string, source: string): Promise<GMPResult> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.google.com/',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return { gmp: null, source }

    const html = await res.text()
    const patterns = [
      /GMP[^<]{0,30}?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /Grey\s*Market\s*Premium[^<]{0,30}?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /Current\s*GMP[^<]{0,30}?[₹Rs.\s]*([+-]?\d+(?:\.\d+)?)/i,
      /"gmp"[:\s]*"?([+-]?\d+(?:\.\d+)?)/i,
      /data-gmp="([+-]?\d+(?:\.\d+)?)"/i,
    ]
    for (const p of patterns) {
      const m = html.match(p)
      if (m?.[1]) return { gmp: parseFloat(m[1]), source }
    }
    return { gmp: null, source }
  } catch {
    return { gmp: null, source }
  }
}

async function fetchSubscription(url: string): Promise<{ total: number; retail: number; nii: number; qib: number } | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Referer': 'https://www.google.com/',
      },
      next: { revalidate: 0 },
    })
    if (!res.ok) return null

    const html = await res.text()
    let total = 0, retail = 0, nii = 0, qib = 0

    const patterns: { key: keyof typeof results; re: RegExp[] } [] = [
      { key: 'total', re: [/Total[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i, /Overall[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i] },
      { key: 'retail', re: [/Retail[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i, /RII[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i] },
      { key: 'nii', re: [/NII[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i, /Non.{0,10}Institutional[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i] },
      { key: 'qib', re: [/QIB[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i, /Qualified[^<]{0,40}?([0-9.]+)\s*(?:x|times)/i] },
    ]
    const results = { total, retail, nii, qib }
    for (const { key, re } of patterns) {
      for (const r of re) {
        const m = html.match(r)
        if (m?.[1]) { results[key] = parseFloat(m[1]); break }
      }
    }

    if (results.total > 0 || results.retail > 0) return results
    return null
  } catch {
    return null
  }
}
