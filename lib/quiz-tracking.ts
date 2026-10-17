import { getAttribution } from '@/lib/attribution'
import { analyticsAllowed } from '@/lib/consent'

/**
 * Учёт прохождения квиза: до какого шага дошёл посетитель.
 *
 * Нужен, чтобы видеть, где именно люди бросают форму. Без этого видно только
 * дошедших до конца, и непонятно, теряем мы людей на размерах, на бюджете
 * или на контактах.
 *
 * Персональные данные не отправляются — только номер шага и случайный
 * идентификатор попытки. Но это всё равно необязательная аналитика, поэтому
 * без согласия в баннере учёт молчит целиком: пустой идентификатор гасит
 * и отправку шагов, и привязку заявки к прохождению.
 */

const SESSION_KEY = 'me-quiz-session-v2'
/**
 * Версия квиза в начале id. С версии 2 шагов шесть, а не десять: воронка
 * считает только попытки с этим префиксом, чтобы старые не путали названия
 * шагов. Синхронизировано с QUIZ_SESSION_PREFIX в lib/db.ts
 */
const SESSION_PREFIX = 'v2'

function sessionId(): string {
  if (typeof window === 'undefined') return ''
  if (!analyticsAllowed()) return ''
  try {
    let id = sessionStorage.getItem(SESSION_KEY)
    if (!id) {
      id = SESSION_PREFIX + (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '')
      sessionStorage.setItem(SESSION_KEY, id)
    }
    return id
  } catch {
    // Приватный режим — прохождение просто не учтётся, форма работает как обычно
    return ''
  }
}

/** Идентификатор попытки для привязки заявки к прохождению квиза */
export function quizSessionId(): string {
  return sessionId()
}

function send(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload)
  try {
    // sendBeacon переживает уход со страницы — именно тогда и важно
    // зафиксировать шаг, на котором человек закрыл вкладку.
    if (navigator.sendBeacon?.('/api/quiz-progress', new Blob([body], { type: 'application/json' }))) {
      return
    }
  } catch {
    // Провалимся на fetch ниже
  }

  // keepalive — тот же расчёт: запрос не должен обрываться при закрытии вкладки
  fetch('/api/quiz-progress', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {
    // Учёт не критичен: молчим, чтобы не пугать посетителя ошибкой в консоли
  })
}

export function trackQuizStep(step: number): void {
  const id = sessionId()
  if (!id) return
  send({ sessionId: id, step, attribution: getAttribution() })
}

export function trackQuizCompleted(leadId: string): void {
  const id = sessionId()
  if (!id) return
  send({ sessionId: id, completed: true, leadId })
}
