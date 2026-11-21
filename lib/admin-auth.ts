import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

/**
 * Вход в админ-панель по одному паролю.
 *
 * Пароль хранится не открытым текстом, а в виде scrypt-хеша в переменной
 * ADMIN_PASSWORD_HASH формата `scrypt:<соль>:<хеш>`. Утечка переменных
 * окружения при таком хранении не даёт войти в панель: scrypt требует
 * заметной памяти и времени на попытку, поэтому перебор по хешу непрактичен.
 *
 * Сессия — подписанная HMAC кука без хранения в базе: сервер проверяет подпись
 * и срок, поэтому перезапуск и несколько инстансов на Vercel не разлогинивают.
 */

export const ADMIN_COOKIE = 'me_admin'
const SESSION_DAYS = 14

/** Кто фигурирует в истории заявок при изменениях из панели */
export const ADMIN_ACTOR = 'Администратор'

const SCRYPT_KEYLEN = 64

export interface AdminSession {
  /** Unix-время истечения, секунды */
  exp: number
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD)
}

/** Хеш задан — пароль в переменных окружения не лежит открытым текстом */
export function isPasswordHashed(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH?.trim())
}

function secret(): string {
  // Отдельный секрет предпочтительнее: смена пароля тогда не разлогинивает всех.
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD_HASH || process.env.ADMIN_PASSWORD || ''
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

/** Сравнение за постоянное время — чтобы пароль нельзя было подобрать по времени ответа */
function safeEqual(a: Buffer | string, b: Buffer | string): boolean {
  const bufA = Buffer.isBuffer(a) ? a : Buffer.from(a)
  const bufB = Buffer.isBuffer(b) ? b : Buffer.from(b)
  if (bufA.length !== bufB.length) {
    // Всё равно выполняем сравнение, чтобы время ответа не зависело от длины
    timingSafeEqual(bufA, bufA)
    return false
  }
  return timingSafeEqual(bufA, bufB)
}

/**
 * Строит строку хранения пароля. Вынесено сюда, чтобы скрипт генерации
 * и проверка при входе использовали ровно один и тот же алгоритм.
 */
export function hashPassword(password: string, salt = randomBytes(16).toString('hex')): string {
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString('hex')
  return `scrypt:${salt}:${derived}`
}

export function checkPassword(input: string): boolean {
  const stored = process.env.ADMIN_PASSWORD_HASH?.trim()

  if (stored) {
    const [scheme, salt, expected] = stored.split(':')
    if (scheme !== 'scrypt' || !salt || !expected) {
      console.error('[Admin] ADMIN_PASSWORD_HASH имеет неверный формат, ожидается scrypt:<соль>:<хеш>')
      return false
    }
    try {
      const derived = scryptSync(input, salt, SCRYPT_KEYLEN)
      return safeEqual(derived, Buffer.from(expected, 'hex'))
    } catch (error) {
      console.error('[Admin] Не удалось проверить пароль:', error)
      return false
    }
  }

  // Запасной путь на время перехода: пароль открытым текстом.
  // Работает, но хранить пароль так не следует — панель об этом предупреждает.
  const plain = process.env.ADMIN_PASSWORD
  if (!plain) return false
  console.warn('[Admin] Пароль задан открытым текстом в ADMIN_PASSWORD. Замените на ADMIN_PASSWORD_HASH.')
  return safeEqual(input, plain)
}

export function createToken(): string {
  const session: AdminSession = {
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86_400,
  }
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url')
  return `${payload}.${sign(payload)}`
}

export function verifyToken(token: string | undefined): AdminSession | null {
  if (!token || !secret()) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  if (!safeEqual(signature, sign(payload))) return null

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession
    if (!session?.exp || session.exp < Math.floor(Date.now() / 1000)) return null
    return session
  } catch {
    return null
  }
}

/** Текущая сессия из куки. null — значит не авторизован. */
export async function getSession(): Promise<AdminSession | null> {
  const store = await cookies()
  return verifyToken(store.get(ADMIN_COOKIE)?.value)
}

/** Сессия или бросок — для серверных действий, которые нельзя выполнять анонимно */
export async function requireSession(): Promise<AdminSession> {
  const session = await getSession()
  if (!session) throw new Error('Требуется авторизация')
  return session
}

export function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  }
}
