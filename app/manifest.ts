import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Модуль Эстет — кухни на заказ',
    short_name: 'Модуль Эстет',
    description: 'Проектирование и производство кухонь на заказ в Москве и Московской области.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8f5ef',
    theme_color: '#1a1a1a',
    lang: 'ru',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
      // PNG-иконки появятся после запуска _gen-icons.ps1 —
      // раскомментируйте эти блоки, когда файлы будут созданы:
      // {
      //   src: '/icon-192.png',
      //   sizes: '192x192',
      //   type: 'image/png',
      // },
      // {
      //   src: '/icon-512.png',
      //   sizes: '512x512',
      //   type: 'image/png',
      // },
      {
        // TODO: заменить экспорт из нового знака (см. public/brand/preview.html)
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }
}
