import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo'

/**
 * Карта сайта. Служебные маршруты (/api/*, /call) сюда не попадают —
 * они закрыты в robots.ts и не предназначены для посетителей.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()

  const pages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/quiz', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/collections', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/wardrobes', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/materials', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/facades', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/countertops', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/filling', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  ]

  return pages.map((page) => ({
    url: page.path === '/' ? siteUrl : `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
