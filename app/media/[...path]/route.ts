import { NextRequest, NextResponse } from 'next/server'
import { readFile } from '@/lib/storage'

export const runtime = 'nodejs'

/** Папки хранилища, содержимое которых можно показывать посетителю */
const PUBLIC_FOLDERS = ['portfolio/', 'catalog/']
/** Типы, которые загружает панель в эти папки */
const PUBLIC_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif', 'image/heic']

/**
 * Отдаёт посетителю фотографию портфолио из хранилища.
 *
 * Хранилище приватное — там же лежат планировки и фото квартир клиентов,
 * и открывать его целиком нельзя. Поэтому публичные картинки идут через
 * этот маршрут, и он пускает наружу только те папки, что перечислены
 * в PUBLIC_FOLDERS.
 *
 * Имя файла при загрузке получает случайный суффикс, то есть один и тот же
 * адрес всегда возвращает одну и ту же картинку. Это позволяет закэшировать
 * ответ навсегда: браузер и CDN больше к нам за ней не придут.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const pathname = (path ?? []).join('/')

  if (!PUBLIC_FOLDERS.some((folder) => pathname.startsWith(folder)) || pathname.includes('..')) {
    return NextResponse.json({ error: 'Недопустимый путь' }, { status: 400 })
  }

  try {
    // Neon, а файл, ещё не перенесённый из Vercel Blob, — оттуда (lib/storage.ts)
    const file = await readFile(pathname)
    if (!file) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    // Наружу отдаём только картинки. В этих папках ничего другого быть не
    // должно, а если там окажется PDF или HTML, раздавать его с нашего домена
    // нельзя: так на сайте компании размещают чужие страницы и документы
    const contentType = file.contentType
    if (!PUBLIC_TYPES.includes(contentType)) {
      await file.stream.cancel().catch(() => {})
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    return new NextResponse(file.stream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(file.size),
        'Cache-Control': 'public, max-age=31536000, immutable',
        // Браузер не должен угадывать тип по содержимому
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Медиа] Не удалось отдать файл:', message)
    return NextResponse.json({ error: 'Файл недоступен' }, { status: 500 })
  }
}
