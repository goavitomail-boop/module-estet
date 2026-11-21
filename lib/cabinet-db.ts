import { createHash, randomBytes } from 'node:crypto'
import { db, ensureSchema } from '@/lib/db'
import type {
  Client,
  Order,
  OrderFeedItem,
  OrderFile,
  OrderVisit,
  PublicClient,
  SpecRow,
} from '@/lib/cabinet-shared'

/**
 * Данные личного кабинета: клиенты, одноразовые ссылки и коды, заказы,
 * визиты, файлы и лента заказа. Таблицы создаёт ensureSchema (lib/db.ts).
 */

/* ── Помощники ─────────────────────────────────────────────────────── */

/** Короткий случайный id без похожих символов */
function newId(prefix: string): string {
  return `${prefix}${randomBytes(6).toString('base64url').replace(/[-_]/g, 'x')}`
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function toPublicClient(client: Client): PublicClient {
  const { password_hash, ...rest } = client
  return { ...rest, has_password: Boolean(password_hash) }
}

/**
 * DATE → «YYYY-MM-DD». Драйвер разбирает DATE в объект Date на полночь
 * по времени сервера, поэтому берём местные год, месяц и день: через
 * toISOString() на сервере восточнее UTC дата съехала бы на день назад.
 */
function dateOnly(value: unknown): string | null {
  if (!value) return null
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
  }
  const text = String(value)
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : null
}

/** Время → ISO-строка: драйвер отдаёт TIMESTAMPTZ объектом Date, а в браузер уходят строки */
function isoTime(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value)
}

function normalizeOrder(row: Order): Order {
  return {
    ...row,
    ready_date: dateOnly(row.ready_date),
    production_started: dateOnly(row.production_started),
    spec: Array.isArray(row.spec) ? row.spec : [],
    created_at: isoTime(row.created_at),
    updated_at: isoTime(row.updated_at),
  }
}

/* ── Клиенты ───────────────────────────────────────────────────────── */

export class DuplicatePhoneError extends Error {
  constructor(public clientId: string) {
    super('Кабинет с этим телефоном уже есть.')
  }
}

export async function createClient(input: { name: string; phone: string }): Promise<Client> {
  await ensureSchema()
  const sql = db()
  const digits = phoneDigits(input.phone)
  const existing = await getClientByPhone(digits)
  if (existing) throw new DuplicatePhoneError(existing.id)

  const id = newId('k')
  const rows = (await sql`
    INSERT INTO clients (id, name, phone, phone_digits)
    VALUES (${id}, ${input.name}, ${input.phone}, ${digits})
    RETURNING *
  `) as unknown as Client[]
  return rows[0]
}

export async function getClient(id: string): Promise<Client | null> {
  await ensureSchema()
  const rows = (await db()`SELECT * FROM clients WHERE id = ${id}`) as unknown as Client[]
  return rows[0] ?? null
}

export async function getClientByPhone(digits: string): Promise<Client | null> {
  await ensureSchema()
  const rows = (await db()`SELECT * FROM clients WHERE phone_digits = ${digits}`) as unknown as Client[]
  return rows[0] ?? null
}

export async function getClientByMaxUser(userId: string): Promise<Client | null> {
  await ensureSchema()
  const rows = (await db()`SELECT * FROM clients WHERE max_user_id = ${userId} LIMIT 1`) as unknown as Client[]
  return rows[0] ?? null
}

export interface ClientListRow extends PublicClient {
  orders: number
  active_orders: number
  last_order_at: string | null
}

export async function listClients(search = ''): Promise<ClientListRow[]> {
  await ensureSchema()
  const sql = db()
  const q = search.trim().toLowerCase()
  const digits = phoneDigits(q)
  const rows = (await sql`
    SELECT c.*,
           count(o.id)::int AS orders,
           count(o.id) FILTER (WHERE o.stage <> 'done')::int AS active_orders,
           max(o.updated_at) AS last_order_at
      FROM clients c
      LEFT JOIN orders o ON o.client_id = c.id
     WHERE ${q} = ''
        OR (${digits.length >= 3} AND c.phone_digits LIKE ${`%${digits}%`})
        OR lower(c.name) LIKE ${`%${q}%`}
     GROUP BY c.id
     ORDER BY COALESCE(max(o.updated_at), c.created_at) DESC
     LIMIT 200
  `) as unknown as Array<Client & { orders: number; active_orders: number; last_order_at: string | null }>
  return rows.map((row) => ({ ...toPublicClient(row), orders: row.orders, active_orders: row.active_orders, last_order_at: row.last_order_at }))
}

export async function updateClient(id: string, patch: { name: string; phone: string }): Promise<void> {
  await ensureSchema()
  const digits = phoneDigits(patch.phone)
  const other = await getClientByPhone(digits)
  if (other && other.id !== id) throw new DuplicatePhoneError(other.id)
  await db()`UPDATE clients SET name = ${patch.name}, phone = ${patch.phone}, phone_digits = ${digits} WHERE id = ${id}`
}

/** Новый пароль сбрасывает все прежние сессии: войти со старым уже нельзя */
export async function setClientPassword(id: string, passwordHash: string): Promise<void> {
  await ensureSchema()
  await db()`
    UPDATE clients SET password_hash = ${passwordHash}, session_version = session_version + 1 WHERE id = ${id}
  `
}

export async function setClientBlocked(id: string, blocked: boolean): Promise<void> {
  await ensureSchema()
  await db()`UPDATE clients SET blocked = ${blocked}, session_version = session_version + 1 WHERE id = ${id}`
}

/** «Выйти на всех устройствах» — все выданные куки перестают подходить */
export async function bumpSessionVersion(id: string): Promise<void> {
  await ensureSchema()
  await db()`UPDATE clients SET session_version = session_version + 1 WHERE id = ${id}`
}

/** Один MAX — один кабинет: у прежнего владельца привязка снимается */
export async function linkClientMax(id: string, maxUserId: string): Promise<void> {
  await ensureSchema()
  const sql = db()
  await sql`UPDATE clients SET max_user_id = NULL WHERE max_user_id = ${maxUserId} AND id <> ${id}`
  await sql`UPDATE clients SET max_user_id = ${maxUserId} WHERE id = ${id}`
}

export async function unlinkClientMax(id: string): Promise<void> {
  await ensureSchema()
  await db()`UPDATE clients SET max_user_id = NULL WHERE id = ${id}`
}

export async function touchClientLogin(id: string): Promise<void> {
  await db()`UPDATE clients SET last_login_at = now() WHERE id = ${id}`
}

/** Удаление кабинета вместе с заказами. Возвращает файлы — их чистит вызывающий из хранилища */
export async function deleteClient(id: string): Promise<string[]> {
  await ensureSchema()
  const sql = db()
  const files = (await sql`
    SELECT f.pathname FROM order_files f JOIN orders o ON o.id = f.order_id WHERE o.client_id = ${id}
  `) as unknown as Array<{ pathname: string }>
  await sql`DELETE FROM clients WHERE id = ${id}`
  return files.map((f) => f.pathname)
}

/* ── Одноразовые ссылки и коды ─────────────────────────────────────── */

export type TokenPurpose = 'invite' | 'max_link' | 'login'

export interface TokenRow {
  id: string
  client_id: string
  purpose: TokenPurpose
  code_hash: string | null
  attempts: number
  expires_at: string
  used_at: string | null
}

/**
 * Выдаёт токен. В базу — только хеши, сам токен возвращается один раз.
 * Новый токен того же назначения отменяет прежние: работает последняя ссылка.
 */
export async function issueToken(
  clientId: string,
  purpose: TokenPurpose,
  ttlMs: number,
  code?: string
): Promise<string> {
  await ensureSchema()
  const sql = db()
  const token = randomBytes(24).toString('base64url')
  await sql`
    UPDATE client_tokens SET used_at = now()
     WHERE client_id = ${clientId} AND purpose = ${purpose} AND used_at IS NULL
  `
  await sql`
    INSERT INTO client_tokens (client_id, purpose, token_hash, code_hash, expires_at)
    VALUES (${clientId}, ${purpose}, ${sha256(token)}, ${code ? sha256(code) : null},
            now() + make_interval(secs => ${Math.round(ttlMs / 1000)}))
  `
  return token
}

/** Действующий токен по самому токену (ссылка) */
export async function findToken(token: string, purpose: TokenPurpose): Promise<TokenRow | null> {
  await ensureSchema()
  const rows = (await db()`
    SELECT * FROM client_tokens
     WHERE token_hash = ${sha256(token)} AND purpose = ${purpose}
       AND used_at IS NULL AND expires_at > now()
  `) as unknown as TokenRow[]
  return rows[0] ?? null
}

/** Действующий токен по короткому коду (привязка MAX, когда код набирают руками) */
export async function findTokenByCode(code: string, purpose: TokenPurpose): Promise<TokenRow | null> {
  await ensureSchema()
  const rows = (await db()`
    SELECT * FROM client_tokens
     WHERE code_hash = ${sha256(code)} AND purpose = ${purpose}
       AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1
  `) as unknown as TokenRow[]
  return rows[0] ?? null
}

/** Последний действующий код входа клиента */
export async function latestToken(clientId: string, purpose: TokenPurpose): Promise<TokenRow | null> {
  await ensureSchema()
  const rows = (await db()`
    SELECT * FROM client_tokens
     WHERE client_id = ${clientId} AND purpose = ${purpose}
       AND used_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC LIMIT 1
  `) as unknown as TokenRow[]
  return rows[0] ?? null
}

/** Погасить токен. Атомарно: двойное нажатие по ссылке пройдёт только один раз */
export async function consumeToken(id: string): Promise<boolean> {
  const rows = (await db()`
    UPDATE client_tokens SET used_at = now() WHERE id = ${id} AND used_at IS NULL RETURNING id
  `) as unknown as Array<{ id: string }>
  return rows.length > 0
}

export async function countTokenAttempt(id: string): Promise<number> {
  const rows = (await db()`
    UPDATE client_tokens SET attempts = attempts + 1 WHERE id = ${id} RETURNING attempts
  `) as unknown as Array<{ attempts: number }>
  return rows[0]?.attempts ?? 99
}

/** Есть ли у клиента неиспользованное приглашение — для статуса в панели */
export async function hasPendingInvite(clientId: string): Promise<boolean> {
  return Boolean(await latestToken(clientId, 'invite'))
}

/* ── Заказы ────────────────────────────────────────────────────────── */

export async function createOrder(input: {
  clientId: string
  leadId?: string | null
  title: string
  product: string
  address?: string
  managerName?: string
  managerPhone?: string
}): Promise<Order> {
  await ensureSchema()
  const id = newId('z')
  const rows = (await db()`
    INSERT INTO orders (id, client_id, lead_id, title, product, address, manager_name, manager_phone)
    VALUES (${id}, ${input.clientId}, ${input.leadId ?? null}, ${input.title}, ${input.product},
            ${input.address ?? ''}, ${input.managerName ?? ''}, ${input.managerPhone ?? ''})
    RETURNING *
  `) as unknown as Order[]
  return normalizeOrder(rows[0])
}

export async function getOrder(id: string): Promise<Order | null> {
  await ensureSchema()
  const rows = (await db()`SELECT * FROM orders WHERE id = ${id}`) as unknown as Order[]
  return rows[0] ? normalizeOrder(rows[0]) : null
}

export async function listOrders(clientId: string): Promise<Order[]> {
  await ensureSchema()
  const rows = (await db()`
    SELECT * FROM orders WHERE client_id = ${clientId}
     ORDER BY (stage = 'done'), created_at DESC
  `) as unknown as Order[]
  return rows.map(normalizeOrder)
}

export async function listOrdersByLead(leadId: string): Promise<Order[]> {
  await ensureSchema()
  const rows = (await db()`SELECT * FROM orders WHERE lead_id = ${leadId} ORDER BY created_at DESC`) as unknown as Order[]
  return rows.map(normalizeOrder)
}

export async function updateOrder(
  id: string,
  patch: {
    title: string
    product: string
    address: string
    readyDate: string | null
    productionStarted: string | null
    managerName: string
    managerPhone: string
  }
): Promise<void> {
  await ensureSchema()
  await db()`
    UPDATE orders
       SET title = ${patch.title}, product = ${patch.product}, address = ${patch.address},
           ready_date = ${patch.readyDate}::date, production_started = ${patch.productionStarted}::date,
           manager_name = ${patch.managerName}, manager_phone = ${patch.managerPhone},
           updated_at = now()
     WHERE id = ${id}
  `
}

/**
 * Смена этапа. Вход в «Производство» без даты начала ставит сегодняшнюю,
 * а без даты готовности — сегодня + 14 дней: полоса прогресса у клиента
 * работает сразу, менеджер может поправить даты потом.
 */
export async function setOrderStage(id: string, stage: string, productionDays: number): Promise<void> {
  await ensureSchema()
  await db()`
    UPDATE orders
       SET stage = ${stage},
           production_started = CASE WHEN ${stage} = 'production' AND production_started IS NULL
                                     THEN (now() AT TIME ZONE 'Europe/Moscow')::date ELSE production_started END,
           ready_date = CASE WHEN ${stage} = 'production' AND ready_date IS NULL
                             THEN (now() AT TIME ZONE 'Europe/Moscow')::date + ${productionDays}::int ELSE ready_date END,
           updated_at = now()
     WHERE id = ${id}
  `
}

export async function setOrderSpec(id: string, spec: SpecRow[]): Promise<void> {
  await ensureSchema()
  await db()`UPDATE orders SET spec = ${JSON.stringify(spec)}::jsonb, updated_at = now() WHERE id = ${id}`
}

export async function setProjectStatus(id: string, status: string): Promise<void> {
  await ensureSchema()
  await db()`UPDATE orders SET project_status = ${status}, updated_at = now() WHERE id = ${id}`
}

export async function deleteOrder(id: string): Promise<string[]> {
  await ensureSchema()
  const sql = db()
  const files = (await sql`SELECT pathname FROM order_files WHERE order_id = ${id}`) as unknown as Array<{ pathname: string }>
  await sql`DELETE FROM orders WHERE id = ${id}`
  return files.map((f) => f.pathname)
}

/* ── Визиты ────────────────────────────────────────────────────────── */

export async function addVisit(orderId: string, kind: string, startsAt: string, note: string): Promise<OrderVisit> {
  await ensureSchema()
  const rows = (await db()`
    INSERT INTO order_visits (order_id, kind, starts_at, note)
    VALUES (${orderId}, ${kind}, ${startsAt}::timestamptz, ${note})
    RETURNING *
  `) as unknown as OrderVisit[]
  await db()`UPDATE orders SET updated_at = now() WHERE id = ${orderId}`
  return rows[0]
}

export async function listVisits(orderId: string): Promise<OrderVisit[]> {
  await ensureSchema()
  return (await db()`SELECT * FROM order_visits WHERE order_id = ${orderId} ORDER BY starts_at`) as unknown as OrderVisit[]
}

export async function getVisit(id: string): Promise<OrderVisit | null> {
  await ensureSchema()
  if (!/^\d+$/.test(id)) return null
  const rows = (await db()`SELECT * FROM order_visits WHERE id = ${id}`) as unknown as OrderVisit[]
  return rows[0] ?? null
}

export async function deleteVisit(id: string): Promise<OrderVisit | null> {
  await ensureSchema()
  const rows = (await db()`DELETE FROM order_visits WHERE id = ${id} RETURNING *`) as unknown as OrderVisit[]
  return rows[0] ?? null
}

/** Ближайший визит по каждому заказу клиента — для карточек на главной кабинета */
export async function nextVisits(orderIds: string[]): Promise<Record<string, OrderVisit>> {
  if (orderIds.length === 0) return {}
  await ensureSchema()
  const rows = (await db()`
    SELECT DISTINCT ON (order_id) *
      FROM order_visits
     WHERE order_id = ANY(${orderIds}) AND starts_at > now() - interval '3 hours'
     ORDER BY order_id, starts_at
  `) as unknown as OrderVisit[]
  return Object.fromEntries(rows.map((row) => [row.order_id, row]))
}

/* ── Файлы ─────────────────────────────────────────────────────────── */

export async function addOrderFiles(
  orderId: string,
  files: Array<{ pathname: string; name: string; size: number; contentType: string; kind: string; caption: string; visible: boolean }>
): Promise<void> {
  await ensureSchema()
  const sql = db()
  for (const file of files) {
    await sql`
      INSERT INTO order_files (order_id, pathname, name, size, content_type, kind, caption, visible)
      VALUES (${orderId}, ${file.pathname}, ${file.name}, ${file.size}, ${file.contentType}, ${file.kind}, ${file.caption}, ${file.visible})
    `
  }
  await sql`UPDATE orders SET updated_at = now() WHERE id = ${orderId}`
}

export async function listOrderFiles(orderId: string, visibleOnly = false): Promise<OrderFile[]> {
  await ensureSchema()
  return (await db()`
    SELECT * FROM order_files
     WHERE order_id = ${orderId} AND (${!visibleOnly} OR visible)
     ORDER BY created_at DESC, id DESC
  `) as unknown as OrderFile[]
}

export async function getOrderFile(id: string): Promise<OrderFile | null> {
  await ensureSchema()
  if (!/^\d+$/.test(id)) return null
  const rows = (await db()`SELECT * FROM order_files WHERE id = ${id}`) as unknown as OrderFile[]
  return rows[0] ?? null
}

export async function updateOrderFile(id: string, patch: { visible?: boolean; caption?: string }): Promise<void> {
  await ensureSchema()
  const sql = db()
  if (patch.visible !== undefined) await sql`UPDATE order_files SET visible = ${patch.visible} WHERE id = ${id}`
  if (patch.caption !== undefined) await sql`UPDATE order_files SET caption = ${patch.caption} WHERE id = ${id}`
}

export async function deleteOrderFile(id: string): Promise<OrderFile | null> {
  await ensureSchema()
  const rows = (await db()`DELETE FROM order_files WHERE id = ${id} RETURNING *`) as unknown as OrderFile[]
  return rows[0] ?? null
}

/* ── Лента заказа ──────────────────────────────────────────────────── */

export async function addFeed(orderId: string, actor: OrderFeedItem['actor'], kind: string, text: string): Promise<void> {
  try {
    await ensureSchema()
    await db()`INSERT INTO order_feed (order_id, actor, kind, text) VALUES (${orderId}, ${actor}, ${kind}, ${text})`
  } catch (error) {
    // Лента — журнал: её сбой не должен ронять само действие
    console.error('[Кабинет] Не удалось записать событие заказа:', error)
  }
}

export async function listFeed(orderId: string, limit = 50): Promise<OrderFeedItem[]> {
  await ensureSchema()
  return (await db()`
    SELECT * FROM order_feed WHERE order_id = ${orderId} ORDER BY created_at DESC, id DESC LIMIT ${limit}
  `) as unknown as OrderFeedItem[]
}
