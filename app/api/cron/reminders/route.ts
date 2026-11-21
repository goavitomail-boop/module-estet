import { NextRequest, NextResponse } from 'next/server'
import { sendMaxMessage } from '@/lib/max-bot'
import { getRemindersDue, isDbConfigured, markReminderSent } from '@/lib/db'
import { reminderCard } from '@/lib/max-ui'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Напоминания «пора связаться» уходят менеджеру в MAX.
 *
 * Без этого напоминание видно только тому, кто сам зайдёт на дашборд, —
 * то есть ровно тогда, когда оно уже не нужно.
 *
 * Расписание в vercel.json. Отметка о доставке хранится в reminder_sent_at,
 * поэтому повторный запуск крона в тот же день ничего не продублирует.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    if (request.headers.get('authorization') !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  if (!isDbConfigured()) {
    return NextResponse.json({ ok: false, error: 'База не подключена' })
  }

  try {
    const due = await getRemindersDue()
    if (due.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 })
    }

    const { text, attachments } = reminderCard(due)
    const result = await sendMaxMessage({ text, format: 'markdown', attachments })

    // Помечаем только при успешной доставке: иначе напоминание пропадёт молча
    if (result.ok) {
      for (const lead of due) {
        if (lead.next_contact_at) await markReminderSent(lead.id, lead.next_contact_at)
      }
    }

    console.log(`[Reminders] Напоминаний: ${due.length}, доставка ${result.ok ? 'успешна' : 'не удалась'}`)
    return NextResponse.json({ ok: result.ok, sent: due.length, error: result.error })
  } catch (error) {
    console.error('[Reminders] Ошибка:', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
