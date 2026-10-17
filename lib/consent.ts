/**
 * Выбор посетителя в баннере об использовании данных.
 *
 * Кнопка отказа обязана что-то реально выключать, иначе баннер обещает выбор,
 * которого нет. Здесь это ровно одна граница: необязательная аналитика.
 *
 *   accepted  — разрешена аналитика: источник перехода и учёт шагов квиза.
 *   necessary — только то, без чего сайт не работает: черновик квиза,
 *               отметка о заставке, сессия админки.
 *
 * Хранится в localStorage, а не в куке: переживает закрытие вкладки и не
 * заводит лишнюю куку ради баннера про куки.
 */

export type ConsentChoice = 'accepted' | 'necessary'

const STORAGE_KEY = 'me-consent-v1'

/** Событие на window: атрибуция снимается сразу после согласия, пока utm-метки ещё в адресе */
export const CONSENT_EVENT = 'me-consent:change'

export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === 'accepted' || value === 'necessary' ? value : null
  } catch {
    // Приватный режим или заблокированное хранилище: спросим ещё раз
    return null
  }
}

export function writeConsent(choice: ConsentChoice): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, choice)
  } catch {
    // Не записалось — баннер появится в следующий визит, выбор в этой сессии всё равно учтём
  }
  window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: choice }))
}

/**
 * Разрешена ли необязательная аналитика.
 *
 * Отсутствие выбора считаем отказом: пока человек не ответил, ничего
 * необязательного не собираем.
 */
export function analyticsAllowed(): boolean {
  return readConsent() === 'accepted'
}
