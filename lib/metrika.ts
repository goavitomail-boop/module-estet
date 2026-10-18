import { metrikaAllowed } from '@/lib/consent'

/**
 * Яндекс.Метрика: номер счётчика и отправка целей.
 *
 * Номер счётчика — не секрет, он виден в коде любой страницы, поэтому лежит
 * прямо здесь. Переменная NEXT_PUBLIC_YANDEX_METRIKA_ID нужна только чтобы
 * подменить его (например, на тестовый) или выключить значением 0.
 */
export const YANDEX_METRIKA_ID = Number(process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ?? 113551158) || 0

/**
 * Цели — их идентификаторы нужно завести в Метрике как «JavaScript-событие»:
 *   lead_measurement — отправлена заявка на замер
 *   lead_project     — отправлен расчёт кухни из квиза
 *   lead_wardrobe    — отправлен расчёт шкафа из квиза
 *   click_phone      — нажат номер телефона
 *   click_max        — нажата ссылка на чат в Максе
 */
export type MetrikaGoal = 'lead_measurement' | 'lead_project' | 'lead_wardrobe' | 'click_phone' | 'click_max'

/**
 * Отмечает достижение цели. Если счётчик не загружен или выключен (посетитель
 * выбрал «Только необходимые» или Метрика заблокирована), молча ничего не делает: учёт целей
 * не должен мешать отправке заявки.
 */
export function reachGoal(goal: MetrikaGoal): void {
  if (typeof window === 'undefined' || !YANDEX_METRIKA_ID || !metrikaAllowed()) return
  try {
    const ym = (window as Window & { ym?: (id: number, method: string, goal: string) => void }).ym
    ym?.(YANDEX_METRIKA_ID, 'reachGoal', goal)
  } catch {
    // Сбой аналитики — не повод показывать посетителю ошибку
  }
}
