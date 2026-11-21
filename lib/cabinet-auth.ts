import { createHmac, randomInt, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { hashPassword } from '@/lib/admin-auth'
import { isDbConfigured } from '@/lib/db'
import { getClient, sha256 } from '@/lib/cabinet-db'
import type { Client } from '@/lib/cabinet-shared'

/**
 * Вход в личный кабинет клиента.
 *
 * Регистрации нет: кабинет заводит администратор. Войти можно по телефону
 * и паролю (пароль клиент задаёт по ссылке-приглашению или его выдаёт
 * администратор) либо кодом, который присылает бот MAX.
 *
 * Сессия — подписанная HMAC кука, как у панели, но со своим ключом:
 * кука панели не подходит к кабинету и наоборот. В куке — версия сессии
 * клиента: смена пароля, блокировка или «выйти везде» увеличивают её,
 * и все прежние куки перестают подходить.
 */

export const CLIENT_COOKIE = 'me_client'
const SESSION_DAYS = 60

/** Пароль не короче — достаточно против перебора при ограничении попыток */
export const MIN_PASSWORD = 6

/** Ключ подписи: свой CLIENT_SESSION_SECRET или производный от секрета панели */
function secret(): string {
  const base =
    process.env.CLIENT_SESSION_SECRET ||
    process.env.ADMIN_SESSION_SECRET ||
    process.env.ADMIN_PASSWORD_HASH ||
    process.env.ADMIN_PASSWORD ||
    ''
  if (!base) return ''
  return createHmac('sha256', base).update('kabinet-session-v1').digest('hex')
}

export function isCabinetConfigured(): boolean {
  return Boolean(secret()) && isDbConfigured()
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/* ── Пароль ── */

export function hashClientPassword(password: string): string {
  return hashPassword(password)
}

export function verifyClientPassword(stored: string | null, input: string): boolean {
  if (!stored) return false
  const [scheme, salt, expected] = stored.split(':')
  if (scheme !== 'scrypt' || !salt || !expected) return false
  try {
    const derived = scryptSync(input, salt, 64)
    const expectedBuf = Buffer.from(expected, 'hex')
    return derived.length === expectedBuf.length && timingSafeEqual(derived, expectedBuf)
  } catch {
    return false
  }
}

/** Пароль, который удобно продиктовать по телефону: «Fasad-4821» */
export function readablePassword(): string {
  const words = ['Fasad', 'Modul', 'Yasen', 'Mramor', 'Latun', 'Kvarc', 'Shpon', 'Dub', 'Granit', 'Plita']
  return `${words[randomInt(words.length)]}-${String(randomInt(1000, 10000))}`
}

/** 6 цифр для входа через MAX */
export function loginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

/** Код привязки MAX, если ссылка не открылась и код вводят руками: «ME-7KQ4FZ» */
export function linkCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)]
  return `ME-${code}`
}

/** Код входа хранится с привязкой к клиенту: одинаковые цифры у двух клиентов не пересекутся */
export function loginCodeHash(clientId: string, code: string): string {
  return sha256(`${clientId}:${code}`)
}

/* ── Сессия ── */

interface SessionPayload {
  c: string
  v: number
  exp: number
}

export function sessionToken(client: Pick<Client, 'id' | 'session_version'>): string {
  const payload: SessionPayload = {
    c: client.id,
    v: client.session_version,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400,
  }
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${encoded}.${sign(encoded)}`
}

function readToken(token: string | undefined): SessionPayload | null {
  if (!token || !secret()) return null
  const [encoded, signature] = token.split('.')
  if (!encoded || !signature || !safeEqual(signature, sign(encoded))) return null
  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString()) as SessionPayload
    if (!payload?.c || !payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function sessionCookieOptions(maxAge = SESSION_DAYS * 86_400) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}

/** Ставит куку сессии — только из серверного действия или маршрута */
export async function startClientSession(client: Pick<Client, 'id' | 'session_version'>): Promise<void> {
  ;(await cookies()).set(CLIENT_COOKIE, sessionToken(client), sessionCookieOptions())
}

export async function endClientSession(): Promise<void> {
  ;(await cookies()).set(CLIENT_COOKIE, '', sessionCookieOptions(0))
}

/** Текущий клиент или null. Каждый раз сверяется с базой: блокировка срабатывает сразу */
export async function getClientSession(): Promise<Client | null> {
  if (!isCabinetConfigured()) return null
  const payload = readToken((await cookies()).get(CLIENT_COOKIE)?.value)
  if (!payload) return null
  try {
    const client = await getClient(payload.c)
    if (!client || client.blocked || client.session_version !== payload.v) return null
    return client
  } catch (error) {
    console.error('[Кабинет] Не удалось проверить сессию:', error)
    return null
  }
}

/** Для страниц кабинета: без входа — на страницу входа */
export async function requireClient(): Promise<Client> {
  const client = await getClientSession()
  if (!client) redirect('/kabinet/vhod')
  return client
}
