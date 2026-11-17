import { NextRequest, NextResponse } from 'next/server'
import { getClientSession } from '@/lib/cabinet-auth'
import { getOrder, getOrderFile } from '@/lib/cabinet-db'
import { readFile } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Файл заказа для клиента: договор, проект, фото с производства.
 * Хранилище приватное — файл отдаётся, только если заказ принадлежит
 * вошедшему клиенту и менеджер отметил файл видимым. Чужой и скрытый
 * файлы отвечают одинаково — «не найден».
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await getClientSession()
  if (!client) return NextResponse.json({ error: 'Требуется вход' }, { status: 401 })

  const { id } = await params
  const file = await getOrderFile(id)
  const order = file ? await getOrder(file.order_id) : null
  if (!file || !file.visible || !order || order.client_id !== client.id) {
    return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
  }

  try {
    const stored = await readFile(file.pathname)
    if (!stored) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 })
    const download = request.nextUrl.searchParams.get('download') === '1'
    return new NextResponse(stored.stream, {
      headers: {
        'Content-Type': stored.contentType,
        'Content-Length': String(stored.size),
        'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Cache-Control': 'private, max-age=600',
        'X-Robots-Tag': 'noindex',
      },
    })
  } catch (error) {
    console.error('[Кабинет] Не удалось отдать файл:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Файл временно недоступен' }, { status: 500 })
  }
}
