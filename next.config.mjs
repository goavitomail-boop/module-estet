/**
 * Заголовки безопасности для всех ответов сайта.
 *
 * Content-Security-Policy здесь нет намеренно: сайт использует встроенные
 * скрипты (заставка, разметка для поисковиков), и строгая политика без
 * настройки под них сломала бы страницу. Её стоит вводить отдельно и сначала
 * в режиме отчёта.
 */
const securityHeaders = [
  // Браузер не угадывает тип файла по содержимому
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Сайт нельзя встроить во фрейм на чужой странице (защита от подмены кликов)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Другим сайтам уходит только адрес сайта, без пути и параметров
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Камера, микрофон и геолокация сайту не нужны
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
  // Год только по HTTPS. Поддомены не трогаем: у них может не быть сертификата
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Не сообщаем в заголовках, на чём сделан сайт
  poweredByHeader: false,
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'hebbkx1anhila5yf.public.blob.vercel-storage.com' }],
  },
  typescript: {
    ignoreBuildErrors: true,
  },  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Панель и служебные маршруты поисковикам не показываем даже случайно
      { source: '/admin/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
      { source: '/api/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] },
    ]
  },
}

export default nextConfig
