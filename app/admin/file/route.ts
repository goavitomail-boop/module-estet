import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Отдаёт менеджеру файл клиента из приватного хранилища.
 *
 * Хранилище приватное намеренно: планировки и фотографии квартиры — личные
 * данные, и прямая ссылка на них не должна работать у постороннего.
 * Поэтому файл проходит через этот маршрут, который сначала проверяет сессию
 * панели, а потом уже стримит содержимое.
 */
export async function GET(request: NextRequest) {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const pathname = request.nextUrl.searchParams.get('path')
  if (!pathname) {
    return NextResponse.json({ error: 'Не указан файл' }, { status: 400 })
  }

  // Пускаем только внутрь leads/ — чтобы параметром нельзя было вытащить
  // произвольный объект из хранилища
  if (!pathname.startsWith('leads/') || pathname.includes('..')) {
    return NextResponse.json({ error: 'Недопустимый путь' }, { status: 400 })
  }

  try {
    const { get } = await import('@vercel/blob')
    const result = await get(pathname, { access: 'private' })

    if (!result || result.statusCode !== 200 || !result.stream) {
      return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    }

    const download = request.nextUrl.searchParams.get('download') === '1'
    const filename = pathname.split('/').pop() ?? 'file'

    return new NextResponse(result.stream as unknown as BodyInit, {
      headers: {
        'Content-Type': result.blob.contentType || 'application/octet-stream',
        'Content-Length': String(result.blob.size),
        // inline — чтобы превью показывалось прямо в карточке
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(filename)}`,
        // Приватные данные не должны оседать в общих кэшах
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Admin File] Не удалось отдать файл:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
