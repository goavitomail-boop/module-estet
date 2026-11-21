import type { Lead, LeadStatus, LeadType } from '@/lib/db'
import { MEASUREMENT_SLOTS } from '@/lib/measurement-slots'

/**
 * Подписи статусов и типов для веб-панели — без эмодзи.
 *
 * В lib/db.ts лежат STATUS_LABELS и TYPE_LABELS с эмодзи: они уходят в бота MAX,
 * где иконку нарисовать нечем и эмодзи — единственный способ выделить статус.
 * В панели вместо них рисуются нормальные векторные иконки, поэтому здесь
 * нужен чистый текст.
 */
export const STATUS_TEXT: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  scheduled: 'Замер назначен',
  done: 'Закрыта',
  rejected: 'Отказ',
}

export const TYPE_TEXT: Record<LeadType, string> = {
  measurement: 'Замер',
  project: 'Проект',
}

/** Названия шагов квиза — порядок и текст синхронизированы с components/project-quiz.tsx */
export const QUIZ_STEP_NAMES = [
  'Планировка',
  'Размер кухни',
  'Стиль',
  'Пожелания',
  'Сроки и бюджет',
  'Контакты',
] as const

export function statusText(status: string): string {
  return STATUS_TEXT[status as LeadStatus] ?? status
}

export function typeText(type: string): string {
  return TYPE_TEXT[type as LeadType] ?? type
}

/**
 * Превращает сырой details (JSONB) в человекочитаемые блоки для карточки заявки.
 * Ключи берутся из квиза (components/project-quiz.tsx) и формы замера
 * (components/measurement-booking.tsx).
 */

const MSK = 'Europe/Moscow'

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('ru-RU', {
    timeZone: MSK,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('ru-RU', { timeZone: MSK, day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** «12 минут назад», «3 часа назад» — чтобы сразу видеть свежесть заявки */
export function timeAgo(value: string | null | undefined): string {
  if (!value) return '—'
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return '—'
  const minutes = Math.floor((Date.now() - then) / 60_000)

  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} ${plural(minutes, 'минуту', 'минуты', 'минут')} назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${plural(hours, 'час', 'часа', 'часов')} назад`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} ${plural(days, 'день', 'дня', 'дней')} назад`
  const months = Math.floor(days / 30)
  return `${months} ${plural(months, 'месяц', 'месяца', 'месяцев')} назад`
}

export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

/** Часы с момента создания — для подсветки просроченных */
export function hoursSince(value: string): number {
  const then = new Date(value).getTime()
  if (Number.isNaN(then)) return 0
  return (Date.now() - then) / 3_600_000
}

export function formatMoney(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const num = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(num)) return '—'
  return `${num.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽`
}

/** Postgres отдаёт numeric строкой, поэтому приводим тип явно, а не доверяем ему */
export function formatHours(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—'
  const hours = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(hours)) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} мин`
  if (hours < 24) return `${hours.toFixed(1)} ч`
  return `${(hours / 24).toFixed(1)} дн`
}

/** Телефон в вид +7 (999) 123-45-67 */
export function prettyPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) {
    return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9, 11)}`
  }
  return phone
}

export function telHref(phone: string): string {
  const d = phone.replace(/\D/g, '')
  if (d.length === 11 && d[0] === '8') return `tel:+7${d.slice(1)}`
  return `tel:+${d}`
}

/* ── Расшифровка ответов квиза ─────────────────────────────────────── */

export interface DetailSection {
  title: string
  rows: Array<{ label: string; value: string }>
}

const LABELS: Record<string, string> = {
  projectType: 'Тип проекта',
  room: 'Где будет шкаф',
  wardrobeType: 'Тип шкафа',
  wardrobeWidth: 'Ширина шкафа',
  wardrobeWidthCm: 'Ширина стены, см',
  layout: 'Планировка',
  kitchenSize: 'Размер кухни',
  location: 'Где находится кухня',
  wallA: 'Стена A',
  wallB: 'Стена B',
  wallC: 'Стена C',
  roomArea: 'Площадь помещения',
  ceilingHeight: 'Высота потолков',
  noMeasurements: 'Замеров нет',
  style: 'Стиль',
  palette: 'Палитра',
  facades: 'Фасады',
  countertop: 'Столешница',
  hardware: 'Фурнитура',
  appliances: 'Техника',
  features: 'Дополнительно',
  storage: 'Системы хранения',
  timeline: 'Сроки',
  renovationStage: 'Стадия ремонта',
  budget: 'Бюджет',
  contactMethod: 'Как связаться',
  contactTime: 'Удобное время связи',
  comment: 'Комментарий клиента',
  city: 'Город',
  address: 'Адрес',
  date: 'Дата замера',
  time: 'Время замера',
}

const SECTIONS: Array<{ title: string; keys: string[] }> = [
  { title: 'Задача', keys: ['projectType', 'timeline', 'renovationStage', 'budget'] },
  { title: 'Помещение', keys: ['room', 'wardrobeType', 'wardrobeWidth', 'wardrobeWidthCm', 'layout', 'kitchenSize', 'location', 'wallA', 'wallB', 'wallC', 'roomArea', 'ceilingHeight', 'noMeasurements'] },
  { title: 'Стиль и материалы', keys: ['style', 'palette', 'facades', 'countertop', 'hardware'] },
  { title: 'Техника и функции', keys: ['appliances', 'features', 'storage'] },
  { title: 'Связь', keys: ['contactMethod', 'contactTime', 'comment'] },
]

/**
 * Некоторые поля форма хранит кодом, а не текстом: слот замера уходит как
 * 'morning'. В карточке менеджер должен видеть «Утро (09:00 — 12:00)».
 * Значения синхронизированы с timeSlots в components/measurement-booking.tsx.
 */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  // Строится из общего описания слотов, чтобы подписи в карточке, в форме
  // на сайте и в календаре не разъехались при правке расписания
  time: Object.fromEntries(MEASUREMENT_SLOTS.map((s) => [s.value, `${s.label} (${s.time})`])),
}

function renderValue(value: unknown, key?: string): string {
  if (value == null || value === '') return ''
  if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : ''
  if (typeof value === 'boolean') return value ? 'да' : ''

  const text = String(value)
  if (key && VALUE_LABELS[key]?.[text]) return VALUE_LABELS[key][text]

  // Дата замера приходит как '2026-09-23' — показываем в привычном виде
  if (key === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(text)) return formatDate(text)

  return text
}

/** Разбирает details заявки на секции. Незнакомые ключи не теряются — уходят в «Прочее». */
export function detailSections(lead: Lead): DetailSection[] {
  const details = (lead.details ?? {}) as Record<string, unknown>
  const answers =
    details.answers && typeof details.answers === 'object'
      ? (details.answers as Record<string, unknown>)
      : details

  const used = new Set<string>(['files', 'answers', 'consent', 'name', 'phone'])
  const sections: DetailSection[] = []

  for (const section of SECTIONS) {
    const rows = section.keys
      .map((key) => {
        used.add(key)
        return { label: LABELS[key] ?? key, value: renderValue(answers[key], key) }
      })
      .filter((row) => row.value !== '')
    if (rows.length > 0) sections.push({ title: section.title, rows })
  }

  // Замер: город / адрес / дата / время лежат плоско в details
  const measurementRows = ['city', 'address', 'date', 'time']
    .map((key) => {
      used.add(key)
      return { label: LABELS[key], value: renderValue(answers[key], key) }
    })
    .filter((row) => row.value !== '')
  if (measurementRows.length > 0) sections.unshift({ title: 'Замер', rows: measurementRows })

  const extraRows = Object.entries(answers)
    .filter(([key]) => !used.has(key))
    .map(([key, value]) => ({ label: LABELS[key] ?? key, value: renderValue(value, key) }))
    .filter((row) => row.value !== '')
  if (extraRows.length > 0) sections.push({ title: 'Прочее', rows: extraRows })

  return sections
}

export interface LeadFile {
  name: string
  size: number
  type: string
  /** Прямая ссылка в хранилище. Для приватных файлов сама по себе не открывается. */
  url?: string
  /** Путь в хранилище — по нему панель отдаёт файл через /admin/file */
  pathname?: string
}

/**
 * Ссылка, по которой менеджер откроет файл.
 *
 * Новые файлы лежат в приватном хранилище: к ним есть pathname, и читаются они
 * только через /admin/file с проверкой сессии. У заявок, загруженных до
 * перехода на приватное хранилище, есть лишь публичный url — отдаём его как есть.
 */
export function leadFileHref(file: LeadFile, download = false): string | null {
  if (file.pathname) {
    return `/admin/file?path=${encodeURIComponent(file.pathname)}${download ? '&download=1' : ''}`
  }
  // Адрес в заявку записывает браузер посетителя. Отдаём его менеджеру, только
  // если это действительно наше хранилище, — иначе под видом «файла клиента»
  // в панели оказалась бы ссылка на произвольный сайт
  if (!file.url) return null
  try {
    const url = new URL(file.url)
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com') ? file.url : null
  } catch {
    return null
  }
}

/** Файлы, приложенные к заявке (планы, фото помещения) */
export function leadFiles(lead: Lead): LeadFile[] {
  const files = (lead.details as Record<string, unknown> | null)?.files
  if (!Array.isArray(files)) return []
  return files.filter((f): f is LeadFile => Boolean(f) && typeof f === 'object' && 'name' in f)
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} Б`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} КБ`
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/** Источник заявки одной строкой: utm_source или домен реферера */
export function leadSource(lead: Lead): string {
  const source = lead.utm?.source
  if (source) {
    const campaign = lead.utm?.campaign
    return campaign ? `${source} / ${campaign}` : source
  }
  if (!lead.referrer) return 'Прямой заход'
  try {
    return new URL(lead.referrer).hostname
  } catch {
    return lead.referrer.slice(0, 40)
  }
}

/** Грубое определение устройства по User-Agent — для понимания, откуда заполняют */
export function deviceFromUserAgent(ua: string | null): string {
  if (!ua) return '—'
  if (/iPad|Tablet/i.test(ua)) return 'Планшет'
  if (/Mobile|Android|iPhone/i.test(ua)) return 'Телефон'
  return 'Компьютер'
}
