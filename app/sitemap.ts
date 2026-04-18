import { MetadataRoute } from 'next'
import { currentIPOs, listedIPOs } from '@/lib/data'
import {
  getAllListedIpoParams,
  getAvailableYears,
} from '@/lib/listed-ipos/loader'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ipogyani.com'
  
  // Static pages
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/gmp`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/ipo-gmp`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/upcoming`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/sme`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/listed`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/listing-gain`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/allotment-status`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/subscription-status`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/best-ipo`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/shareholder-quota`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/accuracy`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/methodology`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/disclaimer`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.3,
    },
  ]

  // Dynamic IPO pages - current IPOs
  const currentIPOPages = currentIPOs.map((ipo) => ({
    url: `${baseUrl}/ipo/${ipo.slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Dynamic IPO pages - listed IPOs
  const listedIPOPages = listedIPOs.map((ipo) => ({
    url: `${baseUrl}/ipo/${ipo.slug}`,
    lastModified: new Date(ipo.listDate),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  // Listed-IPO year archive pages (CSV-driven, statically generated)
  const listedYearPages = getAvailableYears().map((y) => ({
    url: `${baseUrl}/listed/${y}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.85,
  }))

  // Listed-IPO per-company detail pages
  const listedArchiveIPOPages = getAllListedIpoParams().map(({ year, slug }) => ({
    url: `${baseUrl}/listed/${year}/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [
    ...staticPages,
    ...currentIPOPages,
    ...listedIPOPages,
    ...listedYearPages,
    ...listedArchiveIPOPages,
  ]
}
