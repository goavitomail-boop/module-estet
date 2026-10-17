import https from 'node:https'
import { URL } from 'node:url'

/**
 * Интеграция с ботом платформы MAX для отправки заявок с сайта
 * Бот: Кухни Модуль Эстет (@id502765269958_bot)
 * Документация: https://dev.max.ru/docs-api/methods/POST/messages
 *
 * Важные особенности API MAX (частые причины «заявки не приходят»):
 *  - Токен передаётся в заголовке Authorization БЕЗ префикса «Bearer».
 *  - Личный диалог с ботом адресуется ТОЛЬКО через user_id.
 *    Для лички chat_id не работает и возвращает 404 chat.not.found.
 *  - user_id — это внутренний id платформы, его можно узнать только из
 *    входящего события (GET /updates или webhook), а не из веб-ссылки профиля.
 *  - Бот не может написать первым: получатель обязан открыть диалог с ботом
 *    и нажать «Начать» хотя бы один раз.
 *  - Лимит текста — 4000 символов, не больше 2 сообщений в секунду в один диалог.
 */

export interface MaxInlineButton {
  type: 'link' | 'callback'
  text: string
  url?: string
  payload?: string
}

export interface MaxAttachment {
  type: string
  payload: {
    buttons?: MaxInlineButton[][]
    [key: string]: unknown
  }
}

export interface MaxSendMessageOptions {
  text: string
  format?: 'markdown' | 'html'
  attachments?: MaxAttachment[]
  userId?: string | number
  chatId?: string | number
  token?: string
}

export interface MaxSendMessageResult {
  ok: boolean
  status?: number
  error?: string
  data?: unknown
  /** Через какой вариант отправки сообщение реально ушло */
  via?: string
  /** Все неудачные попытки — для диагностики */
  attempts?: Array<{ target: string; status: number; error: string }>
}

export const MAX_API_BASE = process.env.MAX_API_BASE?.trim() || 'https://platform-api2.max.ru'

const MAX_TEXT_LIMIT = 4000

/** Убирает markdown-разметку для последней plain-text попытки */
function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*([\s\S]+?)\*\*/g, '$1')
    .replace(/__([\s\S]+?)__/g, '$1')
    .replace(/`{1,3}/g, '')
    .replace(/^\s*[>#]+\s?/gm, '')
}

export function maxRequest(
  path: string,
  token: string,
  method: 'GET' | 'POST' | 'DELETE' = 'POST',
  payload?: unknown
): Promise<{ ok: boolean; status: number; data: unknown; raw: string }> {
  return new Promise((resolve) => {
    try {
      const url = new URL(path.startsWith('http') ? path : `${MAX_API_BASE}${path}`)
      const postData = payload === undefined ? '' : JSON.stringify(payload)

      const headers: Record<string, string | number> = {
        // Токен передаётся «как есть», без Bearer — иначе 401 «No access token»
        Authorization: token,
      }
      if (postData) {
        headers['Content-Type'] = 'application/json'
        headers['Content-Length'] = Buffer.byteLength(postData)
      }

      const options: https.RequestOptions = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method,
        // API MAX использует сертификаты Минцифры РФ, которых нет в store хостинга.
        // Отключение проверки можно выключить, задав MAX_STRICT_TLS=1.
        rejectUnauthorized: process.env.MAX_STRICT_TLS === '1',
        headers,
        timeout: 15000,
      }

      const req = https.request(options, (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => {
          let parsed: unknown = null
          try {
            parsed = JSON.parse(body)
          } catch {
            parsed = body
          }
          const status = res.statusCode || 500
          resolve({ ok: status >= 200 && status < 300, status, data: parsed, raw: body })
        })
      })

      req.on('error', (err) => {
        resolve({ ok: false, status: 0, data: null, raw: `NETWORK: ${err.message}` })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ ok: false, status: 504, data: null, raw: 'Request timed out' })
      })

      if (postData) req.write(postData)
      req.end()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      resolve({ ok: false, status: 0, data: null, raw: msg })
    }
  })
}

/** Получить информацию о боте — быстрая проверка, что токен валиден */
export async function getMaxBotInfo(token = process.env.MAX_BOT_TOKEN) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest('/me', token, 'GET')
}

/** Список чатов бота (только групповые чаты и каналы, личных диалогов здесь нет) */
export async function getMaxChats(token = process.env.MAX_BOT_TOKEN) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest('/chats', token, 'GET')
}

/**
 * Непрочитанные события бота. Именно отсюда берётся настоящий user_id получателя:
 * получатель пишет боту «привет», после чего его user_id виден в updates.
 */
export async function getMaxUpdates(token = process.env.MAX_BOT_TOKEN, limit = 50) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest(`/updates?limit=${limit}&timeout=0`, token, 'GET')
}

/**
 * Активные подписки-вебхуки бота. Если подписка есть, платформа шлёт события
 * на неё, и GET /updates всегда возвращает пустой список — узнать user_id
 * через long polling в этом случае невозможно.
 */
export async function getMaxSubscriptions(token = process.env.MAX_BOT_TOKEN) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest('/subscriptions', token, 'GET')
}

/** Удаляет подписку-вебхук, чтобы освободить очередь событий для long polling */
export async function deleteMaxSubscription(url: string, token = process.env.MAX_BOT_TOKEN) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest(`/subscriptions?url=${encodeURIComponent(url)}`, token, 'DELETE')
}

/** Подписывает вебхук на события бота */
export async function subscribeMaxWebhook(url: string, secret?: string, token = process.env.MAX_BOT_TOKEN) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  return maxRequest('/subscriptions', token, 'POST', {
    url,
    update_types: ['message_created', 'message_callback', 'bot_started'],
    ...(secret ? { secret } : {}),
  })
}

/**
 * Ответ на нажатие inline-кнопки. Если передать message, MAX заменит
 * им исходное сообщение — так работает навигация «на месте», без спама в чат.
 */
export async function answerMaxCallback(
  callbackId: string,
  message?: { text: string; format?: string; attachments?: MaxAttachment[] },
  notification?: string,
  token = process.env.MAX_BOT_TOKEN
) {
  if (!token) return { ok: false, status: 0, data: null, raw: 'MAX_BOT_TOKEN is not configured' }
  const body: Record<string, unknown> = {}
  if (message) body.message = { ...message, format: message.format ?? 'markdown' }
  if (notification) body.notification = notification
  return maxRequest(`/answers?callback_id=${encodeURIComponent(callbackId)}`, token, 'POST', body)
}

/** Список user_id, которым разрешено управлять заявками через бота */
export function adminUserIds(): string[] {
  return parseRecipients(process.env.MAX_NOTIFY_USER_ID)
}

export function isMaxAdmin(userId: string | number | undefined | null): boolean {
  if (userId === undefined || userId === null) return false
  return adminUserIds().includes(String(userId))
}

/** Разбирает список получателей из строки вида "123, 456" */
function parseRecipients(value: string | number | undefined): string[] {
  if (value === undefined || value === null) return []
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export async function sendMaxMessage({
  text,
  format = 'markdown',
  attachments,
  userId = process.env.MAX_NOTIFY_USER_ID,
  chatId = process.env.MAX_NOTIFY_CHAT_ID,
  token = process.env.MAX_BOT_TOKEN,
}: MaxSendMessageOptions): Promise<MaxSendMessageResult> {
  if (!token) {
    console.error('[Max API] MAX_BOT_TOKEN не задан в переменных окружения — заявки не будут доставляться')
    return { ok: false, error: 'MAX_BOT_TOKEN is not configured' }
  }

  const userIds = parseRecipients(userId)
  const chatIds = parseRecipients(chatId)

  if (userIds.length === 0 && chatIds.length === 0) {
    console.error('[Max API] Не задан ни MAX_NOTIFY_USER_ID, ни MAX_NOTIFY_CHAT_ID — некуда отправлять заявку')
    return { ok: false, error: 'MAX_NOTIFY_USER_ID / MAX_NOTIFY_CHAT_ID are not configured' }
  }

  const safeText = text.length > MAX_TEXT_LIMIT ? `${text.slice(0, MAX_TEXT_LIMIT - 1)}…` : text
  const plainText = stripMarkdown(safeText).slice(0, MAX_TEXT_LIMIT)

  // Личный диалог адресуется user_id, групповой чат — chat_id. Личку пробуем первой.
  const targets = [
    ...userIds.map((id) => ({ label: `user_id=${id}`, query: `user_id=${encodeURIComponent(id)}` })),
    ...chatIds.map((id) => ({ label: `chat_id=${id}`, query: `chat_id=${encodeURIComponent(id)}` })),
  ]

  // Деградация: полный вариант → без клавиатуры → без разметки.
  const variants: Array<{ label: string; body: Record<string, unknown> }> = []
  if (attachments && attachments.length > 0) {
    variants.push({ label: 'full', body: { text: safeText, format, notify: true, attachments } })
  }
  variants.push({ label: 'no-attachments', body: { text: safeText, format, notify: true } })
  variants.push({ label: 'plain-text', body: { text: plainText, notify: true } })

  const attempts: Array<{ target: string; status: number; error: string }> = []
  const delivered: string[] = []
  const failed: string[] = []
  let lastStatus: number | undefined
  let tokenRejected = false

  // Заявка уходит КАЖДОМУ получателю из списка, а не первому успешному.
  for (const target of targets) {
    if (tokenRejected) break

    let sent = false

    for (const variant of variants) {
      const res = await maxRequest(`/messages?${target.query}`, token, 'POST', variant.body)
      lastStatus = res.status

      if (res.ok) {
        const via = `${target.label} (${variant.label})`
        console.log(`[Max API] Сообщение доставлено: ${via}`)
        delivered.push(via)
        sent = true
        break
      }

      attempts.push({ target: `${target.label} (${variant.label})`, status: res.status, error: res.raw.slice(0, 300) })
      console.warn(`[Max API] Не доставлено ${target.label} [${variant.label}] — ${res.status}: ${res.raw.slice(0, 300)}`)

      // 401/403 — проблема токена, остальных получателей перебирать бессмысленно.
      if (res.status === 401 || res.status === 403) {
        tokenRejected = true
        break
      }
      // 404 — получателя не существует или бот не в диалоге. Варианты не помогут.
      if (res.status === 404) break
    }

    if (!sent) failed.push(target.label)
  }

  if (tokenRejected) {
    return {
      ok: false,
      status: lastStatus,
      error: 'Токен бота отклонён (401/403). Проверьте MAX_BOT_TOKEN и что он передаётся без префикса Bearer.',
      attempts,
    }
  }

  if (delivered.length === 0) {
    return {
      ok: false,
      status: lastStatus,
      error: attempts.map((a) => `${a.target} → ${a.status} ${a.error}`).join(' | ') || 'Unknown error',
      attempts,
    }
  }

  if (failed.length > 0) {
    console.error(`[Max API] Часть получателей не получила заявку: ${failed.join(', ')}`)
  }

  // ok, если заявку получил хотя бы один адресат; недоставленные перечислены отдельно.
  return {
    ok: true,
    status: 200,
    via: delivered.join(' + '),
    ...(failed.length > 0 ? { error: `Не доставлено: ${failed.join(', ')}` } : {}),
    attempts,
  }
}
