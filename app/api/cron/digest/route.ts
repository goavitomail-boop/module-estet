import { NextRequest, NextResponse } from 'next/server'
import { sendMaxMessage } from '@/lib/max-bot'
import { getDigestLeads, getStats, isDbConfigured } from '@/lib/db'
import { digestCard } from '@/lib/max-ui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Утренняя сводка по заявкам за сутки.
 * Запускается кроном Vercel (см. vercel.json), расписание 06:00 UTC = 09:00 МСК.
 * Vercel присылает заголовок Authorization: Bearer <CRON_SECRET>.
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
    const [leads, stats] = await Promise.all([getDigestLeads(), getStats()])
    const { text, attachments } = digestCard(leads, stats)
    const result = await sendMaxMessage({ text, format: 'markdown', attachments })

    console.log(`[Digest] Сводка: ${leads.length} заявок, доставка ${result.ok ? 'успешна' : 'не удалась'}`)
    return NextResponse.json({ ok: result.ok, leads: leads.length, via: result.via, error: result.error })
  } catch (error) {
    console.error('[Digest] Ошибка формирования сводки:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
