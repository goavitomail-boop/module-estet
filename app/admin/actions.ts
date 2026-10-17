'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  ADMIN_ACTOR,
  ADMIN_COOKIE,
  checkPassword,
  cookieOptions,
  createToken,
  isAuthConfigured,
  requireSession,
} from '@/lib/admin-auth'
import {
  CONFIRMED_STATUS,
  FILE_KINDS,
  LEAD_STATUSES,
  addLeadNote,
  addLeadUpload,
  assignLead,
  deleteLead,
  getLead,
  isSlotFull,
  measurementConfirmError,
  removeLeadUpload,
  rescheduleMeasurement,
  setDealAmount,
  setLeadStatus,
  setNextContact,
  type LeadStatus,
} from '@/lib/db'
import { SLOT_VALUES, slotCapacity, slotLabel } from '@/lib/measurement-slots'
import { sendMaxMessage } from '@/lib/max-bot'
import { allowRequest, clientIp, requestCount } from '@/lib/request-guard'

/** Сколько неверных паролей подряд допускается с одного адреса и за какое время */
const LOGIN_ATTEMPTS = 5
const LOGIN_WINDOW_MS = 15 * 60_000

/* ── Вход и выход ──────────────────────────────────────────────────── */

export async function loginAction(_prev: { error?: string } | null, formData: FormData) {
  if (!isAuthConfigured()) {
    return { error: 'Не задана переменная ADMIN_PASSWORD_HASH — вход невозможен.' }
  }

  // Подбор пароля: после нескольких промахов подряд адрес ждёт четверть часа.
  // Считаем только неудачные попытки — верный вход счётчик не трогает
  const ip = clientIp({ headers: await headers() })
  if (requestCount('admin-login', ip, LOGIN_WINDOW_MS) >= LOGIN_ATTEMPTS) {
    console.warn(`[Admin] Вход временно закрыт для IP ${ip}: слишком много неверных попыток`)
    return { error: 'Слишком много неверных попыток. Попробуйте через 15 минут.' }
  }

  const password = String(formData.get('password') ?? '')

  if (!checkPassword(password)) {
    allowRequest('admin-login', ip, LOGIN_ATTEMPTS, LOGIN_WINDOW_MS)
    console.warn(`[Admin] Неверный пароль, IP ${ip}`)
    // Небольшая задержка гасит перебор паролей в лоб
    await new Promise((resolve) => setTimeout(resolve, 600))
    return { error: 'Неверный пароль.' }
  }

  const store = await cookies()
  store.set(ADMIN_COOKIE, createToken(), cookieOptions(14 * 86_400))
  redirect('/admin')
}

export async function logoutAction() {
  const store = await cookies()
  store.set(ADMIN_COOKIE, '', cookieOptions(0))
  redirect('/admin/login')
}

/* ── Действия над заявкой ──────────────────────────────────────────── */

export type StatusFormState = { error?: string; ok?: boolean } | null

/** Страницы, на которых виден статус заявки и занятость календаря */
function revalidateLead(id: string) {
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin/leads')
  revalidatePath('/admin/calendar')
  revalidatePath('/admin')
}

export async function changeStatusAction(_prev: StatusFormState, formData: FormData): Promise<StatusFormState> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as LeadStatus
  const rejectReason = String(formData.get('rejectReason') ?? '').trim()

  if (!id || !LEAD_STATUSES.includes(status)) return { error: 'Выберите статус.' }

  // «Замер назначен» занимает время в календаре — для заявки на замер это
  // то же самое подтверждение, с той же проверкой свободного слота
  if (status === CONFIRMED_STATUS) {
    const lead = await getLead(id)
    if (!lead) return { error: 'Заявка не найдена.' }
    const problem = await measurementConfirmError(lead)
    if (problem) return { error: problem }
  }

  await setLeadStatus(id, status, ADMIN_ACTOR, {
    rejectReason: rejectReason || null,
  })

  revalidateLead(id)
  return { ok: true }
}

/**
 * Подтверждение замера. Только после него время занимается в календаре
 * и перестаёт предлагаться на сайте.
 *
 * `confirm=0` снимает подтверждение: заявка возвращается «в работу»,
 * а время снова свободно.
 */
export async function confirmMeasurementAction(_prev: StatusFormState, formData: FormData): Promise<StatusFormState> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const confirm = String(formData.get('confirm') ?? '1') !== '0'
  if (!id) return { error: 'Заявка не найдена.' }

  const lead = await getLead(id)
  if (!lead || lead.type !== 'measurement') return { error: 'Заявка на замер не найдена.' }

  if (!confirm) {
    await setLeadStatus(id, 'in_progress', ADMIN_ACTOR)
    revalidateLead(id)
    return { ok: true }
  }

  const problem = await measurementConfirmError(lead)
  if (problem) return { error: problem }

  await setLeadStatus(id, CONFIRMED_STATUS, ADMIN_ACTOR)
  revalidateLead(id)
  return { ok: true }
}

export async function addNoteAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const note = String(formData.get('note') ?? '').trim().slice(0, 2000)
  if (!id || !note) return

  await addLeadNote(id, ADMIN_ACTOR, note)
  revalidatePath(`/admin/leads/${id}`)
}

export async function assignAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const assignee = String(formData.get('assignee') ?? '').trim().slice(0, 40)
  if (!id) return

  await assignLead(id, assignee || null, ADMIN_ACTOR)
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin/leads')
}

export async function setAmountAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const raw = String(formData.get('amount') ?? '').replace(/[^\d.]/g, '')
  if (!id) return

  const amount = raw === '' ? null : Number(raw)
  await setDealAmount(id, Number.isFinite(amount as number) ? amount : null, ADMIN_ACTOR)
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin')
}

export async function setReminderAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const when = String(formData.get('when') ?? '').trim()
  if (!id) return

  await setNextContact(id, when || null, ADMIN_ACTOR)
  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin')
}

/**
 * Перенос замера. Клиенты переносят постоянно, и без этого календарь
 * только показывает расписание, но не даёт им управлять.
 */
export async function rescheduleAction(
  _prev: { error?: string; ok?: boolean } | null,
  formData: FormData
): Promise<{ error?: string; ok?: boolean }> {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  const date = String(formData.get('date') ?? '').trim()
  const slot = String(formData.get('slot') ?? '').trim()

  if (!id) return { error: 'Заявка не найдена.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Выберите дату.' }
  if (!SLOT_VALUES.includes(slot)) return { error: 'Выберите время.' }

  // Себя из подсчёта исключаем, иначе перенос внутри того же слота упрётся
  // в собственную запись
  if (await isSlotFull(date, slot, slotCapacity(), id)) {
    return { error: `${slotLabel(slot)} на эту дату уже занято. Выберите другое время.` }
  }

  const lead = await rescheduleMeasurement(id, date, slot, ADMIN_ACTOR)
  if (!lead) return { error: 'Не удалось перенести замер.' }

  revalidatePath(`/admin/leads/${id}`)
  revalidatePath('/admin/calendar')
  revalidatePath('/admin')
  return { ok: true }
}

/* ── Файлы менеджера ───────────────────────────────────────────────── */

/**
 * Регистрирует загруженный файл за заявкой.
 *
 * Вызывается из браузера после того, как upload() вернул путь. Колбэк
 * onUploadCompleted для этого не годится: Vercel не может достучаться
 * до localhost, и на разработке запись бы просто не появлялась.
 */
export async function attachFileAction(file: {
  leadId: string
  pathname: string
  name: string
  size: number
  contentType: string
  kind: string
}): Promise<{ ok: boolean; error?: string }> {
  await requireSession()

  if (!file.leadId || !file.pathname) return { ok: false, error: 'Не хватает данных о файле.' }
  // Путь приходит из браузера, поэтому проверяем его так же, как в /admin/file
  if (!file.pathname.startsWith('leads/') || file.pathname.includes('..')) {
    return { ok: false, error: 'Недопустимый путь файла.' }
  }

  const kind = FILE_KINDS.some((k) => k.value === file.kind) ? file.kind : 'other'

  try {
    await addLeadUpload({
      leadId: file.leadId,
      pathname: file.pathname,
      name: file.name.slice(0, 160),
      size: Number.isFinite(file.size) ? Math.max(0, Math.trunc(file.size)) : 0,
      contentType: file.contentType.slice(0, 120),
      kind,
      uploadedBy: ADMIN_ACTOR,
    })
  } catch (error) {
    console.error('[Admin] Не удалось записать файл:', error)
    return { ok: false, error: 'Файл загрузился, но не записался в заявку.' }
  }

  revalidatePath(`/admin/leads/${file.leadId}`)
  return { ok: true }
}

export async function deleteFileAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('fileId') ?? '')
  const leadId = String(formData.get('id') ?? '')
  if (!id) return

  const removed = await removeLeadUpload(id, ADMIN_ACTOR)

  // Объект в хранилище убираем после записи в базе: если упадёт здесь,
  // останется осиротевший файл, а не запись без файла
  if (removed) {
    try {
      const { del } = await import('@vercel/blob')
      await del(removed.pathname)
    } catch (error) {
      console.error('[Admin] Файл удалён из заявки, но остался в хранилище:', error)
    }
  }

  revalidatePath(`/admin/leads/${leadId}`)
}

/**
 * Удаление заявки навсегда — для спама, дублей и тестовых заявок.
 * Вместе с ней уходят история, заметки и все файлы
 */
export async function deleteLeadAction(formData: FormData) {
  await requireSession()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const removed = await deleteLead(id)
  console.warn(`[Admin] Заявка ${id} удалена (${ADMIN_ACTOR})`)

  // Как и с файлами менеджера: сначала база, потом хранилище
  if (removed && removed.pathnames.length > 0) {
    try {
      const { del } = await import('@vercel/blob')
      await del(removed.pathnames)
    } catch (error) {
      console.error('[Admin] Заявка удалена, но файлы остались в хранилище:', error)
    }
  }

  revalidatePath('/admin/leads')
  revalidatePath('/admin/calendar')
  revalidatePath('/admin/analytics')
  revalidatePath('/admin')
  redirect('/admin/leads')
}

/* ── Настройки ─────────────────────────────────────────────────────── */

/** Тестовое уведомление — проверить, что бот MAX настроен и достаёт менеджеров */
export async function sendTestNotificationAction(): Promise<{ ok: boolean; message: string }> {
  await requireSession()
  try {
    const result = await sendMaxMessage({
      text: `🔔 **Проверка связи**\n\nЭто тестовое сообщение из админ-панели сайта.\n\nЕсли вы его видите — уведомления о заявках работают.`,
      format: 'markdown',
    })
    return result.ok
      ? { ok: true, message: `Отправлено через ${result.via ?? 'MAX'}.` }
      : { ok: false, message: result.error ?? 'Неизвестная ошибка отправки.' }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}
