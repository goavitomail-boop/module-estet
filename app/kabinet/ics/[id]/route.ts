import { NextResponse } from 'next/server'
import { getClientSession } from '@/lib/cabinet-auth'
import { getOrder, getVisit } from '@/lib/cabinet-db'
import { visitKindLabel } from '@/lib/cabinet-shared'
import { COMPANY } from '@/lib/company'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Переносы и запятые в тексте события по стандарту экранируются */
function escape(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** «Добавить в календарь» для визита: замер, доставка, монтаж */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const client = await getClientSession()
  if (!client) return NextResponse.json({ error: 'Требуется вход' }, { status: 401 })

  const { id } = await params
  const visit = await getVisit(id)
  const order = visit ? await getOrder(visit.order_id) : null
  if (!visit || !order || order.client_id !== client.id) {
    return NextResponse.json({ error: 'Визит не найден' }, { status: 404 })
  }

  const start = new Date(visit.starts_at)
  // Монтаж — на весь день, остальное — на пару часов
  const hours = visit.kind === 'installation' ? 8 : 2
  const end = new Date(start.getTime() + hours * 3600_000)
  const title = `${visitKindLabel(visit.kind)} — Модуль Эстет`
  const description = [
    `Заказ: ${order.title}`,
    visit.note,
    order.manager_name ? `Менеджер: ${order.manager_name} ${order.manager_phone}` : `Телефон: ${COMPANY.phone}`,
  ]
    .filter(Boolean)
    .join('\n')

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Модуль Эстет//Кабинет//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:visit-${visit.id}@module-estet.ru`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    order.address ? `LOCATION:${escape(order.address)}` : '',
    `DESCRIPTION:${escape(description)}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escape(title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="vizit-${visit.id}.ics"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
