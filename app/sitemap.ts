import type { MetadataRoute } from 'next'
import { getPortfolioPages } from '@/lib/portfolio-source'
import { siteUrl } from '@/lib/seo'

/**
 * Карта сайта. Служебные маршруты (/api/*, /call, /admin) сюда не попадают —
 * они закрыты в robots.txt и не предназначены для посетителей.
 *
 * lastmod не ставим: раньше здесь стояла текущая дата на каждый запрос, и
 * поисковики перестают доверять такой дате. Без неё они ориентируются на
 * собственный обход, а свежие страницы проектов подсказывает Вебмастер.
 *
 * Карта пересобирается раз в час и после правок портфолио в панели —
 * новые проекты попадают в неё сами.
 */
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
    { path: '/', changeFrequency: 'weekly', priority: 1 },
    { path: '/portfolio', changeFrequency: 'weekly', priority: 0.9 },
    { path: '/quiz', changeFrequency: 'monthly', priority: 0.9 },
    { path: '/collections', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/wardrobes', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/materials', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/facades', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/countertops', changeFrequency: 'monthly', priority: 0.8 },
    { path: '/filling', changeFrequency: 'monthly', priority: 0.7 },
    { path: '/privacy', changeFrequency: 'yearly', priority: 0.2 },
  ]

  const projects = await getPortfolioPages()

  return [
    ...pages.map((page) => ({
      url: page.path === '/' ? siteUrl : `${siteUrl}${page.path}`,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
    })),
    ...projects.map((project) => ({
      url: `${siteUrl}/portfolio/${project.id}`,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
      images: project.photos.map((photo) => (photo.src.startsWith('http') ? photo.src : `${siteUrl}${photo.src}`)),
    })),
  ]
}
