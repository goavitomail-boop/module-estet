/**
 * Запоминает, откуда пришёл посетитель, и прикладывает это к заявке.
 *
 * Метки снимаются на ПЕРВОЙ странице визита и живут в sessionStorage:
 * человек может походить по сайту и отправить заявку уже с другой страницы,
 * но источник должен остаться тот, по которому он реально пришёл.
 */

import { analyticsAllowed } from '@/lib/consent'

const STORAGE_KEY = 'me-attribution-v1'

export interface Attribution {
  utm?: {
    source?: string
    medium?: string
    campaign?: string
    term?: string
    content?: string
  }
  referrer?: string
  landingPage?: string
}

const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const

function readFromUrl(): Attribution {
  const params = new URLSearchParams(window.location.search)
  const utm: Record<string, string> = {}

  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`)?.trim()
    if (value) utm[key] = value.slice(0, 120)
  }

  // Клики из Яндекс.Директа и Google Ads приходят с yclid/gclid даже без utm-меток
  if (!utm.source) {
    if (params.get('yclid')) utm.source = 'yandex-direct'
    else if (params.get('gclid')) utm.source = 'google-ads'
  }

  // Реферер с самого сайта — это внутренний переход, а не источник
  const referrer = document.referrer && !document.referrer.includes(window.location.host) ? document.referrer : ''

  return {
    ...(Object.keys(utm).length > 0 ? { utm } : {}),
    ...(referrer ? { referrer: referrer.slice(0, 300) } : {}),
    landingPage: (window.location.pathname + window.location.search).slice(0, 300),
  }
}

/**
 * Вызывается при загрузке первой страницы визита и повторно сразу после
 * согласия — в этот момент utm-метки ещё в адресе, если человек ответил
 * на баннер не уходя со страницы входа.
 *
 * Без согласия не снимаем ничего: источник перехода — необязательная
 * аналитика, а не условие работы сайта.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return
  if (!analyticsAllowed()) return
  try {
    if (sessionStorage.getItem(STORAGE_KEY)) return
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readFromUrl()))
  } catch {
    // Приватный режим или заблокированное хранилище — источник просто не запомнится
  }
}

/** Данные для отправки вместе с заявкой. Без согласия заявка уходит без источника. */
export function getAttribution(): Attribution {
  if (typeof window === 'undefined') return {}
  if (!analyticsAllowed()) return {}
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as Attribution
    return readFromUrl()
  } catch {
    return {}
  }
}

/** Стереть уже снятый источник — когда человек передумал и отозвал согласие */
export function forgetAttribution(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Нечего или некуда стирать
  }
}
