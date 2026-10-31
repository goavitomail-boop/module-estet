import { siteUrl } from '@/lib/seo'

/**
 * robots.txt текстом, а не через app/robots.ts: генератор Next не умеет
 * Clean-param, а он нужен Яндексу.
 *
 * Закрыты служебные маршруты:
 *  /api/*   — приём заявок, вебхук бота, диагностика
 *  /call    — страница набора номера клиента, инструмент менеджера
 *  /admin/* — панель управления заявками
 *
 * Clean-param: адрес с метками рекламы и аналитики — та же страница. Без него
 * Яндекс обходит и держит в индексе копии вида /?utm_source=… и тратит на них
 * обход. Host не пишем: Яндекс его больше не поддерживает, главное зеркало
 * задаётся в Вебмастере и редиректом.
 */
const CLEAN_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'yclid', 'ysclid', 'gclid', 'fbclid', 'from', '_openstat', 'preloader',
]

export const dynamic = 'force-static'

export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    'Disallow: /call',
    'Disallow: /admin',
    `Clean-param: ${CLEAN_PARAMS.join('&')}`,
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n')

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
