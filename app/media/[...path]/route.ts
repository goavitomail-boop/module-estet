import { readFile as readDisk } from 'node:fs/promises'
import path from 'node:path'
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
/**
 * Запасная копия картинки в самом сайте: public/media-fallback/<папка>/<имя>.webp.
 *
 * Хранилище — внешний сервис: истёк ключ, поменялись права бакета — и все
 * фото из панели разом превращаются в серые заглушки. Для самых важных
 * картинок (ручки на «Наполнении» и т. п.) кладём копию в репозиторий; имя —
 * как в хранилище, но без случайного суффикса, который панель дописывает при
 * загрузке: catalog/l1-brash-chernyy-Og097….webp → catalog/l1-brash-chernyy.webp
 */
async function fallback(pathname: string): Promise<NextResponse | null> {
  const match = pathname.match(/^((?:catalog|portfolio)(?:\/[a-z0-9-]+)*)\/([a-z0-9-]+?)-[A-Za-z0-9]{16,}\.(?:webp|jpe?g|png|avif)$/)
  if (!match) return null
  try {
    const body = await readDisk(path.join(process.cwd(), 'public', 'media-fallback', match[1], `${match[2]}.webp`))
    return new NextResponse(new Uint8Array(body), {
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': String(body.length),
        // Не навсегда: когда хранилище оживёт, браузеры подхватят оригинал
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return null
  }
}

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
      return (await fallback(pathname)) ?? NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
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
    return (await fallback(pathname)) ?? NextResponse.json({ error: 'Файл недоступен' }, { status: 500 })
  }
}
