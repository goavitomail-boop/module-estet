import { slotByValue } from '@/lib/measurement-slots'

/**
 * Файл календаря для клиента после записи на замер.
 *
 * Собирается прямо в браузере: серверный маршрут для этого не нужен, а значит
 * нет и открытого адреса, которому можно скормить произвольные параметры.
 *
 * Время пишем в UTC с суффиксом Z, а не с TZID: Москва круглый год UTC+3,
 * перехода на летнее время нет, и так файл не тянет за собой описание
 * часового пояса и корректно читается любым календарём.
 */

const MOSCOW_OFFSET_HOURS = 3

function toUtcStamp(date: string, moscowHour: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const utc = new Date(Date.UTC(y, m - 1, d, moscowHour - MOSCOW_OFFSET_HOURS, 0, 0))
  return utc.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** Переносы строк и запятые в тексте события положено экранировать */
function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export interface BookingEvent {
  date: string
  slot: string
  city: string
  address: string
  companyPhone: string
}

export function buildMeasurementIcs(booking: BookingEvent): string {
  const slot = slotByValue(booking.slot)
  if (!slot) return ''

  const location = [booking.city, booking.address].filter(Boolean).join(', ')
  const uid = `measurement-${booking.date}-${booking.slot}-${Math.random().toString(36).slice(2, 10)}@module-estet.ru`

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Модуль Эстет//Замер//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
    `DTSTART:${toUtcStamp(booking.date, slot.startsHour)}`,
    `DTEND:${toUtcStamp(booking.date, slot.endsHour)}`,
    'SUMMARY:Замер кухни — Модуль Эстет',
    `LOCATION:${escapeText(location)}`,
    `DESCRIPTION:${escapeText(
      [
        `Мастер приедет в интервале ${slot.time}.`,
        'Он привезёт образцы материалов, лазерный инструмент и каталоги фурнитуры.',
        'Замер занимает от 40 до 90 минут.',
        '',
        `Если планы изменятся, позвоните: ${booking.companyPhone}`,
      ].join('\n')
    )}`,
    'BEGIN:VALARM',
    // За два часа — ровно тогда, когда компания и сама звонит подтвердить
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    'DESCRIPTION:Сегодня замер кухни',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  // По стандарту строки разделяются CRLF
  return lines.join('\r\n')
}

/** Отдаёт .ics как скачиваемый файл */
export function downloadIcs(content: string, filename = 'zamer-module-estet.ics'): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // Освобождаем ссылку, иначе blob висит в памяти до перезагрузки страницы
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
