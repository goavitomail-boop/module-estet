/**
 * События, которые открывают форму записи на замер.
 *
 * Отдельным крошечным модулем: кнопки «Записаться на замер» есть на каждой
 * странице (подвал, призывы), и если бы они импортировали функцию из самой
 * формы, вместе с ней в каждую страницу попадали бы библиотеки диалога и
 * анимаций. Сама форма грузится лениво (components/site-chrome.tsx).
 */
export const MEASUREMENT_BOOKING_EVENT = 'open-measurement-booking'
export const MEASUREMENT_BOOKING_ALT_EVENT = 'measurement-booking:open'

export function triggerMeasurementBooking() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MEASUREMENT_BOOKING_EVENT))
    window.dispatchEvent(new CustomEvent(MEASUREMENT_BOOKING_ALT_EVENT))
  }
}
