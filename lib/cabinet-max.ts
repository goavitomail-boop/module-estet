import { consumeToken, findToken, findTokenByCode, getClient, issueToken, linkClientMax } from '@/lib/cabinet-db'
import { linkCode } from '@/lib/cabinet-auth'
import { maxStartLink } from '@/lib/cabinet-notify'
import type { Client } from '@/lib/cabinet-shared'

/**
 * Привязка MAX к кабинету.
 *
 * Клиент открывает ссылку https://max.ru/<бот>?start=k_<токен> и нажимает
 * «Начать» — бот получает метку и записывает его MAX в кабинет. Если ссылка
 * не открылась (старая версия MAX, компьютер), тот же кабинет можно привязать,
 * отправив боту короткий код «ME-XXXXXX».
 */

const LINK_TTL_MS = 7 * 86_400_000
export const START_PREFIX = 'k_'

export async function createMaxLink(clientId: string): Promise<{ url: string | null; code: string }> {
  const code = linkCode()
  const token = await issueToken(clientId, 'max_link', LINK_TTL_MS, code)
  return { url: await maxStartLink(`${START_PREFIX}${token}`), code }
}

/** Из события bot_started: метка из ссылки */
export async function linkMaxByPayload(payload: string, maxUserId: string): Promise<Client | null> {
  if (!payload.startsWith(START_PREFIX)) return null
  const row = await findToken(payload.slice(START_PREFIX.length), 'max_link')
  if (!row || !(await consumeToken(row.id))) return null
  await linkClientMax(row.client_id, maxUserId)
  return getClient(row.client_id)
}

/** Из обычного сообщения: «ME-7KQ4FZ», «me 7kq4fz» и т. п. */
export async function linkMaxByText(text: string, maxUserId: string): Promise<Client | null> {
  const match = text.toUpperCase().match(/\bME[\s-]?([A-Z0-9]{6})\b/)
  if (!match) return null
  const row = await findTokenByCode(`ME-${match[1]}`, 'max_link')
  if (!row || !(await consumeToken(row.id))) return null
  await linkClientMax(row.client_id, maxUserId)
  return getClient(row.client_id)
}
