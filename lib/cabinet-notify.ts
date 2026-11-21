import { getMaxBotInfo, sendMaxMessage } from '@/lib/max-bot'
import { siteUrl } from '@/lib/seo'
import type { Client } from '@/lib/cabinet-shared'

/**
 * Сообщения кабинета через бота MAX: клиенту — о том, что изменилось
 * в заказе; менеджерам — о том, что ответил клиент.
 *
 * Отправка «по возможности»: если MAX у клиента не привязан или бот
 * не ответил, действие в панели всё равно сохраняется — сообщение
 * останется в ленте заказа, клиент увидит его при входе.
 */

/** Адрес кабинета: на сервере разработки — тот же сайт, иначе ссылки вели бы в никуда */
function base(): string {
  return process.env.SITE_URL?.trim().replace(/\/$/, '') || siteUrl
}

export function cabinetUrl(path = ''): string {
  return `${base()}/kabinet${path}`
}

function linkButton(text: string, url: string) {
  return [{ type: 'inline_keyboard', payload: { buttons: [[{ type: 'link' as const, text, url }]] } }]
}

/** Сообщение клиенту. Возвращает true, если MAX привязан и сообщение ушло */
export async function notifyClient(
  client: Pick<Client, 'max_user_id' | 'blocked'>,
  text: string,
  link?: { text: string; path: string }
): Promise<boolean> {
  if (!client.max_user_id || client.blocked || !process.env.MAX_BOT_TOKEN) return false
  try {
    const result = await sendMaxMessage({
      text,
      userId: client.max_user_id,
      chatId: '',
      attachments: link ? linkButton(link.text, cabinetUrl(link.path)) : undefined,
    })
    return result.ok
  } catch (error) {
    console.error('[Кабинет] Не удалось написать клиенту в MAX:', error)
    return false
  }
}

/** Сообщение менеджерам — тем же, кто получает заявки (MAX_NOTIFY_USER_ID) */
export async function notifyManagers(text: string, adminPath?: string): Promise<void> {
  if (!process.env.MAX_BOT_TOKEN) return
  try {
    await sendMaxMessage({
      text,
      attachments: adminPath ? linkButton('Открыть в панели', `${base()}${adminPath}`) : undefined,
    })
  } catch (error) {
    console.error('[Кабинет] Не удалось написать менеджерам в MAX:', error)
  }
}

let botName: { value: string | null; at: number } | null = null

/**
 * Имя бота для ссылки https://max.ru/<имя>?start=… — из MAX_BOT_USERNAME
 * или у самого бота (запрос /me, ответ держим час).
 */
export async function maxBotUsername(): Promise<string | null> {
  const fromEnv = process.env.MAX_BOT_USERNAME?.trim().replace(/^@/, '')
  if (fromEnv) return fromEnv
  if (!process.env.MAX_BOT_TOKEN) return null
  if (botName && Date.now() - botName.at < 3600_000) return botName.value
  try {
    const info = await getMaxBotInfo()
    const data = info.data as { username?: string } | null
    botName = { value: info.ok && data?.username ? data.username : null, at: Date.now() }
  } catch {
    botName = { value: null, at: Date.now() }
  }
  return botName.value
}

/** Ссылка, по которой MAX откроет бота и передаст ему метку привязки */
export async function maxStartLink(payload: string): Promise<string | null> {
  const name = await maxBotUsername()
  return name ? `https://max.ru/${name}?start=${encodeURIComponent(payload)}` : null
}
