// Thin client for the Railway-hosted scraper API.
// Uses NEXT_PUBLIC_API_BASE_URL which falls back to the live Railway URL.

const BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') ||
  'https://gyani-production.up.railway.app'

export type GmpRow = {
  company_name: string
  gmp: number | string | null
  sources?: Record<string, unknown> | null
  scraped_at: string
}

export type SubscriptionRow = {
  company_name: string
  qib: number | string | null
  nii: number | string | null
  retail: number | string | null
  total: number | string | null
  scraped_at: string
}

export type IpoCombined = {
  company_name: string
  gmp: number | null
  qib: number | null
  nii: number | null
  retail: number | null
  total: number | null
  gmp_strength: 'High' | 'Moderate' | 'Low' | 'Unknown'
  subscription_strength: 'Strong' | 'Average' | 'Weak' | 'Unknown'
  signal: string
  scraped_at: string | null
}

async function getJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    // Always fresh on server; caches are handled by the worker / Cloudflare
    cache: 'no-store',
    ...init,
  })
  if (!res.ok) throw new Error(`${path} ${res.status}`)
  return res.json() as Promise<T>
}

export const fetchGmp = () => getJSON<GmpRow[]>('/api/gmp')
export const fetchSubscription = () => getJSON<SubscriptionRow[]>('/api/subscription')

const toNum = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : null
}

const gmpStrength = (gmp: number | null): IpoCombined['gmp_strength'] => {
  if (gmp === null) return 'Unknown'
  if (gmp > 50) return 'High'
  if (gmp >= 20) return 'Moderate'
  return 'Low'
}

const subStrength = (qib: number | null): IpoCombined['subscription_strength'] => {
  if (qib === null) return 'Unknown'
  if (qib > 10) return 'Strong'
  if (qib >= 3) return 'Average'
  return 'Weak'
}

const overallSignal = (
  g: IpoCombined['gmp_strength'],
  s: IpoCombined['subscription_strength']
): string => {
  if (g === 'High' && s === 'Strong') return 'Strong Listing Potential'
  if (g === 'Low' || s === 'Weak') return 'Risky'
  if (g === 'Unknown' && s === 'Unknown') return 'No Data'
  return 'Average'
}

export async function fetchCombinedIpos(): Promise<IpoCombined[]> {
  const [gmp, subs] = await Promise.all([
    fetchGmp().catch(() => [] as GmpRow[]),
    fetchSubscription().catch(() => [] as SubscriptionRow[]),
  ])

  const gByName = new Map<string, GmpRow>()
  gmp.forEach(r => gByName.set(r.company_name, r))
  const sByName = new Map<string, SubscriptionRow>()
  subs.forEach(r => sByName.set(r.company_name, r))

  const names = new Set<string>([...gByName.keys(), ...sByName.keys()])

  return [...names].map(name => {
    const g = gByName.get(name)
    const s = sByName.get(name)
    const gmpVal = toNum(g?.gmp)
    const qibVal = toNum(s?.qib)
    const gS = gmpStrength(gmpVal)
    const sS = subStrength(qibVal)
    const latest =
      [g?.scraped_at, s?.scraped_at].filter(Boolean).sort().slice(-1)[0] || null
    return {
      company_name: name,
      gmp: gmpVal,
      qib: qibVal,
      nii: toNum(s?.nii),
      retail: toNum(s?.retail),
      total: toNum(s?.total),
      gmp_strength: gS,
      subscription_strength: sS,
      signal: overallSignal(gS, sS),
      scraped_at: latest,
    }
  })
}
