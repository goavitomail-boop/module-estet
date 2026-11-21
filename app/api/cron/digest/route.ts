import { NextRequest, NextResponse } from 'next/server'
import { sendMaxMessage } from '@/lib/max-bot'
import { getDigestLeads, getStats, isDbConfigured, markDigestSent } from '@/lib/db'
import { digestCard } from '@/lib/max-ui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Сводка по заявкам менеджеру в MAX — с момента предыдущей сводки.
 * Запускает cron на сервере через scripts/site-task.sh digest; расписание
 * любое (например, 09:00 и 19:00 по Москве), заявки в сводках не повторяются.
 * Вызов только с заголовком Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'DATABASE_URL не задан' }, { status: 200 })
  }

  try {
    const [{ leads, since, until }, stats] = await Promise.all([getDigestLeads(), getStats()])
    const { text, attachments } = digestCard(leads, stats, since, until)
    const result = await sendMaxMessage({ text, format: 'markdown', attachments })
    // Отметку ставим только при доставке: иначе следующая сводка повторит этот период
    if (result.ok) await markDigestSent(until)

    console.log(`[Digest] Сводка с ${since}: ${leads.length} заявок, доставка ${result.ok ? 'успешна' : 'не удалась'}`)
    return NextResponse.json({ ok: result.ok, leads: leads.length, since, via: result.via, error: result.error })
  } catch (error) {
    console.error('[Digest] Ошибка формирования сводки:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
