import { NextRequest, NextResponse } from 'next/server'
import { answerMaxCallback, sendMaxMessage, isMaxAdmin } from '@/lib/max-bot'
import {
  getLead,
  getStats,
  listLeads,
  measurementConfirmError,
  setLeadStatus,
  rememberBotUser,
  isDbConfigured,
  CONFIRMED_STATUS,
  LEAD_STATUSES,
  type LeadStatus,
} from '@/lib/db'
import {
  DEFAULT_LIST_STATE,
  PAGE_SIZE,
  decodeState,
  encodeState,
  filterMenu,
  leadCard,
  leadList,
  mainMenu,
  sortMenu,
  statsCard,
  type ListState,
} from '@/lib/max-ui'
import { getClientByMaxUser } from '@/lib/cabinet-db'
import { linkMaxByPayload, linkMaxByText } from '@/lib/cabinet-max'
import { cabinetUrl } from '@/lib/cabinet-notify'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function baseUrl(request: NextRequest): string {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  if (!host || host.includes('localhost') || host.includes('127.0.0.1')) return 'https://module-estet.ru'
  return `${proto}://${host}`
}

type Screen = { text: string; attachments: ReturnType<typeof leadList>['attachments'] }

async function renderList(state: ListState): Promise<Screen> {
  const { rows, total } = await listLeads({
    status: state.status,
    type: state.type,
    sort: state.sort,
    search: state.search,
    limit: PAGE_SIZE,
    offset: state.offset,
  })
  return leadList(rows, total, state)
}

async function renderMenu(): Promise<Screen> {
  const { total } = await listLeads({ status: 'new', limit: 1 })
  return mainMenu(total)
}

/** Разбирает payload кнопки в экран, который надо показать */
async function screenForPayload(payload: string, url: string, actor: string): Promise<Screen & { toast?: string }> {
  const [action, ...rest] = payload.split(':')

  if (action === 'm') return renderMenu()

  if (action === 'st') return statsCard(await getStats())

  if (action === 'l') return renderList(decodeState(rest.join(':')))

  if (action === 'f') return filterMenu(decodeState(rest.join(':')))

  if (action === 'k') return sortMenu(decodeState(rest.join(':')))

  if (action === 'v') {
    const lead = await getLead(rest.join(':'))
    if (!lead) return { text: '❌ Заявка не найдена — возможно, она была удалена.', attachments: [] }
    return leadCard(lead, url)
  }

  if (action === 's') {
    const status = rest.pop() as LeadStatus
    const id = rest.join(':')
    if (!LEAD_STATUSES.includes(status)) {
      return { text: '❌ Неизвестный статус.', attachments: [] }
    }
    // «Замер назначен» занимает время в календаре — проверка та же, что в панели
    if (status === CONFIRMED_STATUS) {
      const current = await getLead(id)
      if (!current) return { text: '❌ Заявка не найдена.', attachments: [] }
      const problem = await measurementConfirmError(current)
      if (problem) return { ...leadCard(current, url), toast: 'Время занято — перенесите замер в панели' }
    }

    const lead = await setLeadStatus(id, status, actor)
    if (!lead) return { text: '❌ Заявка не найдена.', attachments: [] }
    return { ...leadCard(lead, url), toast: 'Статус обновлён' }
  }

  return renderMenu()
}

/** Ответ после привязки MAX к кабинету (или если ссылка устарела) */
function cabinetLinkedMessage(client: { name: string } | null, userId: string) {
  if (!client) {
    return {
      text: '⚠️ Ссылка для привязки устарела или уже использована. Откройте «Профиль» в личном кабинете и нажмите «Привязать MAX» ещё раз.',
      userId,
      chatId: '',
    }
  }
  return {
    text: `✅ ${client.name}, MAX привязан к личному кабинету «Модуль Эстет».\n\nСюда будут приходить новости по заказу, а вход в кабинет — кодом из этого чата.`,
    userId,
    chatId: '',
    attachments: keyboardLink('Открыть кабинет', cabinetUrl()),
  }
}

/**
 * Ответ не-сотруднику. Клиенту с привязанным кабинетом — ссылка в кабинет,
 * остальным — подсказка и идентификатор (его просят, когда подключают
 * нового менеджера к уведомлениям о заявках).
 */
async function guestMessage(userId: string) {
  const client = isDbConfigured() ? await getClientByMaxUser(userId).catch(() => null) : null
  if (client) {
    return {
      text: `${client.name}, здравствуйте! Это бот «Модуль Эстет». Здесь появляются новости по вашему заказу, а всё по заказу — в личном кабинете.`,
      userId,
      chatId: '',
      attachments: keyboardLink('Открыть кабинет', cabinetUrl()),
    }
  }
  return {
    text: `👋 Здравствуйте! Это бот компании «Модуль Эстет».\n\nЕсли вы наш клиент — привяжите MAX в личном кабинете (раздел «Профиль») или отправьте сюда код привязки вида ME-XXXXXX.\n\nДля сотрудников: ваш идентификатор **${userId}** — передайте его администратору сайта.`,
    userId,
    chatId: '',
  }
}

function keyboardLink(text: string, url: string) {
  return [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'link' as const, text, url }]] } }]
}

export async function POST(request: NextRequest) {
  // Проверка секрета, если он задан при подписке
  const secret = process.env.MAX_WEBHOOK_SECRET
  if (secret && request.headers.get('x-max-bot-api-secret') !== secret) {
    console.warn('[Max Webhook] Отклонён запрос с неверным секретом')
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: Record<string, any>
  try {
    update = await request.json()
  } catch {
    return NextResponse.json({ ok: true })
  }

  const url = baseUrl(request)

  try {
    const type = update?.update_type

    /* ── Пользователь нажал «Начать» ── */
    if (type === 'bot_started') {
      const user = update.user ?? {}
      if (isDbConfigured() && user.user_id) {
        await rememberBotUser(String(user.user_id), user.name ?? user.first_name ?? null, update.chat_id ? String(update.chat_id) : null)
      }

      // Клиент пришёл по ссылке «Привязать MAX» из личного кабинета
      const payload = typeof update.payload === 'string' ? update.payload : ''
      if (payload && isDbConfigured() && user.user_id) {
        const client = await linkMaxByPayload(payload, String(user.user_id))
        await sendMaxMessage(cabinetLinkedMessage(client, String(user.user_id)))
        if (client || !isMaxAdmin(user.user_id)) return NextResponse.json({ ok: true })
      }

      if (!isMaxAdmin(user.user_id)) {
        await sendMaxMessage(await guestMessage(String(user.user_id)))
        return NextResponse.json({ ok: true })
      }

      const screen = await renderMenu()
      await sendMaxMessage({ text: screen.text, attachments: screen.attachments, userId: String(user.user_id), chatId: '' })
      return NextResponse.json({ ok: true })
    }

    /* ── Нажатие inline-кнопки ── */
    if (type === 'message_callback') {
      const callback = update.callback ?? {}
      const user = callback.user ?? {}
      const callbackId = callback.callback_id

      if (!isMaxAdmin(user.user_id)) {
        if (callbackId) await answerMaxCallback(callbackId, undefined, 'Нет доступа')
        return NextResponse.json({ ok: true })
      }
      if (!isDbConfigured()) {
        if (callbackId) await answerMaxCallback(callbackId, undefined, 'Хранилище не настроено')
        return NextResponse.json({ ok: true })
      }

      const actor = user.name ?? user.first_name ?? String(user.user_id ?? '')
      const screen = await screenForPayload(String(callback.payload ?? 'm'), url, actor)

      if (callbackId) {
        await answerMaxCallback(
          callbackId,
          { text: screen.text, format: 'markdown', attachments: screen.attachments },
          screen.toast
        )
      }
      return NextResponse.json({ ok: true })
    }

    /* ── Обычное текстовое сообщение ── */
    if (type === 'message_created') {
      const message = update.message ?? {}
      const sender = message.sender ?? {}
      const text = String(message.body?.text ?? '').trim()

      if (sender.is_bot || !sender.user_id) return NextResponse.json({ ok: true })

      if (isDbConfigured()) {
        await rememberBotUser(
          String(sender.user_id),
          sender.name ?? sender.first_name ?? null,
          message.recipient?.chat_id ? String(message.recipient.chat_id) : null
        )
      }

      const reply = async (screen: Screen) =>
        sendMaxMessage({ text: screen.text, attachments: screen.attachments, userId: String(sender.user_id), chatId: '' })

      if (!isMaxAdmin(sender.user_id)) {
        // Код привязки «ME-XXXXXX», если ссылка из кабинета не открылась
        const client = isDbConfigured() ? await linkMaxByText(text, String(sender.user_id)) : null
        await sendMaxMessage(client ? cabinetLinkedMessage(client, String(sender.user_id)) : await guestMessage(String(sender.user_id)))
        return NextResponse.json({ ok: true })
      }

      if (!isDbConfigured()) {
        await reply({
          text: '⚠️ Хранилище заявок не настроено: не задана переменная DATABASE_URL. Список заявок недоступен.',
          attachments: [],
        })
        return NextResponse.json({ ok: true })
      }

      const lower = text.toLowerCase()

      if (!text || lower === '/start' || lower === 'меню' || lower === '/menu') {
        await reply(await renderMenu())
      } else if (lower === '/leads' || lower === 'заявки' || lower === 'список') {
        await reply(await renderList({ ...DEFAULT_LIST_STATE }))
      } else if (lower === '/stats' || lower === 'статистика') {
        await reply(statsCard(await getStats()))
      } else if (lower === '/help' || lower === 'помощь') {
        await reply({
          text: [
            '❓ **КАК ПОЛЬЗОВАТЬСЯ**',
            '',
            '• `Меню` — главный экран',
            '• `Заявки` — список со всеми фильтрами',
            '• `Статистика` — сводка по периодам',
            '',
            'Чтобы найти клиента, просто отправьте его **номер телефона** или **имя** — покажу все его заявки.',
          ].join('\n'),
          attachments: [],
        })
      } else {
        // Любой другой текст — поиск
        const state: ListState = { ...DEFAULT_LIST_STATE, search: text.slice(0, 60) }
        const screen = await renderList(state)
        await reply(screen)
      }

      return NextResponse.json({ ok: true })
    }
  } catch (error) {
    console.error('[Max Webhook] Ошибка обработки события:', error)
  }

  // MAX ждёт 200 в течение 30 секунд, иначе снимет подписку
  return NextResponse.json({ ok: true })
}

export async function GET() {
  return NextResponse.json({ ok: true, info: 'MAX webhook endpoint. Использует POST.' })
}
