import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/seo'

/**
 * Закрываем от индексации служебные маршруты:
 *  /api/*  — приём заявок, вебхук бота, диагностика
 *  /call   — страница набора номера клиента, инструмент менеджера
 *  /admin/* — панель управления заявками
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/call', '/admin'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
