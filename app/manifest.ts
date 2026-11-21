import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Модуль Эстет — кухни на заказ',
    short_name: 'Модуль Эстет',
    description: 'Проектирование и производство кухонь на заказ в Москве и Московской области.',
    start_url: '/',
    // «browser», а не «standalone»: с ним Chrome и Яндекс Браузер на Android
    // считали сайт приложением и сами предлагали «Установить приложение».
    // Посетителю это ни к чему; иконка для «На экран Домой» остаётся.
    // Устанавливается как приложение только панель — у неё свой манифест
    // (app/admin/manifest.webmanifest)
    display: 'browser',
    background_color: '#f8f5ef',
    theme_color: '#1a1a1a',
    lang: 'ru',
    // Собирает scripts/gen-icons.mjs из знака в шапке сайта
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
