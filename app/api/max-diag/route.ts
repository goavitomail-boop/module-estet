import { NextRequest, NextResponse } from 'next/server'
import {
  getMaxBotInfo,
  getMaxChats,
  getMaxUpdates,
  getMaxSubscriptions,
  deleteMaxSubscription,
  subscribeMaxWebhook,
  sendMaxMessage,
  adminUserIds,
  MAX_API_BASE,
} from '@/lib/max-bot'
import { getStats, isDbConfigured, listBotUsers, ensureSchema } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Диагностика и настройка интеграции с MAX.
 *
 *   ?key=СЕКРЕТ            — общая проверка: токен, база, подписки, получатели
 *   ?key=СЕКРЕТ&hook=1     — подписать вебхук бота на этот сайт (включает кнопки и меню)
 *   ?key=СЕКРЕТ&unhook=1   — снять все подписки (вернуть режим long polling)
 *   ?key=СЕКРЕТ&test=1     — тестовое сообщение получателям
 *   ?key=СЕКРЕТ&to=123&test=1 — тестовое сообщение конкретному user_id
 */
export async function GET(request: NextRequest) {
  const expected = process.env.MAX_DIAG_KEY
  const params = request.nextUrl.searchParams

  if (!expected) {
    return NextResponse.json({ error: 'MAX_DIAG_KEY не задан — диагностика отключена' }, { status: 404 })
  }
  if (params.get('key') !== expected) {
    return NextResponse.json({ error: 'Неверный ключ' }, { status: 401 })
  }

  const token = process.env.MAX_BOT_TOKEN
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const siteUrl = host ? `${proto}://${host}` : 'https://module-estet.ru'
  const webhookUrl = `${siteUrl}/api/max-webhook`

  const env = {
    MAX_API_BASE,
    MAX_BOT_TOKEN: token ? `задан (${token.length} символов, «${token.slice(0, 6)}…»)` : 'НЕ ЗАДАН',
    MAX_NOTIFY_USER_ID: process.env.MAX_NOTIFY_USER_ID || 'НЕ ЗАДАН',
    MAX_NOTIFY_CHAT_ID: process.env.MAX_NOTIFY_CHAT_ID || 'не задан',
    MAX_WEBHOOK_SECRET: process.env.MAX_WEBHOOK_SECRET ? 'задан' : 'не задан',
    DATABASE_URL: isDbConfigured() ? 'задан' : 'НЕ ЗАДАН',
    CRON_SECRET: process.env.CRON_SECRET ? 'задан' : 'не задан',
    // Не обязателен: при подключении через OIDC его нет, и это нормально.
    // Реальное состояние хранилища смотрите в блоке blob ниже.
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN
      ? `задан (${process.env.BLOB_READ_WRITE_TOKEN.length} символов)`
      : 'не задан (нормально при подключении через OIDC)',
    BLOB_STORE_ID: process.env.BLOB_STORE_ID ? 'задан' : 'не задан',
  }

  const hints: string[] = []

  if (!token) {
    return NextResponse.json({
      env,
      verdict: 'MAX_BOT_TOKEN отсутствует — интеграция не работает.',
    })
  }

  /* ── База данных ── */
  let database: unknown = 'DATABASE_URL не задан — список заявок и статусы недоступны'
  if (isDbConfigured()) {
    try {
      await ensureSchema()
      database = { ok: true, stats: await getStats(), knownBotUsers: await listBotUsers() }
    } catch (error) {
      database = { ok: false, error: String(error) }
      hints.push('База настроена, но обращение к ней падает. Проверьте строку DATABASE_URL.')
    }
  } else {
    hints.push('Добавьте DATABASE_URL (Vercel → Storage → Neon), иначе заявки не сохраняются.')
  }

  /* ── Файловое хранилище ── */
  // Проверяем не наличие переменной, а реальный доступ: токен может быть
  // задан, но принадлежать другому проекту или быть отозванным.
  // Проверяем не переменные окружения, а фактический доступ: хранилище может
  // быть подключено и через read-write токен, и через OIDC — во втором случае
  // переменной BLOB_READ_WRITE_TOKEN не существует, хотя всё работает.
  let blob: unknown
  try {
    const { list } = await import('@vercel/blob')
    const res = await list({ limit: 1 })
    blob = {
      ok: true,
      auth: process.env.BLOB_READ_WRITE_TOKEN ? 'read-write token' : 'OIDC / store id',
      storedFiles: res.blobs.length > 0 ? 'есть загруженные файлы' : 'хранилище пустое',
    }
  } catch (error) {
    blob = { ok: false, error: error instanceof Error ? error.message : String(error) }
    hints.push('Обращение к файловому хранилищу падает — файлы из квиза загружаться не будут. Текст ошибки в поле blob.error.')
  }

  /* ── Подписки-вебхуки ── */
  const subs = await getMaxSubscriptions(token)
  const subsData = subs.data as { subscriptions?: Array<{ url?: string }> } | null
  const subUrls = Array.isArray(subsData?.subscriptions)
    ? subsData!.subscriptions.map((s) => s?.url).filter((u): u is string => typeof u === 'string')
    : []

  let hookAction: unknown = 'не запускалось'

  if (params.get('unhook') === '1') {
    const removed: unknown[] = []
    for (const url of subUrls) {
      const res = await deleteMaxSubscription(url, token)
      removed.push({ url, status: res.status, ok: res.ok })
    }
    hookAction = { unsubscribed: removed }
    hints.push('Подписки сняты. Кнопки в боте работать не будут, зато снова виден GET /updates.')
  } else if (params.get('hook') === '1') {
    // Снимаем старые подписки, иначе MAX копит их и шлёт события по всем адресам
    const removed: unknown[] = []
    for (const url of subUrls) {
      if (url === webhookUrl) continue
      const res = await deleteMaxSubscription(url, token)
      removed.push({ url, status: res.status, ok: res.ok })
    }
    const res = await subscribeMaxWebhook(webhookUrl, process.env.MAX_WEBHOOK_SECRET, token)
    hookAction = { removedOld: removed, subscribed: { url: webhookUrl, status: res.status, ok: res.ok, response: res.data ?? res.raw } }
    if (res.ok) {
      hints.push(`Вебхук подключён: ${webhookUrl}. Напишите боту «Меню» — появится панель с кнопками.`)
    } else {
      hints.push(`Не удалось подключить вебхук (${res.status}). Адрес должен быть доступен по HTTPS на порту 443.`)
    }
  }

  const [me, chats, updates] = await Promise.all([getMaxBotInfo(token), getMaxChats(token), getMaxUpdates(token)])

  /* ── Кандидаты в получатели из очереди событий ── */
  const senders: Array<{ user_id: unknown; name: unknown; chat_id: unknown }> = []
  const updatesData = updates.data as { updates?: unknown[]; marker?: number } | null
  if (updatesData && Array.isArray(updatesData.updates)) {
    for (const raw of updatesData.updates) {
      const upd = raw as Record<string, any>
      const sender = upd?.message?.sender ?? upd?.user
      if (sender?.user_id && !sender?.is_bot) {
        senders.push({ user_id: sender.user_id, name: sender.name ?? sender.first_name ?? null, chat_id: upd?.message?.recipient?.chat_id ?? null })
      }
    }
  }

  let testSend: unknown = 'не запускалась (добавьте &test=1)'
  if (params.get('test') === '1') {
    const to = params.get('to')?.trim()
    testSend = await sendMaxMessage({
      text: `🧪 **Тест интеграции**\n\nВремя: ${new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}`,
      format: 'markdown',
      ...(to ? { userId: to, chatId: '' } : {}),
    })
  }

  if (!me.ok) hints.push(`GET /me вернул ${me.status}. Токен недействителен или отозван.`)
  if (adminUserIds().length === 0) hints.push('MAX_NOTIFY_USER_ID пуст — некому отправлять заявки и некому управлять ботом.')
  if (subUrls.length === 0 && params.get('hook') !== '1') {
    hints.push(`Вебхук не подключён — меню и кнопки в боте не работают. Откройте эту страницу с &hook=1.`)
  }
  if (subUrls.length > 0 && !subUrls.includes(webhookUrl)) {
    hints.push(`Подписка указывает на другой адрес (${subUrls.join(', ')}), а сайт отвечает на ${webhookUrl}. Откройте с &hook=1, чтобы исправить.`)
  }
  if (senders.length > 0) {
    const ids = Array.from(new Set(senders.map((s) => String(s.user_id))))
    hints.push(`Кандидаты в получатели из очереди: ${ids.join(', ')}`)
  }

  return NextResponse.json({
    env,
    site: { siteUrl, webhookUrl },
    bot: { status: me.status, ok: me.ok, data: me.data },
    database,
    blob,
    subscriptions: { status: subs.status, urls: subUrls },
    hookAction,
    chats: { status: chats.status, data: chats.data },
    incomingSenders: senders,
    updatesMarker: updatesData?.marker ?? null,
    testSend,
    hints,
  })
}
