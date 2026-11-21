import { NextRequest, NextResponse } from 'next/server'
import { isDbConfigured, markQuizCompleted, trackQuizStep, type LeadUtm } from '@/lib/db'
import { allowRequest, clientIp } from '@/lib/request-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Приём маячков прохождения квиза.
 *
 * Отвечает 204 всегда и как можно быстрее: это фоновый запрос из sendBeacon,
 * посетитель его не ждёт, и ошибка учёта не должна ничего ломать.
 * Персональных данных не принимает — только номер шага и id попытки.
 */
export async function POST(request: NextRequest) {
  if (!isDbConfigured()) return new NextResponse(null, { status: 204 })

  // Один проход квиза — десяток маячков. Сотни за десять минут с одного
  // адреса — это уже не посетитель, а попытка засорить таблицу статистики
  if (!allowRequest('quiz-progress', clientIp(request), 120, 10 * 60_000)) {
    return new NextResponse(null, { status: 204 })
  }

  try {
    const body = (await request.json()) as {
      sessionId?: unknown
      step?: unknown
      completed?: unknown
      leadId?: unknown
      attribution?: unknown
    }

    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.slice(0, 64) : ''
    // Идентификатор генерируем сами из UUID — всё остальное отбрасываем
    if (!/^[a-z0-9]{16,64}$/i.test(sessionId)) return new NextResponse(null, { status: 204 })

    if (body.completed === true) {
      const leadId = typeof body.leadId === 'string' ? body.leadId.slice(0, 40) : ''
      if (leadId) await markQuizCompleted(sessionId, leadId)
      return new NextResponse(null, { status: 204 })
    }

    const step = typeof body.step === 'number' && Number.isFinite(body.step) ? body.step : 0
    if (step < 1) return new NextResponse(null, { status: 204 })

    let utm: LeadUtm | null = null
    const raw = body.attribution as { utm?: Record<string, unknown> } | undefined
    if (raw?.utm && typeof raw.utm === 'object') {
      const parsed: LeadUtm = {}
      for (const key of ['source', 'medium', 'campaign', 'term', 'content'] as const) {
        const value = raw.utm[key]
        if (typeof value === 'string' && value.trim()) parsed[key] = value.trim().slice(0, 120)
      }
      if (Object.keys(parsed).length > 0) utm = parsed
    }

    await trackQuizStep(sessionId, step, utm)
  } catch (error) {
    console.error('[Quiz] Не удалось записать шаг:', error)
  }

  return new NextResponse(null, { status: 204 })
}
