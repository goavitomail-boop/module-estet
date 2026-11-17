import { NextResponse } from 'next/server'
import { getSession } from '@/lib/admin-auth'
import { getLeadPulse, isDbConfigured } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Пульс панели: сколько новых заявок и какая пришла последней.
 * Панель опрашивает его раз в 45 секунд, пока вкладка открыта, — отсюда
 * счётчик на вкладке «Заявки», значок на иконке приложения и уведомление
 * «Новая заявка» без перезагрузки страницы.
 */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const headers = { 'Cache-Control': 'no-store' }
  if (!isDbConfigured()) {
    return NextResponse.json({ newCount: 0, overdue: 0, latest: null }, { headers })
  }

  try {
    return NextResponse.json(await getLeadPulse(), { headers })
  } catch (error) {
    // База моргнула — панель просто подождёт следующего опроса
    console.warn('[Admin] Пульс заявок недоступен:', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'unavailable' }, { status: 503, headers })
  }
}
