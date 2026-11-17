'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { allowRequest, clientIp, requestCount } from '@/lib/request-guard'
import { normalizeRussianPhone } from '@/lib/phone'
import {
  MIN_PASSWORD,
  endClientSession,
  getClientSession,
  hashClientPassword,
  isCabinetConfigured,
  loginCode,
  loginCodeHash,
  requireClient,
  startClientSession,
  verifyClientPassword,
} from '@/lib/cabinet-auth'
import {
  addFeed,
  bumpSessionVersion,
  consumeToken,
  countTokenAttempt,
  findToken,
  getClient,
  getClientByPhone,
  getOrder,
  getVisit,
  issueToken,
  latestToken,
  phoneDigits,
  setClientPassword,
  setProjectStatus,
  touchClientLogin,
  unlinkClientMax,
} from '@/lib/cabinet-db'
import { createMaxLink } from '@/lib/cabinet-max'
import { notifyClient, notifyManagers } from '@/lib/cabinet-notify'
import { formatDay, formatTime, visitKindLabel } from '@/lib/cabinet-shared'

export type FormState = { error?: string; ok?: boolean; message?: string } | null

const FAIL_LIMIT = 5
const FAIL_WINDOW_MS = 15 * 60_000
const CODE_TTL_MS = 10 * 60_000

async function ip(): Promise<string> {
  return clientIp({ headers: await headers() })
}

function readPhone(formData: FormData): string {
  return normalizeRussianPhone(String(formData.get('phone') ?? ''))
}

/* ── Вход по паролю ──────────────────────────────────────────────── */

export async function passwordLoginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isCabinetConfigured()) return { error: 'Кабинет пока не настроен. Позвоните менеджеру.' }

  const address = await ip()
  const phone = readPhone(formData)
  // Ограничиваем и адрес, и номер: перебор с разных адресов по одному номеру тоже упрётся
  if (
    requestCount('cabinet-login', address, FAIL_WINDOW_MS) >= FAIL_LIMIT ||
    (phone && requestCount('cabinet-login-phone', phone, FAIL_WINDOW_MS) >= FAIL_LIMIT * 2)
  ) {
    return { error: 'Слишком много попыток. Попробуйте через 15 минут или войдите кодом из MAX.' }
  }

  const password = String(formData.get('password') ?? '')
  const client = phone ? await getClientByPhone(phoneDigits(phone)) : null

  if (!client || client.blocked || !verifyClientPassword(client.password_hash, password)) {
    allowRequest('cabinet-login', address, FAIL_LIMIT, FAIL_WINDOW_MS)
    if (phone) allowRequest('cabinet-login-phone', phone, FAIL_LIMIT * 2, FAIL_WINDOW_MS)
    await new Promise((resolve) => setTimeout(resolve, 600))
    // Ответ один на все случаи: по форме входа нельзя узнать, есть ли у номера кабинет
    return {
      error:
        'Неверный телефон или пароль. Если пароль ещё не задан — откройте ссылку-приглашение от менеджера или войдите кодом из MAX.',
    }
  }

  await touchClientLogin(client.id)
  await startClientSession(client)
  redirect('/kabinet')
}

/* ── Вход кодом из MAX ───────────────────────────────────────────── */

/**
 * Шаг 1: код в MAX. Ответ одинаковый, есть такой клиент или нет, — по форме
 * входа нельзя выяснить, чей номер зарегистрирован. Подсказка, почему код
 * может не прийти, — в тексте ответа.
 */
export async function requestCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isCabinetConfigured() || !process.env.MAX_BOT_TOKEN) {
    return { error: 'Вход через MAX сейчас недоступен — войдите по паролю.' }
  }
  const phone = readPhone(formData)
  if (!phone) return { error: 'Введите номер телефона полностью.' }

  const address = await ip()
  if (!allowRequest('cabinet-code', address, 5, FAIL_WINDOW_MS) || !allowRequest('cabinet-code-phone', phone, 3, 10 * 60_000)) {
    return { error: 'Код уже отправлен. Новый можно запросить через несколько минут.' }
  }

  const client = await getClientByPhone(phoneDigits(phone))
  if (client && client.max_user_id && !client.blocked) {
    const code = loginCode()
    const token = await issueToken(client.id, 'login', CODE_TTL_MS, `${client.id}:${code}`)
    await notifyClient(
      client,
      `🔐 Код для входа в личный кабинет: **${code}**\n\nДействует 10 минут. Никому его не сообщайте — сотрудники «Модуль Эстет» код не спрашивают.`,
      { text: 'Войти в кабинет', path: `/voiti?t=${token}` }
    )
  }

  return { ok: true, message: phone }
}

/** Шаг 2: проверка кода */
export async function verifyCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  if (!isCabinetConfigured()) return { error: 'Кабинет пока не настроен.' }
  const phone = readPhone(formData)
  const code = String(formData.get('code') ?? '').replace(/\D/g, '')
  if (!phone || code.length !== 6) return { ok: true, message: phone, error: 'Код — шесть цифр из сообщения в MAX.' }

  const client = await getClientByPhone(phoneDigits(phone))
  const row = client ? await latestToken(client.id, 'login') : null
  if (!client || !row) return { ok: true, message: phone, error: 'Код устарел. Запросите новый.' }

  const attempts = await countTokenAttempt(row.id)
  if (attempts > 5) {
    await consumeToken(row.id)
    return { ok: true, message: phone, error: 'Слишком много попыток. Запросите новый код.' }
  }
  if (row.code_hash !== loginCodeHash(client.id, code)) {
    return { ok: true, message: phone, error: 'Код не подходит. Проверьте цифры в сообщении.' }
  }
  if (!(await consumeToken(row.id)) || client.blocked) return { error: 'Код уже использован. Запросите новый.' }

  await touchClientLogin(client.id)
  await startClientSession(client)
  redirect('/kabinet')
}

/* ── Приглашение: клиент задаёт себе пароль ──────────────────────── */

export async function acceptInviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get('token') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (password.length < MIN_PASSWORD) return { error: `Пароль — не короче ${MIN_PASSWORD} символов.` }
  if (password !== confirm) return { error: 'Пароли не совпадают.' }

  const row = token ? await findToken(token, 'invite') : null
  if (!row) return { error: 'Ссылка устарела или уже использована. Попросите менеджера прислать новую.' }
  if (!(await consumeToken(row.id))) return { error: 'Ссылка уже использована.' }

  await setClientPassword(row.client_id, hashClientPassword(password))
  const client = await getClient(row.client_id)
  if (!client || client.blocked) return { error: 'Доступ к кабинету закрыт. Свяжитесь с менеджером.' }

  await touchClientLogin(client.id)
  await startClientSession(client)
  redirect('/kabinet?welcome=1')
}

/* ── Профиль ─────────────────────────────────────────────────────── */

export async function changePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const client = await requireClient()
  const current = String(formData.get('current') ?? '')
  const password = String(formData.get('password') ?? '')
  const confirm = String(formData.get('confirm') ?? '')

  if (client.password_hash && !verifyClientPassword(client.password_hash, current)) {
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { error: 'Текущий пароль не подходит.' }
  }
  if (password.length < MIN_PASSWORD) return { error: `Новый пароль — не короче ${MIN_PASSWORD} символов.` }
  if (password !== confirm) return { error: 'Пароли не совпадают.' }

  await setClientPassword(client.id, hashClientPassword(password))
  // Смена пароля сбрасывает прочие сессии — эту продлеваем с новой версией
  const fresh = await getClient(client.id)
  if (fresh) await startClientSession(fresh)
  return { ok: true, message: 'Пароль изменён. На других устройствах нужно войти заново.' }
}

export async function maxLinkAction(): Promise<{ url: string | null; code: string }> {
  const client = await requireClient()
  return createMaxLink(client.id)
}

export async function unlinkMaxAction(): Promise<void> {
  const client = await requireClient()
  await unlinkClientMax(client.id)
  revalidatePath('/kabinet/profil')
}

export async function logoutAction(): Promise<void> {
  await endClientSession()
  redirect('/kabinet/vhod')
}

export async function logoutEverywhereAction(): Promise<void> {
  const client = await getClientSession()
  if (client) await bumpSessionVersion(client.id)
  await endClientSession()
  redirect('/kabinet/vhod')
}

/* ── Заказ: ответы клиента ───────────────────────────────────────── */

/** Заказ текущего клиента или null — чужой заказ так же «не найден», как несуществующий */
async function ownOrder(orderId: string) {
  const client = await requireClient()
  const order = await getOrder(orderId)
  if (!order || order.client_id !== client.id) return null
  return { client, order }
}

export async function approveProjectAction(orderId: string): Promise<FormState> {
  const own = await ownOrder(orderId)
  if (!own) return { error: 'Заказ не найден.' }
  if (own.order.project_status !== 'sent') return { error: 'Проект сейчас не ждёт согласования.' }

  await setProjectStatus(orderId, 'approved')
  await addFeed(orderId, 'client', 'approved', 'Проект согласован')
  await notifyManagers(
    `✅ **${own.client.name}** согласовал(а) проект\n«${own.order.title}»`,
    `/admin/zakazy/${orderId}`
  )
  revalidatePath(`/kabinet/zakaz/${orderId}`)
  return { ok: true, message: 'Спасибо! Проект согласован — менеджер свяжется по договору.' }
}

export async function requestChangesAction(orderId: string, comment: string): Promise<FormState> {
  const own = await ownOrder(orderId)
  if (!own) return { error: 'Заказ не найден.' }
  const text = comment.trim().slice(0, 2000)
  if (text.length < 3) return { error: 'Напишите, что поправить.' }
  if (own.order.project_status !== 'sent') return { error: 'Проект сейчас не ждёт согласования.' }

  await setProjectStatus(orderId, 'changes')
  await addFeed(orderId, 'client', 'changes', text)
  await notifyManagers(
    `✏️ **${own.client.name}** просит правки в проекте «${own.order.title}»:\n\n${text}`,
    `/admin/zakazy/${orderId}`
  )
  revalidatePath(`/kabinet/zakaz/${orderId}`)
  return { ok: true, message: 'Правки отправлены дизайнеру. Новый вариант появится здесь.' }
}

export async function requestRescheduleAction(visitId: string, comment: string): Promise<FormState> {
  const visit = await getVisit(visitId)
  const own = visit ? await ownOrder(visit.order_id) : null
  if (!visit || !own) return { error: 'Визит не найден.' }
  const text = comment.trim().slice(0, 1000)
  if (text.length < 3) return { error: 'Напишите, когда вам удобно.' }

  const when = `${formatDay(visit.starts_at, true)}, ${formatTime(visit.starts_at)}`
  await addFeed(own.order.id, 'client', 'reschedule', `${visitKindLabel(visit.kind)} ${when} — просьба перенести: ${text}`)
  await notifyManagers(
    `📅 **${own.client.name}** просит перенести «${visitKindLabel(visit.kind)}» (${when}):\n\n${text}\n\nТелефон: ${own.client.phone}`,
    `/admin/zakazy/${own.order.id}`
  )
  revalidatePath(`/kabinet/zakaz/${own.order.id}`)
  return { ok: true, message: 'Просьба отправлена. Менеджер перезвонит и согласует новое время.' }
}

/** Вопрос менеджеру из карточки заказа — в ленту заказа и менеджерам в MAX */
export async function askManagerAction(orderId: string, question: string): Promise<FormState> {
  const own = await ownOrder(orderId)
  if (!own) return { error: 'Заказ не найден.' }
  const text = question.trim().slice(0, 2000)
  if (text.length < 3) return { error: 'Напишите вопрос.' }

  const address = await ip()
  if (!allowRequest('cabinet-question', `${own.client.id}:${address}`, 10, 60 * 60_000)) {
    return { error: 'Слишком много сообщений подряд. Позвоните менеджеру.' }
  }

  await addFeed(orderId, 'client', 'question', text)
  await notifyManagers(
    `💬 Вопрос от **${own.client.name}** по заказу «${own.order.title}»:\n\n${text}\n\nТелефон: ${own.client.phone}`,
    `/admin/zakazy/${orderId}`
  )
  revalidatePath(`/kabinet/zakaz/${orderId}`)
  return { ok: true, message: 'Вопрос отправлен менеджеру. Ответ придёт сюда и в MAX.' }
}

