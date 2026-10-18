import { randomInt } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeRussianPhone } from '@/lib/phone'
import { sendMaxMessage } from '@/lib/max-bot'
import { newLeadNotification } from '@/lib/max-ui'
import {
  countLeadsFromIp,
  countMeasurementsFromIp,
  countUpcomingMeasurements,
  createLead,
  findRecentDuplicate,
  getLead,
  isDbConfigured,
  isSlotFull,
  type Lead,
  type LeadType,
  type LeadUtm,
} from '@/lib/db'
import { SLOT_VALUES, moscowToday, slotCapacity, slotLabel } from '@/lib/measurement-slots'
import { allowRequest, clientIp } from '@/lib/request-guard'
import { siteUrl } from '@/lib/seo'

// node:https и node:crypto требуют Node-рантайма, на Edge роут молча падал бы
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Быстрее этого форму заполняет только робот */
const MIN_FILL_MS = 3000
/** Не больше стольких заявок с одного IP за окно */
const RATE_LIMIT = 5
const RATE_WINDOW_MINUTES = 60
/** Повторная заявка с тем же телефоном в этом окне считается дублем */
const DEDUPE_MINUTES = 10
/**
 * Первый заслон — счётчик в памяти: срабатывает до обращения к базе и
 * работает, даже когда база недоступна. Шире, чем лимит по базе: сюда
 * попадают и отсеянные попытки
 */
const BURST_LIMIT = 12
const BURST_WINDOW_MS = 10 * 60_000
/**
 * Записей на замер с одного адреса за сутки и предстоящих замеров на один
 * телефон. По адресу — три, а не одна: у мобильных операторов один IP делят
 * разные люди
 */
const MEASUREMENTS_PER_IP_DAY = 3
const MEASUREMENTS_PER_PHONE = 2
/** Ответы квиза с запасом укладываются в несколько килобайт */
const MAX_DETAILS_BYTES = 20_000
/** Столько файлов принимает квиз */
const MAX_FILES = 8

/** Убирает из телефона всё, кроме последних цифр, — в журнале сервера полный номер не нужен */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.length > 4 ? `…${digits.slice(-4)}` : '…'
}

/**
 * Список файлов присылает браузер, поэтому верить ему нельзя: вместо ссылки
 * на наше хранилище там может оказаться любой адрес, который менеджер потом
 * откроет из уведомления. Оставляем только файлы из папки заявок
 */
function cleanFiles(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return []
  const files: Array<Record<string, unknown>> = []

  for (const item of value.slice(0, MAX_FILES)) {
    if (!item || typeof item !== 'object') continue
    const raw = item as Record<string, unknown>
    const pathname = typeof raw.pathname === 'string' ? raw.pathname : ''
    const url = typeof raw.url === 'string' ? raw.url : ''

    const file: Record<string, unknown> = {
      name: text(raw.name, 160) || 'файл',
      size: typeof raw.size === 'number' && Number.isFinite(raw.size) ? raw.size : 0,
      type: text(raw.type, 80),
    }
    if (pathname.startsWith('leads/') && !pathname.includes('..') && pathname.length <= 300) file.pathname = pathname
    if (isStorageUrl(url)) file.url = url
    files.push(file)
  }

  return files
}

function isStorageUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname.endsWith('.blob.vercel-storage.com')
  } catch {
    return false
  }
}

type LeadPayload = {
  type?: unknown
  name?: unknown
  phone?: unknown
  website?: unknown
  startedAt?: unknown
  details?: unknown
  attribution?: unknown
}

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

/** Разбирает метки источника из тела запроса. Всё чужое и слишком длинное отбрасывается. */
function parseAttribution(value: unknown): { utm: LeadUtm | null; referrer: string | null; landingPage: string | null } {
  const empty = { utm: null, referrer: null, landingPage: null }
  if (!value || typeof value !== 'object') return empty

  const raw = value as { utm?: unknown; referrer?: unknown; landingPage?: unknown }
  const utm: LeadUtm = {}

  if (raw.utm && typeof raw.utm === 'object') {
    for (const key of ['source', 'medium', 'campaign', 'term', 'content'] as const) {
      const item = (raw.utm as Record<string, unknown>)[key]
      if (typeof item === 'string' && item.trim()) utm[key] = item.trim().slice(0, 120)
    }
  }

  return {
    utm: Object.keys(utm).length > 0 ? utm : null,
    referrer: text(raw.referrer, 300) || null,
    landingPage: text(raw.landingPage, 300) || null,
  }
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request)
  if (!allowRequest('leads', ip, BURST_LIMIT, BURST_WINDOW_MS)) {
    console.warn(`[Leads] Отклонено: слишком частые обращения с IP ${ip}`)
    return NextResponse.json(
      { error: 'Вы отправили слишком много заявок подряд. Позвоните нам — ответим сразу.' },
      { status: 429 }
    )
  }

  let payload: LeadPayload
  try {
    payload = (await request.json()) as LeadPayload
  } catch (err) {
    console.error('[Leads] Ошибка разбора JSON:', err)
    return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 })
  }

  const type: LeadType | null =
    payload.type === 'measurement' || payload.type === 'project' ? payload.type : null
  // В квизе имя необязательно: чтобы получить расчёт, достаточно телефона
  const rawName = text(payload.name, 80) || (payload.type === 'project' ? 'Имя не указано' : '')
  const rawPhone = text(payload.phone, 40)
  const phone = normalizeRussianPhone(rawPhone) || rawPhone
  const website = text(payload.website, 200)

  // Боту отвечаем так же, как человеку: он не должен понять, что отсеян
  const fakeOk = () => NextResponse.json({ ok: true, id: `МЭ-${Date.now().toString(36).toUpperCase()}` })

  // Honeypot: скрытое поле, которое видят только боты
  if (website) {
    console.log('[Leads] Отклонено: заполнено honeypot-поле website')
    return fakeOk()
  }

  // Обе формы сайта присылают время начала заполнения. Запрос без него собран
  // не нашей страницей. Отвечаем ошибкой, а не молчим: если это всё-таки
  // человек со старой вкладкой, он увидит просьбу обновить страницу
  const startedAt = typeof payload.startedAt === 'number' && Number.isFinite(payload.startedAt) ? payload.startedAt : 0
  if (startedAt <= 0) {
    console.log('[Leads] Отклонено: нет времени начала заполнения формы')
    return NextResponse.json(
      { error: 'Не удалось отправить заявку. Обновите страницу и попробуйте ещё раз или позвоните нам.' },
      { status: 400 }
    )
  }

  // Слишком быстрое заполнение — человек физически не успевает пройти форму
  const elapsed = Date.now() - startedAt
  if (elapsed >= 0 && elapsed < MIN_FILL_MS) {
    console.log(`[Leads] Отклонено: форма заполнена за ${elapsed} мс`)
    return fakeOk()
  }

  if (!type || rawName.length < 2 || !phone) {
    console.warn('[Leads] Не заполнены обязательные поля:', { type, nameLength: rawName.length, hasPhone: Boolean(phone) })
    return NextResponse.json({ error: 'Пожалуйста, укажите имя и корректный номер телефона.' }, { status: 400 })
  }

  const details =
    payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
      ? { ...(payload.details as Record<string, unknown>) }
      : {}
  if ('files' in details) details.files = cleanFiles(details.files)

  // Ответы формы — это короткие строки. Большое тело — не заявка, а попытка
  // забить базу и уведомления
  if (JSON.stringify(details).length > MAX_DETAILS_BYTES) {
    console.warn(`[Leads] Отклонено: слишком большой объём данных с IP ${ip}`)
    return NextResponse.json({ error: 'Слишком длинный текст в заявке. Сократите комментарий и попробуйте ещё раз.' }, { status: 413 })
  }

  const prefix = type === 'measurement' ? 'ЗМ' : 'ПР'
  const id = `${prefix}-${new Date().getFullYear()}-${randomInt(1000, 10_000)}`

  // Ограничение частоты и защита от дублей. Если база недоступна, пропускаем
  // проверки — потерять настоящую заявку хуже, чем принять лишнюю.
  if (isDbConfigured()) {
    try {
      const recent = await countLeadsFromIp(ip, RATE_WINDOW_MINUTES)
      if (recent >= RATE_LIMIT) {
        console.warn(`[Leads] Отклонено: с IP ${ip} уже ${recent} заявок за ${RATE_WINDOW_MINUTES} мин`)
        return NextResponse.json(
          { error: 'Вы отправили слишком много заявок подряд. Позвоните нам — ответим сразу.' },
          { status: 429 }
        )
      }

      const product = details.product === 'wardrobe' ? 'wardrobe' : 'kitchen'
      const duplicate = await findRecentDuplicate(phone, type, DEDUPE_MINUTES, product)
      if (duplicate) {
        console.log(`[Leads] Дубль заявки ${duplicate.id}, повторное уведомление не отправляем`)
        return NextResponse.json({ ok: true, id: duplicate.id, saved: true, delivered: true, duplicate: true })
      }

      // Запись на замер занимает слот в расписании, поэтому одному адресу и
      // одному телефону много записей не даём: иначе расписание можно забить
      // фальшивками. Настоящему клиенту, которому нужно больше, проще позвонить
      if (type === 'measurement') {
        const [fromIp, upcoming] = await Promise.all([
          countMeasurementsFromIp(ip, 24),
          countUpcomingMeasurements(phone, moscowToday()),
        ])
        if (fromIp >= MEASUREMENTS_PER_IP_DAY || upcoming >= MEASUREMENTS_PER_PHONE) {
          console.warn(`[Leads] Отклонено: лимит записей на замер (IP ${ip}: ${fromIp} за сутки, на телефон: ${upcoming})`)
          return NextResponse.json(
            { error: 'Вы уже записаны на замер. Чтобы изменить время или записаться ещё раз, позвоните нам — поможем сразу.' },
            { status: 429 }
          )
        }
      }

      // Слот могли подтвердить другому клиенту, пока человек заполнял форму, —
      // форма показывает занятость на момент открытия. Последнее слово за
      // сервером. Сама заявка время не занимает: слот блокируется только
      // после подтверждения замера в панели
      if (type === 'measurement') {
        const date = typeof (payload.details as Record<string, unknown>)?.date === 'string'
          ? String((payload.details as Record<string, unknown>).date)
          : ''
        const slot = typeof (payload.details as Record<string, unknown>)?.time === 'string'
          ? String((payload.details as Record<string, unknown>).time)
          : ''

        if (/^\d{4}-\d{2}-\d{2}$/.test(date) && SLOT_VALUES.includes(slot)) {
          const full = await isSlotFull(date, slot, slotCapacity())
          if (full) {
            console.warn(`[Leads] Слот ${date} ${slot} уже занят, заявка отклонена`)
            return NextResponse.json(
              {
                error: `К сожалению, ${slotLabel(slot).toLowerCase()} на эту дату уже занято. Выберите другое время — свободные варианты обновились.`,
                slotTaken: true,
              },
              { status: 409 }
            )
          }
        }
      }
    } catch (error) {
      console.error('[Leads] Проверка антиспама не отработала, пропускаем заявку:', error)
    }
  }

  // Имя и полный телефон в журнал не пишем: журнал сервера — не место для
  // персональных данных, заявка целиком лежит в базе
  console.log(`[Leads] Обработка заявки ${id} (${type}), телефон ${maskPhone(phone)}`)

  // 1. Сохраняем заявку. Это важнее уведомления: даже если MAX недоступен,
  //    заявка не потеряется и будет видна в списке.
  let lead: Lead | null = null
  let saved = false

  const attribution = parseAttribution(payload.attribution)
  const userAgent = request.headers.get('user-agent')?.slice(0, 400) ?? null
  // Заголовок referer — запасной вариант, если клиент не прислал метки
  const referrer = attribution.referrer || request.headers.get('referer')?.slice(0, 300) || null

  if (isDbConfigured()) {
    try {
      await createLead({
        id,
        type,
        name: rawName,
        phone,
        details,
        ip,
        utm: attribution.utm,
        referrer,
        landingPage: attribution.landingPage,
        userAgent,
      })
      lead = await getLead(id)
      saved = true
    } catch (error) {
      console.error(`[Leads] НЕ УДАЛОСЬ СОХРАНИТЬ заявку ${id} в базу:`, error)
    }
  } else {
    console.warn('[Leads] DATABASE_URL не задан — заявка не будет сохранена, только отправлена в MAX')
  }

  // Если база недоступна, собираем объект вручную, чтобы уведомление всё равно ушло
  if (!lead) {
    lead = {
      id,
      type,
      name: rawName,
      phone,
      phone_digits: phone.replace(/\D/g, ''),
      status: 'new',
      details,
      ip,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_by: null,
      utm: attribution.utm,
      referrer,
      landing_page: attribution.landingPage,
      user_agent: userAgent,
      assigned_to: null,
      reject_reason: null,
      deal_amount: null,
      next_contact_at: null,
      first_response_at: null,
      reminder_sent_at: null,
    }
  }

  // 2. Уведомляем менеджеров в MAX
  let delivered = false
  let deliveryError: string | undefined

  try {
    // Адрес сайта берём из настроек, а не из заголовка Host: его присылает
    // клиент, и ссылки в уведомлении менеджеру вели бы куда он захочет
    const { text: notifyText, attachments } = newLeadNotification(lead, siteUrl)
    const maxResult = await sendMaxMessage({ text: notifyText, format: 'markdown', attachments })

    delivered = maxResult.ok
    if (!maxResult.ok) {
      deliveryError = maxResult.error
      console.error(`[Leads] ЗАЯВКА ${id} НЕ ДОСТАВЛЕНА В MAX:`, maxResult.error, maxResult.attempts)
    } else {
      console.log(`[Leads] Заявка ${id} доставлена в Max через ${maxResult.via}`)
    }
  } catch (error) {
    deliveryError = error instanceof Error ? error.message : String(error)
    console.error(`[Leads] Ошибка при вызове sendMaxMessage для ${id}:`, error)
  }

  return NextResponse.json({
    ok: true,
    id,
    saved,
    delivered,
    ...(deliveryError && process.env.NODE_ENV !== 'production' ? { deliveryError } : {}),
  })
}
