'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireSession } from '@/lib/admin-auth'
import { flash } from '@/lib/admin-flash'
import { getLead, type Lead } from '@/lib/db'
import { normalizeRussianPhone } from '@/lib/phone'
import { deleteFiles } from '@/lib/storage'
import { hashClientPassword, MIN_PASSWORD, readablePassword } from '@/lib/cabinet-auth'
import {
  DuplicatePhoneError,
  addFeed,
  addOrderFiles,
  addVisit,
  bumpSessionVersion,
  createClient,
  createOrder,
  deleteClient,
  deleteOrder,
  deleteOrderFile,
  deleteVisit,
  getClient,
  getOrder,
  getOrderFile,
  issueToken,
  setClientBlocked,
  setClientPassword,
  setOrderSpec,
  setOrderStage,
  setProjectStatus,
  unlinkClientMax,
  updateClient,
  updateOrder,
  updateOrderFile,
} from '@/lib/cabinet-db'
import { createMaxLink } from '@/lib/cabinet-max'
import { cabinetUrl, notifyClient } from '@/lib/cabinet-notify'
import {
  ORDER_STAGES,
  PRODUCTION_DAYS,
  PRODUCTS,
  fileKind,
  formatDay,
  formatTime,
  isOrderStage,
  isProjectStatus,
  visitKindLabel,
  VISIT_KINDS,
  type Order,
  type SpecRow,
} from '@/lib/cabinet-shared'

/**
 * Действия панели над личными кабинетами клиентов и их заказами.
 * Клиент узнаёт о переменах сообщением в MAX (если привязан) и из ленты заказа.
 */

const INVITE_TTL_MS = 7 * 86_400_000

export type AdminResult = { ok?: boolean; error?: string } | null

function text(formData: FormData, key: string, max = 200): string {
  return String(formData.get(key) ?? '').trim().slice(0, max)
}

function dateOrNull(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function revalidateClient(clientId: string, orderId?: string) {
  revalidatePath('/admin/kabinety')
  revalidatePath(`/admin/kabinety/${clientId}`)
  if (orderId) {
    revalidatePath(`/admin/zakazy/${orderId}`)
    revalidatePath(`/kabinet/zakaz/${orderId}`)
  }
  revalidatePath('/kabinet')
}

/** Заказ и его клиент — для действий, которые пишут клиенту */
async function orderWithClient(orderId: string) {
  const order = await getOrder(orderId)
  const client = order ? await getClient(order.client_id) : null
  return order && client ? { order, client } : null
}

/** Заявка → этап и название заказа: замер назначен — «Замер и проект», сделка — «Договор» */
function fromLead(lead: Lead) {
  const details = (lead.details ?? {}) as Record<string, unknown>
  const product = details.product === 'wardrobe' ? 'wardrobe' : 'kitchen'
  const address = [details.city, details.address].filter((part) => typeof part === 'string' && part).join(', ')
  const stage = lead.status === 'scheduled' ? 'project' : lead.status === 'done' ? 'contract' : 'consultation'
  const title = `${product === 'wardrobe' ? 'Шкаф' : 'Кухня'}${address ? `, ${String(details.address ?? address)}` : ''}`
  return { product, address, stage, title: title.slice(0, 120) }
}

async function createOrderFromLead(clientId: string, lead: Lead): Promise<Order> {
  const draft = fromLead(lead)
  const order = await createOrder({
    clientId,
    leadId: lead.id,
    title: draft.title,
    product: draft.product,
    address: draft.address,
    managerName: lead.assigned_to ?? '',
  })
  if (draft.stage !== 'consultation') await setOrderStage(order.id, draft.stage, PRODUCTION_DAYS)
  await addFeed(order.id, 'system', 'created', 'Заказ открыт в личном кабинете')
  return order
}

/* ── Кабинет ─────────────────────────────────────────────────────── */

export type CreateClientResult = {
  ok?: boolean
  error?: string
  existingId?: string
  clientId?: string
  name?: string
  inviteUrl?: string
  password?: string
  maxUrl?: string | null
  maxCode?: string
  orderId?: string
} | null

/**
 * Новый кабинет. Доступ — на выбор: ссылка-приглашение (клиент сам задаёт
 * пароль) или пароль, который задаёт администратор и сообщает клиенту.
 * Сразу же готовится ссылка привязки MAX — её удобно отправить вместе.
 */
export async function createClientAction(_prev: CreateClientResult, formData: FormData): Promise<CreateClientResult> {
  await requireSession()
  const name = text(formData, 'name', 80).replace(/\s+/g, ' ')
  const phone = normalizeRussianPhone(text(formData, 'phone', 40))
  const mode = text(formData, 'mode') === 'password' ? 'password' : 'invite'
  const customPassword = text(formData, 'password', 64)
  const leadId = text(formData, 'leadId', 40)

  if (name.length < 2) return { error: 'Имя — хотя бы две буквы.' }
  if (!phone) return { error: 'Телефон — российский номер из 10 цифр после +7.' }
  if (mode === 'password' && customPassword && customPassword.length < MIN_PASSWORD) {
    return { error: `Пароль — не короче ${MIN_PASSWORD} символов, или оставьте поле пустым — придумаем сами.` }
  }

  let client
  try {
    client = await createClient({ name, phone })
  } catch (error) {
    if (error instanceof DuplicatePhoneError) return { error: error.message, existingId: error.clientId }
    throw error
  }

  const result: CreateClientResult = { ok: true, clientId: client.id, name }

  if (mode === 'password') {
    const password = customPassword || readablePassword()
    await setClientPassword(client.id, hashClientPassword(password))
    result.password = password
  } else {
    result.inviteUrl = cabinetUrl(`/priglashenie/${await issueToken(client.id, 'invite', INVITE_TTL_MS)}`)
  }

  const max = await createMaxLink(client.id)
  result.maxUrl = max.url
  result.maxCode = max.code

  const lead = leadId ? await getLead(leadId) : null
  if (lead) result.orderId = (await createOrderFromLead(client.id, lead)).id

  revalidateClient(client.id)
  if (lead) revalidatePath(`/admin/leads/${lead.id}`)
  return result
}

export async function issueInviteAction(clientId: string): Promise<{ url: string }> {
  await requireSession()
  const token = await issueToken(clientId, 'invite', INVITE_TTL_MS)
  revalidateClient(clientId)
  return { url: cabinetUrl(`/priglashenie/${token}`) }
}

/** Пароль от администратора: свой или сгенерированный. Прежние сессии клиента закрываются */
export async function setPasswordAction(clientId: string, custom: string): Promise<{ password?: string; error?: string }> {
  await requireSession()
  const password = custom.trim() || readablePassword()
  if (password.length < MIN_PASSWORD) return { error: `Пароль — не короче ${MIN_PASSWORD} символов.` }
  await setClientPassword(clientId, hashClientPassword(password))
  revalidateClient(clientId)
  return { password }
}

export async function maxLinkAdminAction(clientId: string): Promise<{ url: string | null; code: string }> {
  await requireSession()
  return createMaxLink(clientId)
}

export async function unlinkMaxAdminAction(formData: FormData) {
  await requireSession()
  const id = text(formData, 'id')
  await unlinkClientMax(id)
  revalidateClient(id)
}

export async function setBlockedAction(formData: FormData) {
  await requireSession()
  const id = text(formData, 'id')
  await setClientBlocked(id, formData.get('blocked') === '1')
  revalidateClient(id)
}

export async function logoutEverywhereAdminAction(formData: FormData) {
  await requireSession()
  const id = text(formData, 'id')
  await bumpSessionVersion(id)
  revalidateClient(id)
}

export async function updateClientAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  await requireSession()
  const id = text(formData, 'id')
  const name = text(formData, 'name', 80).replace(/\s+/g, ' ')
  const phone = normalizeRussianPhone(text(formData, 'phone', 40))
  if (name.length < 2) return { error: 'Имя — хотя бы две буквы.' }
  if (!phone) return { error: 'Телефон — российский номер из 10 цифр после +7.' }
  try {
    await updateClient(id, { name, phone })
  } catch (error) {
    if (error instanceof DuplicatePhoneError) return { error: 'Этот телефон уже у другого кабинета.' }
    throw error
  }
  revalidateClient(id)
  return { ok: true }
}

export async function deleteClientAction(formData: FormData) {
  await requireSession()
  const id = text(formData, 'id')
  const client = await getClient(id)
  const pathnames = await deleteClient(id)
  if (pathnames.length > 0) await deleteFiles(pathnames)
  revalidatePath('/admin/kabinety')
  if (client) await flash(`Кабинет «${client.name}» удалён`)
  redirect('/admin/kabinety')
}

/* ── Заказы ──────────────────────────────────────────────────────── */

export async function createOrderAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  await requireSession()
  const clientId = text(formData, 'clientId')
  const client = await getClient(clientId)
  if (!client) return { error: 'Кабинет не найден.' }

  const leadId = text(formData, 'leadId', 40)
  const lead = leadId ? await getLead(leadId) : null
  let order: Order
  if (lead) {
    order = await createOrderFromLead(client.id, lead)
  } else {
    const title = text(formData, 'title', 120)
    if (title.length < 2) return { error: 'Назовите заказ: например, «Кухня на Ленина, 12».' }
    const product = PRODUCTS.some((p) => p.value === text(formData, 'product')) ? text(formData, 'product') : 'kitchen'
    order = await createOrder({ clientId, title, product, address: text(formData, 'address', 240) })
    await addFeed(order.id, 'system', 'created', 'Заказ открыт в личном кабинете')
  }

  revalidateClient(clientId, order.id)
  if (lead) revalidatePath(`/admin/leads/${lead.id}`)
  await flash('Заказ создан')
  redirect(`/admin/zakazy/${order.id}`)
}

export async function updateOrderAction(_prev: AdminResult, formData: FormData): Promise<AdminResult> {
  await requireSession()
  const id = text(formData, 'id')
  const title = text(formData, 'title', 120)
  if (title.length < 2) return { error: 'Название заказа — хотя бы два символа.' }
  const product = PRODUCTS.some((p) => p.value === text(formData, 'product')) ? text(formData, 'product') : 'kitchen'
  const managerPhoneRaw = text(formData, 'managerPhone', 40)
  await updateOrder(id, {
    title,
    product,
    address: text(formData, 'address', 240),
    readyDate: dateOrNull(text(formData, 'readyDate')),
    productionStarted: dateOrNull(text(formData, 'productionStarted')),
    managerName: text(formData, 'managerName', 80),
    managerPhone: normalizeRussianPhone(managerPhoneRaw) || managerPhoneRaw,
  })
  const order = await getOrder(id)
  if (order) revalidateClient(order.client_id, id)
  return { ok: true }
}

export async function setStageAction(orderId: string, stage: string, notify: boolean): Promise<{ notified: boolean }> {
  await requireSession()
  if (!isOrderStage(stage)) throw new Error('Неизвестный этап')
  const found = await orderWithClient(orderId)
  if (!found) throw new Error('Заказ не найден')

  await setOrderStage(orderId, stage, PRODUCTION_DAYS)
  const info = ORDER_STAGES.find((s) => s.value === stage)!
  await addFeed(orderId, 'manager', 'stage', `Новый этап: ${info.label}`)
  const notified = notify
    ? await notifyClient(
        found.client,
        `📍 Заказ «${found.order.title}»: ${stage === 'done' ? 'готово!' : `новый этап — **${info.label}**`}\n\n${info.hint}`,
        { text: 'Открыть заказ', path: `/zakaz/${orderId}` }
      )
    : false
  revalidateClient(found.client.id, orderId)
  return { notified }
}

export async function addVisitAction(input: {
  orderId: string
  kind: string
  date: string
  time: string
  note: string
  notify: boolean
}): Promise<{ notified?: boolean; error?: string }> {
  await requireSession()
  const found = await orderWithClient(input.orderId)
  if (!found) return { error: 'Заказ не найден.' }
  if (!dateOrNull(input.date) || !/^\d{2}:\d{2}$/.test(input.time)) return { error: 'Укажите дату и время.' }
  const kind = VISIT_KINDS.some((k) => k.value === input.kind) ? input.kind : 'other'

  // Время вводят по Москве — так и сохраняем, независимо от часового пояса сервера
  const visit = await addVisit(input.orderId, kind, `${input.date}T${input.time}:00+03:00`, input.note.trim().slice(0, 500))
  const when = `${formatDay(visit.starts_at, true)}, ${formatTime(visit.starts_at)}`
  await addFeed(input.orderId, 'manager', 'visit', `${visitKindLabel(kind)}: ${when}${visit.note ? ` — ${visit.note}` : ''}`)
  const notified = input.notify
    ? await notifyClient(
        found.client,
        `📅 ${visitKindLabel(kind)} по заказу «${found.order.title}»\n**${when}**${visit.note ? `\n\n${visit.note}` : ''}\n\nЕсли время неудобно — нажмите «Перенести» в кабинете.`,
        { text: 'Открыть заказ', path: `/zakaz/${input.orderId}` }
      )
    : false
  revalidateClient(found.client.id, input.orderId)
  return { notified }
}

export async function deleteVisitAction(visitId: string): Promise<void> {
  await requireSession()
  const visit = await deleteVisit(visitId)
  if (!visit) return
  await addFeed(visit.order_id, 'manager', 'visit', `${visitKindLabel(visit.kind)} ${formatDay(visit.starts_at)} отменён`)
  const order = await getOrder(visit.order_id)
  if (order) revalidateClient(order.client_id, order.id)
}

export async function saveSpecAction(orderId: string, rows: SpecRow[]): Promise<void> {
  await requireSession()
  const clean = rows
    .map((row) => ({ label: String(row.label ?? '').trim().slice(0, 60), value: String(row.value ?? '').trim().slice(0, 300) }))
    .filter((row) => row.label || row.value)
    .slice(0, 40)
  await setOrderSpec(orderId, clean)
  const order = await getOrder(orderId)
  if (order) revalidateClient(order.client_id, orderId)
}

/** Отправить проект на согласование — или вручную поставить статус (согласовали по телефону) */
export async function setProjectStatusAction(orderId: string, status: string, notify: boolean): Promise<{ notified: boolean }> {
  await requireSession()
  if (!isProjectStatus(status)) throw new Error('Неизвестный статус проекта')
  const found = await orderWithClient(orderId)
  if (!found) throw new Error('Заказ не найден')

  await setProjectStatus(orderId, status)
  const feedText = {
    sent: 'Проект отправлен на согласование',
    approved: 'Проект отмечен согласованным',
    changes: 'Проект на доработке',
    none: 'Проект снят с согласования',
  }[status]
  await addFeed(orderId, 'manager', 'project', feedText)
  const notified =
    notify && status === 'sent'
      ? await notifyClient(
          found.client,
          `🎨 Проект по заказу «${found.order.title}» готов!\n\nПосмотрите визуализации и спецификацию в кабинете и нажмите «Согласовать» — или напишите, что поправить.`,
          { text: 'Посмотреть проект', path: `/zakaz/${orderId}` }
        )
      : false
  revalidateClient(found.client.id, orderId)
  return { notified }
}

/** Файлы заказа после загрузки в хранилище: одна запись в ленте и одно сообщение на всю пачку */
export async function attachOrderFilesAction(input: {
  orderId: string
  kind: string
  visible: boolean
  notify: boolean
  files: Array<{ pathname: string; name: string; size: number; contentType: string; caption: string }>
}): Promise<{ notified?: boolean; error?: string }> {
  await requireSession()
  const found = await orderWithClient(input.orderId)
  if (!found) return { error: 'Заказ не найден.' }
  const prefix = `orders/${input.orderId}/`
  const files = input.files.filter((file) => file.pathname.startsWith(prefix) && !file.pathname.includes('..'))
  if (files.length === 0) return { error: 'Нет файлов для сохранения.' }

  const kind = fileKind(input.kind)
  await addOrderFiles(
    input.orderId,
    files.map((file) => ({
      ...file,
      name: file.name.slice(0, 200),
      caption: file.caption.trim().slice(0, 200),
      kind: kind.value,
      visible: input.visible,
    }))
  )

  const count = files.length
  const what =
    kind.group === 'photo'
      ? `Новые фото в фотоотчёте: ${count}`
      : kind.group === 'project'
        ? `Визуализации проекта: ${count}`
        : count === 1
          ? `Новый документ: ${files[0].caption || files[0].name}`
          : `Новые документы: ${count}`
  let notified = false
  if (input.visible) {
    await addFeed(input.orderId, 'manager', kind.group === 'photo' ? 'photo' : 'file', what)
    if (input.notify) {
      const emoji = kind.group === 'photo' ? '📸' : kind.group === 'project' ? '🎨' : '📄'
      notified = await notifyClient(found.client, `${emoji} Заказ «${found.order.title}»: ${what.toLowerCase()}`, {
        text: 'Открыть заказ',
        path: `/zakaz/${input.orderId}`,
      })
    }
  }
  revalidateClient(found.client.id, input.orderId)
  return { notified }
}

export async function updateOrderFileAction(fileId: string, patch: { visible?: boolean; caption?: string }): Promise<void> {
  await requireSession()
  const file = await getOrderFile(fileId)
  if (!file) return
  await updateOrderFile(fileId, {
    visible: patch.visible,
    caption: patch.caption === undefined ? undefined : patch.caption.trim().slice(0, 200),
  })
  const order = await getOrder(file.order_id)
  if (order) revalidateClient(order.client_id, order.id)
}

export async function deleteOrderFileAction(fileId: string): Promise<void> {
  await requireSession()
  const file = await deleteOrderFile(fileId)
  if (!file) return
  await deleteFiles([file.pathname])
  const order = await getOrder(file.order_id)
  if (order) revalidateClient(order.client_id, order.id)
}

/** Сообщение клиенту: в ленту заказа и в MAX */
export async function postMessageAction(orderId: string, message: string, notify: boolean): Promise<{ notified?: boolean; error?: string }> {
  await requireSession()
  const found = await orderWithClient(orderId)
  if (!found) return { error: 'Заказ не найден.' }
  const body = message.trim().slice(0, 2000)
  if (body.length < 2) return { error: 'Пустое сообщение.' }

  await addFeed(orderId, 'manager', 'message', body)
  const notified = notify
    ? await notifyClient(found.client, `💬 По заказу «${found.order.title}»:\n\n${body}`, {
        text: 'Открыть заказ',
        path: `/zakaz/${orderId}`,
      })
    : false
  revalidateClient(found.client.id, orderId)
  return { notified }
}

export async function deleteOrderAction(formData: FormData) {
  await requireSession()
  const id = text(formData, 'id')
  const order = await getOrder(id)
  if (!order) redirect('/admin/kabinety')
  const pathnames = await deleteOrder(id)
  if (pathnames.length > 0) await deleteFiles(pathnames)
  revalidateClient(order.client_id)
  await flash(`Заказ «${order.title}» удалён`)
  redirect(`/admin/kabinety/${order.client_id}`)
}
