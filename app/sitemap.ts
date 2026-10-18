import type { MetadataRoute } from 'next'
import { getCatalogSection } from '@/lib/catalog-source'
import { siteUrl } from '@/lib/seo'

/**
 * Карта сайта. Служебные маршруты (/api/*, /call) сюда не попадают —
 * они закрыты в robots.ts и не предназначены для посетителей.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date()

  const pages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/quiz', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/collections', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/wardrobes', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/materials', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/filling', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  ]

  // Разделы, которые ведутся из панели, существуют только когда в них
  // что-то есть: пустые страницы отдают 404 и в карте сайта не нужны
  const [facades, countertops] = await Promise.all([
    getCatalogSection('facades'),
    getCatalogSection('countertops'),
  ])
  if (facades.length > 0) pages.push({ path: '/facades', changeFrequency: 'monthly', priority: 0.8 })
  if (countertops.length > 0) {
    pages.push({ path: '/countertops', changeFrequency: 'monthly', priority: 0.8 })
  }

  return pages.map((page) => ({
    url: page.path === '/' ? siteUrl : `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
