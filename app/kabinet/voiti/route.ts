import { NextRequest, NextResponse } from 'next/server'
import { CLIENT_COOKIE, isCabinetConfigured, sessionCookieOptions, sessionToken } from '@/lib/cabinet-auth'
import { consumeToken, findToken, getClient, touchClientLogin } from '@/lib/cabinet-db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Кнопка «Войти в кабинет» из сообщения с кодом в MAX. Ссылка одноразовая
 * и живёт 10 минут, как сам код: открыл — вошёл, код набирать не нужно.
 */
export async function GET(request: NextRequest) {
  const fail = NextResponse.redirect(new URL('/kabinet/vhod?e=link', request.url))
  const token = request.nextUrl.searchParams.get('t') ?? ''
  if (!isCabinetConfigured() || !token) return fail

  const row = await findToken(token, 'login')
  if (!row || !(await consumeToken(row.id))) return fail
  const client = await getClient(row.client_id)
  if (!client || client.blocked) return fail

  await touchClientLogin(client.id)
  const response = NextResponse.redirect(new URL('/kabinet', request.url))
  response.cookies.set(CLIENT_COOKIE, sessionToken(client), sessionCookieOptions())
  // Ссылка с токеном не должна уходить дальше в Referer
  response.headers.set('Referrer-Policy', 'no-referrer')
  return response
}
