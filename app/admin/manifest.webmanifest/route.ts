import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

/**
 * Манифест панели — чтобы её можно было поставить на телефон как приложение:
 * иконка на экране, запуск сразу в /admin и без адресной строки.
 *
 * Отдельный от манифеста сайта (app/manifest.ts): у него другой start_url,
 * другое имя и другой цвет. Один манифест на двоих привёл бы к тому, что
 * ярлык сайта открывал бы панель или наоборот.
 */
export function GET() {
  return NextResponse.json(
    {
      name: 'Модуль Эстет — заявки',
      short_name: 'Заявки',
      description: 'Панель управления заявками с сайта «Модуль Эстет».',
      start_url: '/admin',
      scope: '/admin',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#f7f5f0',
      theme_color: '#1a1a1a',
      lang: 'ru',
      // Тот же знак, что у сайта (scripts/gen-icons.mjs)
      icons: [
        { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      // Долгое нажатие по иконке откроет нужный раздел сразу
      shortcuts: [
        { name: 'Новые заявки', url: '/admin/leads?status=new' },
        { name: 'Календарь замеров', url: '/admin/calendar' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' } }
  )
}
