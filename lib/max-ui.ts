import { formatRussianPhone } from '@/lib/phone'
import { STATUS_LABELS, TYPE_LABELS, LEAD_STATUSES, type Lead, type LeadStatus, type LeadType } from '@/lib/db'
import type { MaxAttachment, MaxInlineButton } from '@/lib/max-bot'
import { siteUrl } from '@/lib/seo'

/**
 * Оформление сообщений и клавиатур бота.
 *
 * Формат payload у callback-кнопок держим коротким:
 *   m                     — главное меню
 *   l:<offset>:<st>:<tp>:<sort> — список заявок
 *   v:<id>                — карточка заявки
 *   s:<id>:<status>       — сменить статус
 *   f:<offset>:<st>:<tp>:<sort> — меню фильтров
 *   k:<offset>:<st>:<tp>:<sort> — меню сортировки
 *   st                    — статистика
 */

export const PAGE_SIZE = 5

export interface ListState {
  offset: number
  status: LeadStatus | 'all'
  type: LeadType | 'all'
  sort: 'new_first' | 'old_first'
  search?: string
}

export const DEFAULT_LIST_STATE: ListState = { offset: 0, status: 'all', type: 'all', sort: 'new_first' }

export function encodeState(s: ListState): string {
  return `${s.offset}:${s.status}:${s.type}:${s.sort === 'old_first' ? 'o' : 'n'}`
}

export function decodeState(raw: string | undefined): ListState {
  if (!raw) return { ...DEFAULT_LIST_STATE }
  const [offset, status, type, sort] = raw.split(':')
  return {
    offset: Number.parseInt(offset ?? '0', 10) || 0,
    status: (LEAD_STATUSES as readonly string[]).includes(status) ? (status as LeadStatus) : 'all',
    type: type === 'measurement' || type === 'project' ? type : 'all',
    sort: sort === 'o' ? 'old_first' : 'new_first',
  }
}

/**
 * Текст, который прислал посетитель сайта, перед вставкой в сообщение бота.
 *
 * Сообщения уходят в формате markdown. Без этой чистки имя вида
 * «[Позвоните сюда](https://…)» превратилось бы у менеджера в кликабельную
 * ссылку на чужой сайт. Скобки ссылок заменяем на обычные, знаки разметки
 * убираем — смысл текста от этого не меняется.
 */
function plain(value: string): string {
  return value
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/[*`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Файл клиента показываем ссылкой, только если она ведёт в наше хранилище */
function isStorageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

export function keyboard(buttons: MaxInlineButton[][]): MaxAttachment[] {
  return buttons.length > 0 ? [{ type: 'inline_keyboard', payload: { buttons } }] : []
}

function cb(text: string, payload: string): MaxInlineButton {
  return { type: 'callback', text, payload }
}

function moscowTime(value: string | Date): string {
  return new Date(value).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function shortTime(value: string | Date): string {
  return new Date(value).toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/* ─────────────────────────── Главное меню ─────────────────────────── */

export function mainMenu(unhandled: number): { text: string; attachments: MaxAttachment[] } {
  const text = [
    '🏠 **МОДУЛЬ ЭСТЕТ — ПАНЕЛЬ ЗАЯВОК**',
    '',
    unhandled > 0
      ? `🔔 Необработанных заявок: **${unhandled}**`
      : '✨ Все заявки разобраны. Новых нет.',
    '',
    '_Подсказка: отправьте номер телефона или имя клиента — найду все его заявки._',
  ].join('\n')

  return {
    text,
    attachments: keyboard([
      [cb('📋 Все заявки', `l:${encodeState(DEFAULT_LIST_STATE)}`)],
      [cb('🆕 Только новые', `l:0:new:all:n`), cb('🔧 В работе', `l:0:in_progress:all:n`)],
      [cb('📊 Статистика', 'st')],
    ]),
  }
}

/* ─────────────────────────── Список заявок ─────────────────────────── */

function statusChip(status: string): string {
  return STATUS_LABELS[status as LeadStatus] ?? status
}

function typeChip(type: string): string {
  return TYPE_LABELS[type as LeadType] ?? type
}

export function leadList(
  rows: Lead[],
  total: number,
  state: ListState
): { text: string; attachments: MaxAttachment[] } {
  const from = total === 0 ? 0 : state.offset + 1
  const to = Math.min(state.offset + PAGE_SIZE, total)

  const filterLine: string[] = []
  if (state.status !== 'all') filterLine.push(statusChip(state.status))
  if (state.type !== 'all') filterLine.push(typeChip(state.type))
  if (state.search) filterLine.push(`🔎 «${plain(state.search)}»`)

  const header = [
    '📋 **СПИСОК ЗАЯВОК**',
    filterLine.length > 0 ? `Фильтр: ${filterLine.join(' · ')}` : 'Фильтр: все заявки',
    `Сортировка: ${state.sort === 'new_first' ? 'сначала новые' : 'сначала старые'}`,
    total > 0 ? `Показаны **${from}–${to}** из **${total}**` : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (rows.length === 0) {
    return {
      text: `${header}\n\n━━━━━━━━━━━━━━━━━━━━━\n\nНичего не найдено. Попробуйте изменить фильтр.`,
      attachments: keyboard([
        [cb('⚙️ Фильтры', `f:${encodeState(state)}`), cb('🔀 Сортировка', `k:${encodeState(state)}`)],
        [cb('🏠 В меню', 'm')],
      ]),
    }
  }

  const items = rows.map((lead) => {
    const phone = formatRussianPhone(lead.phone) || lead.phone
    return [
      `━━━━━━━━━━━━━━━━━━━━━`,
      `${typeChip(lead.type)} · **${lead.id}**`,
      `👤 ${plain(lead.name)} · ${phone}`,
      `${statusChip(lead.status)} · 🕒 ${shortTime(lead.created_at)}`,
    ].join('\n')
  })

  // Кнопка на каждую заявку — по две в ряд, чтобы не растягивать клавиатуру
  const leadButtons: MaxInlineButton[][] = []
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2).map((lead) => cb(`${lead.id}`, `v:${lead.id}`))
    leadButtons.push(pair)
  }

  const nav: MaxInlineButton[] = []
  if (state.offset > 0) {
    nav.push(cb('⬅️ Назад', `l:${encodeState({ ...state, offset: Math.max(state.offset - PAGE_SIZE, 0) })}`))
  }
  if (state.offset + PAGE_SIZE < total) {
    nav.push(cb('Вперёд ➡️', `l:${encodeState({ ...state, offset: state.offset + PAGE_SIZE })}`))
  }

  const buttons: MaxInlineButton[][] = [...leadButtons]
  if (nav.length > 0) buttons.push(nav)
  buttons.push([cb('⚙️ Фильтры', `f:${encodeState(state)}`), cb('🔀 Сортировка', `k:${encodeState(state)}`)])
  buttons.push([cb('🏠 В меню', 'm')])

  return { text: `${header}\n\n${items.join('\n\n')}`, attachments: keyboard(buttons) }
}

/* ─────────────────────────── Меню фильтров ─────────────────────────── */

export function filterMenu(state: ListState): { text: string; attachments: MaxAttachment[] } {
  const mark = (active: boolean, label: string) => (active ? `● ${label}` : label)

  const statusRows: MaxInlineButton[][] = [
    [
      cb(mark(state.status === 'all', 'Все статусы'), `l:${encodeState({ ...state, status: 'all', offset: 0 })}`),
    ],
    [
      cb(mark(state.status === 'new', '🆕 Новые'), `l:${encodeState({ ...state, status: 'new', offset: 0 })}`),
      cb(mark(state.status === 'in_progress', '🔧 В работе'), `l:${encodeState({ ...state, status: 'in_progress', offset: 0 })}`),
    ],
    [
      cb(mark(state.status === 'scheduled', '📅 Замер'), `l:${encodeState({ ...state, status: 'scheduled', offset: 0 })}`),
      cb(mark(state.status === 'done', '✅ Закрыты'), `l:${encodeState({ ...state, status: 'done', offset: 0 })}`),
    ],
    [
      cb(mark(state.status === 'rejected', '❌ Отказы'), `l:${encodeState({ ...state, status: 'rejected', offset: 0 })}`),
    ],
    [
      cb(mark(state.type === 'all', 'Любой тип'), `l:${encodeState({ ...state, type: 'all', offset: 0 })}`),
      cb(mark(state.type === 'measurement', '📐 Замер'), `l:${encodeState({ ...state, type: 'measurement', offset: 0 })}`),
      cb(mark(state.type === 'project', '✨ Проект'), `l:${encodeState({ ...state, type: 'project', offset: 0 })}`),
    ],
    [cb('⬅️ К списку', `l:${encodeState(state)}`)],
  ]

  return {
    text: '⚙️ **ФИЛЬТРЫ**\n\nВыберите статус и тип заявок. Точкой отмечено то, что выбрано сейчас.',
    attachments: keyboard(statusRows),
  }
}

export function sortMenu(state: ListState): { text: string; attachments: MaxAttachment[] } {
  const mark = (active: boolean, label: string) => (active ? `● ${label}` : label)
  return {
    text: '🔀 **СОРТИРОВКА**\n\nВ каком порядке показывать заявки?',
    attachments: keyboard([
      [cb(mark(state.sort === 'new_first', '🔽 Сначала новые'), `l:${encodeState({ ...state, sort: 'new_first', offset: 0 })}`)],
      [cb(mark(state.sort === 'old_first', '🔼 Сначала старые'), `l:${encodeState({ ...state, sort: 'old_first', offset: 0 })}`)],
      [cb('⬅️ К списку', `l:${encodeState(state)}`)],
    ]),
  }
}

/* ─────────────────────────── Карточка заявки ─────────────────────────── */

function detailLines(lead: Lead): string[] {
  const d = lead.details ?? {}
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? plain(v).slice(0, 600) : '')
  const lines: string[] = []

  if (lead.type === 'measurement') {
    lines.push(`• Город: **${str(d.city) || 'Москва'}**`)
    lines.push(`• Адрес: **${str(d.address) || 'уточняется'}**`)
    lines.push(`• Дата: **${str(d.date) || 'по согласованию'}**`)
    lines.push(`• Интервал: **${str(d.time) || 'в течение дня'}**`)
    if (str(d.comment)) lines.push(`• Комментарий: «${str(d.comment)}»`)
    return lines
  }

  const a = (typeof d.answers === 'object' && d.answers ? d.answers : {}) as Record<string, unknown>
  const arr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 30).map((x) => plain(x).slice(0, 80)).join(', ') : ''

  if (str(a.projectType)) lines.push(`• Тип проекта: **${str(a.projectType)}**`)
  // Квиз шкафов
  if (str(a.room)) lines.push(`• Где будет шкаф: **${str(a.room)}**`)
  if (str(a.wardrobeType)) lines.push(`• Тип шкафа: **${str(a.wardrobeType)}**`)
  if (str(a.wardrobeWidth)) lines.push(`• Ширина: **${str(a.wardrobeWidth)}**`)
  if (str(a.wardrobeWidthCm)) lines.push(`• Ширина стены: **${str(a.wardrobeWidthCm)} см**`)
  if (str(a.ceilingHeight)) lines.push(`• Высота потолка: **${str(a.ceilingHeight)} см**`)
  if (str(a.layout)) lines.push(`• Конфигурация: **${str(a.layout)}**`)
  if (str(a.kitchenSize)) lines.push(`• Размер кухни: **${str(a.kitchenSize)}**`)
  if (str(a.location)) lines.push(`• Локация: **${str(a.location)}**`)

  const walls = [str(a.wallA), str(a.wallB), str(a.wallC)].filter(Boolean)
  if (walls.length > 0) lines.push(`• Габариты: **${walls.join(' × ')} см**`)
  else if (a.noMeasurements) lines.push('• Габариты: **снимут на замере**')

  if (str(a.style)) lines.push(`• Стиль: **${str(a.style)}**`)
  if (str(a.palette)) lines.push(`• Гамма: **${str(a.palette)}**`)
  if (str(a.facades)) lines.push(`• Фасады: **${str(a.facades)}**`)
  if (str(a.countertop)) lines.push(`• Столешница: **${str(a.countertop)}**`)
  if (str(a.hardware)) lines.push(`• Фурнитура: **${str(a.hardware)}**`)
  if (arr(a.appliances)) lines.push(`• Техника: **${arr(a.appliances)}**`)
  if (arr(a.features)) lines.push(`• Наполнение: **${arr(a.features)}**`)
  if (arr(a.storage)) lines.push(`• Системы хранения: **${arr(a.storage)}**`)
  if (str(a.budget)) lines.push(`• Бюджет: **${str(a.budget)}**`)
  if (str(a.renovationStage)) lines.push(`• Стадия ремонта: **${str(a.renovationStage)}**`)
  if (str(a.timeline)) lines.push(`• Сроки: **${str(a.timeline)}**`)
  if (str(a.contactMethod)) lines.push(`• Как связаться: **${str(a.contactMethod)}**`)
  if (str(a.contactTime)) lines.push(`• Удобное время связи: **${str(a.contactTime)}**`)
  if (str(a.comment)) lines.push(`• Комментарий: «${str(a.comment)}»`)

  lines.push(...fileLines(d))

  return lines
}

/** Вложения клиента: ссылка на каждый файл, чтобы менеджер мог открыть его сразу */
function fileLines(details: Record<string, unknown>): string[] {
  const raw = Array.isArray(details.files) ? details.files : []
  if (raw.length === 0) return []

  const lines = [`• Вложений: **${raw.length} шт.**`]

  for (const item of raw.slice(0, 8)) {
    if (typeof item !== 'object' || !item) continue
    const file = item as { name?: unknown; url?: unknown; pathname?: unknown }
    const name = typeof file.name === 'string' ? plain(file.name).slice(0, 120) || 'файл' : 'файл'
    // Файл приватный: открывается через панель сайта, после входа (/admin/file).
    // Старые заявки — с прямой ссылкой в Vercel Blob, если она действительно туда
    const pathname = typeof file.pathname === 'string' && file.pathname.startsWith('leads/') && !file.pathname.includes('..') ? file.pathname : ''
    const url = pathname
      ? `${siteUrl}/admin/file?path=${encodeURIComponent(pathname)}`
      : typeof file.url === 'string' && isStorageUrl(file.url) ? file.url : ''
    lines.push(url ? `   ↳ ${name}: ${url}` : `   ↳ ${name} — загрузить не удалось, запросите у клиента`)
  }

  return lines
}

export function leadCard(
  lead: Lead,
  baseUrl: string,
  backState?: ListState
): { text: string; attachments: MaxAttachment[] } {
  const phone = formatRussianPhone(lead.phone) || lead.phone
  const digits = lead.phone.replace(/\D/g, '')

  const text = [
    '━━━━━━━━━━━━━━━━━━━━━',
    `${typeChip(lead.type)} · **${lead.id}**`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    `👤 **КЛИЕНТ**\n• Имя: **${plain(lead.name)}**\n• Телефон: **${phone}**`,
    '',
    `📋 **ДЕТАЛИ**\n${detailLines(lead).join('\n')}`,
    '',
    `🏷 **СТАТУС**\n• Сейчас: **${statusChip(lead.status)}**${lead.status_by ? `\n• Изменил: ${lead.status_by}` : ''}`,
    '',
    '─────────────────────',
    `🕒 Создана: ${moscowTime(lead.created_at)} (МСК)`,
  ].join('\n')

  // Кнопки статусов: показываем все, кроме текущего
  const statusButtons: MaxInlineButton[][] = []
  const others = LEAD_STATUSES.filter((s) => s !== lead.status)
  for (let i = 0; i < others.length; i += 2) {
    statusButtons.push(others.slice(i, i + 2).map((s) => cb(STATUS_LABELS[s], `s:${lead.id}:${s}`)))
  }

  const buttons: MaxInlineButton[][] = []
  if (digits) {
    buttons.push([{ type: 'link', text: `📞 Позвонить ${phone}`, url: `${baseUrl}/call?phone=${encodeURIComponent(digits)}` }])
  }
  buttons.push(...statusButtons)
  buttons.push([
    cb('⬅️ К списку', `l:${encodeState(backState ?? DEFAULT_LIST_STATE)}`),
    cb('🏠 В меню', 'm'),
  ])

  return { text, attachments: keyboard(buttons) }
}

/* ─────────────────────────── Статистика ─────────────────────────── */

export function statsCard(stats: {
  today: number
  week: number
  month: number
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
}): { text: string; attachments: MaxAttachment[] } {
  const statusLines = LEAD_STATUSES.filter((s) => (stats.byStatus[s] ?? 0) > 0).map(
    (s) => `• ${STATUS_LABELS[s]}: **${stats.byStatus[s]}**`
  )

  const typeLines = (['measurement', 'project'] as LeadType[])
    .filter((t) => (stats.byType[t] ?? 0) > 0)
    .map((t) => `• ${TYPE_LABELS[t]}: **${stats.byType[t]}**`)

  const text = [
    '📊 **СТАТИСТИКА ЗАЯВОК**',
    '',
    `📅 **ЗА ПЕРИОД**\n• Сегодня: **${stats.today}**\n• За 7 дней: **${stats.week}**\n• За 30 дней: **${stats.month}**\n• Всего: **${stats.total}**`,
    statusLines.length > 0 ? `\n🏷 **ПО СТАТУСАМ**\n${statusLines.join('\n')}` : '',
    typeLines.length > 0 ? `\n📂 **ПО ТИПАМ**\n${typeLines.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    text,
    attachments: keyboard([
      [cb('🆕 Новые заявки', 'l:0:new:all:n')],
      [cb('📋 Все заявки', `l:${encodeState(DEFAULT_LIST_STATE)}`), cb('🏠 В меню', 'm')],
    ]),
  }
}

/* ────────────────── Уведомление о новой заявке ────────────────── */

export function newLeadNotification(lead: Lead, baseUrl: string): { text: string; attachments: MaxAttachment[] } {
  const phone = formatRussianPhone(lead.phone) || lead.phone
  const digits = lead.phone.replace(/\D/g, '')
  const isWardrobe = (lead.details as Record<string, unknown> | null)?.product === 'wardrobe'
  const title =
    lead.type === 'measurement'
      ? '📐 **НОВАЯ ЗАЯВКА НА ЗАМЕР**'
      : isWardrobe
        ? '🚪 **НОВЫЙ РАСЧЁТ ШКАФА**'
        : '✨ **НОВЫЙ РАСЧЁТ ДИЗАЙН-ПРОЕКТА**'

  const text = [
    '━━━━━━━━━━━━━━━━━━━━━',
    title,
    `№ **${lead.id}**`,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    `👤 **КЛИЕНТ**\n• Имя: **${plain(lead.name)}**\n• Телефон: **${phone}**`,
    '',
    `📋 **ДЕТАЛИ**\n${detailLines(lead).join('\n')}`,
    '',
    // Заявка с сайта время не занимает: слот в календаре блокируется только
    // после подтверждения. Напоминаем об этом прямо в уведомлении
    ...(lead.type === 'measurement'
      ? ['⏳ **Ждёт подтверждения.** Время в календаре не занято, пока вы не подтвердите замер.', '']
      : []),
    '─────────────────────',
    `🕒 ${moscowTime(lead.created_at)} (МСК)`,
    `🌐 Источник: сайт «Модуль Эстет»`,
  ].join('\n')

  const buttons: MaxInlineButton[][] = []
  if (digits) {
    buttons.push([{ type: 'link', text: `📞 Позвонить ${phone}`, url: `${baseUrl}/call?phone=${encodeURIComponent(digits)}` }])
  }
  buttons.push([cb('🔧 Взять в работу', `s:${lead.id}:in_progress`), cb('❌ Отказ', `s:${lead.id}:rejected`)])
  buttons.push([cb('📄 Открыть заявку', `v:${lead.id}`), cb('📋 Все заявки', `l:${encodeState(DEFAULT_LIST_STATE)}`)])
  // Полная карточка со всеми ответами квиза и файлами клиента — в веб-панели.
  // Там же подтверждается замер
  buttons.push([
    {
      type: 'link',
      text: lead.type === 'measurement' ? '✅ Подтвердить замер в панели' : '💻 Карточка в панели',
      url: `${baseUrl}/admin/leads/${encodeURIComponent(lead.id)}`,
    },
  ])

  return { text, attachments: keyboard(buttons) }
}

/* ────────────────── Напоминания ────────────────── */

/**
 * Список заявок, по которым менеджер сам назначил себе связаться сегодня.
 * Кнопки ведут сразу в карточку — чтобы перезвонить можно было из уведомления,
 * не открывая панель.
 */
export function reminderCard(leads: Lead[]): { text: string; attachments: MaxAttachment[] } {
  const rows = leads
    .slice(0, 10)
    .map((l) => `• ${typeChip(l.type)} **${l.id}** — ${plain(l.name)},${formatRussianPhone(l.phone) || l.phone}`)

  const text = [
    '⏰ **ПОРА СВЯЗАТЬСЯ**',
    '',
    `Напоминаний на сегодня: **${leads.length}**`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    rows.join('\n'),
    leads.length > 10 ? `\n_…и ещё ${leads.length - 10}_` : '',
  ]
    .filter(Boolean)
    .join('\n')

  // По кнопке на каждую заявку, но не больше пяти — иначе клавиатура
  // разрастается и в ней теряется смысл
  const buttons: MaxInlineButton[][] = leads
    .slice(0, 5)
    .map((l) => [cb(`📄 ${l.id} — ${l.name}`.slice(0, 60), `v:${l.id}`)])
  buttons.push([cb('📋 Все заявки', `l:${encodeState(DEFAULT_LIST_STATE)}`), cb('🏠 В меню', 'm')])

  return { text, attachments: keyboard(buttons) }
}

/* ────────────────── Утренняя сводка ────────────────── */

export function digestCard(leads: Lead[], stats: { today: number; week: number }): { text: string; attachments: MaxAttachment[] } {
  if (leads.length === 0) {
    return {
      text: '☀️ **СВОДКА ЗА СУТКИ**\n\nНовых заявок за последние 24 часа не было.',
      attachments: keyboard([[cb('📊 Статистика', 'st'), cb('🏠 В меню', 'm')]]),
    }
  }

  const rows = leads
    .slice(0, 15)
    .map((l) => `• ${typeChip(l.type)} **${l.id}** — ${plain(l.name)},${formatRussianPhone(l.phone) || l.phone} · ${statusChip(l.status)}`)

  const newCount = leads.filter((l) => l.status === 'new').length

  const text = [
    '☀️ **СВОДКА ЗА СУТКИ**',
    '',
    `Всего заявок: **${leads.length}**${newCount > 0 ? `, из них необработанных: **${newCount}**` : ''}`,
    `За 7 дней: **${stats.week}**`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    rows.join('\n'),
    leads.length > 15 ? `\n_…и ещё ${leads.length - 15}_` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return {
    text,
    attachments: keyboard([
      [cb('🆕 Необработанные', 'l:0:new:all:n')],
      [cb('📋 Все заявки', `l:${encodeState(DEFAULT_LIST_STATE)}`), cb('📊 Статистика', 'st')],
    ]),
  }
}
