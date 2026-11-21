import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/admin-auth'
import { exportLeads, type LeadStatus, type LeadType } from '@/lib/db'
import { detailSections, leadSource, prettyPhone, statusText, typeText } from '@/lib/admin-format'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Экранирование поля CSV: кавычки удваиваются, значение всегда в кавычках */
function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

const COLUMNS = [
  'Номер',
  'Дата',
  'Тип',
  'Статус',
  'Имя',
  'Телефон',
  'Источник',
  'Кампания',
  'Ответственный',
  'Сумма сделки',
  'Причина отказа',
  'Подробности',
]

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 })
  }

  const p = request.nextUrl.searchParams
  const leads = await exportLeads({
    status: (p.get('status') as LeadStatus | null) ?? 'all',
    type: (p.get('type') as LeadType | null) ?? 'all',
    search: p.get('q') ?? undefined,
    from: p.get('from') ?? undefined,
    to: p.get('to') ?? undefined,
    assignedTo: p.get('manager') ?? undefined,
    sort: p.get('sort') === 'old_first' ? 'old_first' : 'new_first',
  })

  const rows = leads.map((lead) => {
    // Все ответы квиза складываем в одну ячейку «Подробности» —
    // иначе колонок было бы больше двадцати и таблица стала бы нечитаемой.
    const details = detailSections(lead)
      .flatMap((section) => section.rows.map((row) => `${row.label}: ${row.value}`))
      .join('; ')

    return [
      lead.id,
      new Date(lead.created_at).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' }),
      typeText(lead.type),
      statusText(lead.status),
      lead.name,
      prettyPhone(lead.phone),
      leadSource(lead),
      lead.utm?.campaign ?? '',
      lead.assigned_to ?? lead.status_by ?? '',
      lead.deal_amount ?? '',
      lead.reject_reason ?? '',
      details,
    ].map(csvCell).join(';')
  })

  // BOM обязателен: без него Excel открывает кириллицу кракозябрами.
  // Разделитель «;» — русская локаль Excel ждёт именно его.
  const csv = '﻿' + [COLUMNS.map(csvCell).join(';'), ...rows].join('\r\n')
  const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
