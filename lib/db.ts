import { neon, neonConfig } from '@neondatabase/serverless'
import { SLOT_VALUES, slotCapacity, slotLabel } from '@/lib/measurement-slots'

/**
 * Хранилище заявок на Neon Postgres.
 * Строка подключения берётся из DATABASE_URL (Vercel → Storage → Neon подставляет её сам).
 */

export const LEAD_STATUSES = ['new', 'in_progress', 'scheduled', 'done', 'rejected'] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]

/**
 * Статус, в котором замер считается подтверждённым и занимает время
 * в календаре. До него заявка — только просьба клиента о выезде
 */
export const CONFIRMED_STATUS: LeadStatus = 'scheduled'

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: '🆕 Новая',
  in_progress: '🔧 В работе',
  scheduled: '📅 Замер назначен',
  done: '✅ Закрыта',
  rejected: '❌ Отказ',
}

export type LeadType = 'measurement' | 'project'

export const TYPE_LABELS: Record<LeadType, string> = {
  measurement: '📐 Замер',
  project: '✨ Проект',
}

/** Причины отказа — для аналитики «почему теряем клиентов» */
export const REJECT_REASONS = [
  'Дорого',
  'Не дозвонились',
  'Выбрал другую компанию',
  'Передумал / отложил',
  'Не наш регион',
  'Спам / ошибка',
  'Другое',
] as const
export type RejectReason = (typeof REJECT_REASONS)[number]

export interface LeadUtm {
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}

export interface Lead {
  id: string
  type: LeadType
  name: string
  phone: string
  phone_digits: string
  status: LeadStatus
  details: Record<string, unknown>
  ip: string | null
  created_at: string
  updated_at: string
  status_by: string | null
  /* ── поля админ-панели ── */
  utm: LeadUtm | null
  referrer: string | null
  landing_page: string | null
  user_agent: string | null
  assigned_to: string | null
  reject_reason: string | null
  deal_amount: string | null
  next_contact_at: string | null
  first_response_at: string | null
  reminder_sent_at: string | null
}

/** Запись в истории заявки: смена статуса, заметка, назначение менеджера */
export interface LeadEvent {
  id: number
  lead_id: string
  actor: string
  kind: 'status' | 'note' | 'assign' | 'amount' | 'reminder' | 'reschedule' | 'file'
  from_status: string | null
  to_status: string | null
  comment: string | null
  created_at: string
}

/**
 * Строка подключения к Postgres.
 *
 * Интеграция Vercel → Neon заводит сразу несколько переменных с одним и тем же
 * адресом, и какая именно появится, зависит от версии интеграции. Поэтому берём
 * первую доступную, а не одну жёстко заданную: иначе достаточно переподключить
 * хранилище, чтобы заявки молча перестали сохраняться.
 *
 * Порядок не случайный: сначала пулерные адреса (их и ждёт serverless-драйвер),
 * прямое подключение — последним запасным вариантом.
 */
const DB_URL_VARS = ['DATABASE_URL', 'POSTGRES_URL', 'DATABASE_URL_UNPOOLED', 'POSTGRES_URL_NON_POOLING'] as const

export function databaseUrl(): string | undefined {
  for (const name of DB_URL_VARS) {
    const value = process.env[name]?.trim()
    if (value) return value
  }
  return undefined
}

/** Имя переменной, из которой реально взято подключение — показывается в настройках */
export function databaseUrlSource(): string | null {
  for (const name of DB_URL_VARS) {
    if (process.env[name]?.trim()) return name
  }
  return null
}

export function isDbConfigured(): boolean {
  return Boolean(databaseUrl())
}

/**
 * Соединение до Neon иногда рвётся на уровне TCP (ECONNRESET, fetch failed) —
 * особенно при большом географическом расстоянии до региона базы. Одна такая
 * потеря пакета не должна превращаться в 500 на странице или в потерянную заявку,
 * поэтому сетевые сбои повторяем.
 *
 * Повторяем ТОЛЬКО транспортные ошибки: если Postgres ответил (нарушение
 * ограничения, ошибка синтаксиса), запрос уходит наверх как есть.
 *
 * Запрос теоретически может успеть выполниться до обрыва, поэтому повтор
 * безопасен лишь для идемпотентных операций. Все записи здесь такие:
 * createLead — ON CONFLICT DO NOTHING, обновления статуса и полей
 * присваивают абсолютное значение. Исключение — вставка в lead_events:
 * в худшем случае в истории продублируется строка, что несопоставимо
 * дешевле потерянного действия менеджера.
 */
function isTransient(error: unknown): boolean {
  const cause = (error as { sourceError?: { cause?: { code?: string } } })?.sourceError?.cause
  const code = cause?.code ?? (error as { code?: string })?.code
  if (code && ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN'].includes(code)) {
    return true
  }
  // TimeoutError — наш собственный срок из retryingFetch
  if ((error as { name?: string })?.name === 'TimeoutError') return true
  // «terminated» — так undici сообщает об обрыве уже на чтении тела ответа
  return /fetch failed|Error connecting to database|socket hang up|terminated|timed? ?out/i.test(
    error instanceof Error ? error.message : String(error)
  )
}

const RETRY_DELAYS_MS = [150, 600]
/** Сколько ждём один ответ базы */
const REQUEST_TIMEOUT_MS = 8_000
/** Сколько всего готовы потратить на запрос вместе с повторами */
const TOTAL_BUDGET_MS = 12_000

/**
 * Тело ответа читаем здесь же, а не отдаём потоком наружу.
 *
 * Соединение до Neon чаще обрывается не на самом запросе, а на чтении
 * ответа: fetch к тому моменту уже вернул заголовки, и повторить запрос
 * снаружи нечем — ошибка всплывает внутри драйвера как «terminated».
 * Ответы здесь — небольшой JSON, так что буфер ничего не стоит.
 */
async function retryingFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const startedAt = Date.now()
  let lastError: unknown

  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    // Без срока запрос к недоступной базе висит, пока его не снимет платформа,
    // и вместе с ним висит страница. Лучше быстро сдаться: вызывающий код
    // умеет показать запасные данные
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    const signal = init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout

    try {
      const response = await fetch(input, { ...init, signal })
      const body = await response.arrayBuffer()
      return new Response(body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    } catch (error) {
      lastError = error
      const spent = Date.now() - startedAt
      if (!isTransient(error) || attempt === RETRY_DELAYS_MS.length || spent >= TOTAL_BUDGET_MS) break
      console.warn(`[DB] Сеть до базы оборвалась, повтор ${attempt + 1}…`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  }
  throw lastError
}

// fetchFunction задаётся только глобально: neon(url, {...}) такую опцию
// молча игнорирует, поэтому ставим её один раз на модуль.
neonConfig.fetchFunction = retryingFetch

function client() {
  const url = databaseUrl()
  if (!url) {
    throw new Error(
      `Не задана строка подключения к базе. Ожидается одна из переменных: ${DB_URL_VARS.join(', ')}`
    )
  }
  return neon(url)
}

let schemaReady: Promise<void> | null = null

/** Создаёт таблицы при первом обращении. Безопасно вызывать сколько угодно раз. */
export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      const sql = client()
      await sql`
        CREATE TABLE IF NOT EXISTS leads (
          id           TEXT PRIMARY KEY,
          type         TEXT NOT NULL,
          name         TEXT NOT NULL,
          phone        TEXT NOT NULL,
          phone_digits TEXT NOT NULL DEFAULT '',
          status       TEXT NOT NULL DEFAULT 'new',
          details      JSONB NOT NULL DEFAULT '{}'::jsonb,
          ip           TEXT,
          status_by    TEXT,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS leads_status_idx  ON leads (status)`
      await sql`CREATE INDEX IF NOT EXISTS leads_type_idx    ON leads (type)`
      await sql`CREATE INDEX IF NOT EXISTS leads_phone_idx   ON leads (phone_digits)`
      await sql`
        CREATE TABLE IF NOT EXISTS bot_users (
          user_id    TEXT PRIMARY KEY,
          name       TEXT,
          chat_id    TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          seen_at    TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `

      /* ── Поля, добавленные вместе с админ-панелью.
            ADD COLUMN IF NOT EXISTS — чтобы база, созданная до неё, доехала сама. ── */
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS utm             JSONB`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS referrer        TEXT`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS landing_page    TEXT`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS user_agent      TEXT`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to     TEXT`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS reject_reason   TEXT`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_amount     NUMERIC(12,2)`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_contact_at TIMESTAMPTZ`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMPTZ`
      await sql`ALTER TABLE leads ADD COLUMN IF NOT EXISTS reminder_sent_at  TIMESTAMPTZ`

      await sql`
        CREATE TABLE IF NOT EXISTS lead_events (
          id          BIGSERIAL PRIMARY KEY,
          lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          actor       TEXT NOT NULL DEFAULT '',
          kind        TEXT NOT NULL DEFAULT 'note',
          from_status TEXT,
          to_status   TEXT,
          comment     TEXT,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS lead_events_lead_idx ON lead_events (lead_id, created_at DESC)`
      await sql`CREATE INDEX IF NOT EXISTS leads_next_contact_idx ON leads (next_contact_at) WHERE next_contact_at IS NOT NULL`

      /**
       * Прохождение квиза — по строке на попытку, а не по строке на шаг.
       * Хранится только номер дальнего достигнутого шага: этого достаточно для
       * воронки, а данных получается в десять раз меньше.
       *
       * Персональных данных здесь нет вовсе: id — случайная строка из
       * sessionStorage браузера, имя и телефон в эту таблицу не попадают.
       * Поэтому учёт начинается с первого шага, до галочки согласия.
       */
      await sql`
        CREATE TABLE IF NOT EXISTS quiz_sessions (
          id         TEXT PRIMARY KEY,
          max_step   INT NOT NULL DEFAULT 1,
          completed  BOOLEAN NOT NULL DEFAULT false,
          lead_id    TEXT,
          utm        JSONB,
          started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS quiz_sessions_started_idx ON quiz_sessions (started_at DESC)`

      /**
       * Файлы, которые прикладывает менеджер: дизайн-проект, договор, счёт,
       * фотографии с замера.
       *
       * Отдельной таблицей, а не в details рядом с файлами клиента: у них разное
       * происхождение и разный жизненный цикл. Клиентские приходят один раз
       * вместе с заявкой, эти добавляются и удаляются в работе, и по каждому
       * нужно знать, кто и когда его положил.
       */
      await sql`
        CREATE TABLE IF NOT EXISTS lead_files (
          id           BIGSERIAL PRIMARY KEY,
          lead_id      TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          pathname     TEXT NOT NULL,
          name         TEXT NOT NULL,
          size         BIGINT NOT NULL DEFAULT 0,
          content_type TEXT NOT NULL DEFAULT '',
          kind         TEXT NOT NULL DEFAULT 'other',
          uploaded_by  TEXT NOT NULL DEFAULT '',
          created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS lead_files_lead_idx ON lead_files (lead_id, created_at DESC)`

      /**
       * Портфолио: проекты, которые показываются в галерее на главной.
       *
       * Раньше список лежал в lib/portfolio-data.ts и менялся только через
       * правку кода. Теперь его редактируют из панели, а файл остаётся
       * начальным набором: пока таблица пуста, сайт берёт проекты из него.
       *
       * materials, features и photos — массивы в jsonb, а не отдельные
       * таблицы: они всегда читаются и пишутся целиком вместе с проектом,
       * и join ради них ничего не даёт.
       */
      await sql`
        CREATE TABLE IF NOT EXISTS portfolio_projects (
          id          TEXT PRIMARY KEY,
          title       TEXT NOT NULL,
          tag         TEXT NOT NULL DEFAULT '',
          alt         TEXT NOT NULL DEFAULT '',
          cover_src   TEXT NOT NULL DEFAULT '',
          size        TEXT NOT NULL DEFAULT 'short',
          style       TEXT NOT NULL DEFAULT '',
          area        TEXT NOT NULL DEFAULT '',
          duration    TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          materials   JSONB NOT NULL DEFAULT '[]'::jsonb,
          features    JSONB NOT NULL DEFAULT '[]'::jsonb,
          photos      JSONB NOT NULL DEFAULT '[]'::jsonb,
          position    INT     NOT NULL DEFAULT 0,
          published   BOOLEAN NOT NULL DEFAULT true,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS portfolio_order_idx ON portfolio_projects (position, created_at)`

      /**
       * Каталог: наполнение, фасады и столешницы.
       *
       * Одна таблица на все разделы, а не три одинаковых: позиции у них
       * устроены совершенно одинаково (фото, название, короткая подпись),
       * различает их только section. Добавить четвёртый раздел — это строка
       * в CATALOG_SECTIONS, а не новая таблица с копией всех запросов.
       *
       * Группа внутри раздела — просто текст, а не отдельная сущность:
       * заголовков на странице немного, отдельная таблица с их порядком
       * и описаниями стоила бы дороже, чем даёт.
       */
      await sql`
        CREATE TABLE IF NOT EXISTS catalog_items (
          id          TEXT PRIMARY KEY,
          section     TEXT NOT NULL,
          group_title TEXT NOT NULL DEFAULT '',
          name        TEXT NOT NULL,
          meta        TEXT NOT NULL DEFAULT '',
          description TEXT NOT NULL DEFAULT '',
          image       TEXT NOT NULL DEFAULT '',
          position    INT     NOT NULL DEFAULT 0,
          published   BOOLEAN NOT NULL DEFAULT true,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
      await sql`CREATE INDEX IF NOT EXISTS catalog_section_idx ON catalog_items (section, position, created_at)`

      /**
       * Описание группы — абзац под её заголовком на странице.
       *
       * Отдельной таблицей, потому что принадлежит группе, а не позиции:
       * хранить его копией в каждой строке каталога значило бы править
       * один и тот же текст в пяти местах. Редактируется из карточки любой
       * позиции этой группы.
       */
      await sql`
        CREATE TABLE IF NOT EXISTS catalog_groups (
          id          TEXT PRIMARY KEY,
          section     TEXT NOT NULL,
          title       TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `
    })().catch((err) => {
      // Сбрасываем кэш, чтобы следующий запрос попробовал заново
      schemaReady = null
      throw err
    })
  }
  return schemaReady
}

export async function createLead(lead: {
  id: string
  type: LeadType
  name: string
  phone: string
  details: Record<string, unknown>
  ip?: string | null
  utm?: LeadUtm | null
  referrer?: string | null
  landingPage?: string | null
  userAgent?: string | null
}): Promise<void> {
  await ensureSchema()
  const sql = client()
  const digits = lead.phone.replace(/\D/g, '')
  const utm = lead.utm && Object.keys(lead.utm).length > 0 ? JSON.stringify(lead.utm) : null
  await sql`
    INSERT INTO leads (id, type, name, phone, phone_digits, details, ip,
                       utm, referrer, landing_page, user_agent)
    VALUES (${lead.id}, ${lead.type}, ${lead.name}, ${lead.phone}, ${digits},
            ${JSON.stringify(lead.details)}::jsonb, ${lead.ip ?? null},
            ${utm}::jsonb, ${lead.referrer ?? null}, ${lead.landingPage ?? null}, ${lead.userAgent ?? null})
    ON CONFLICT (id) DO NOTHING
  `
}

/** Сколько заявок пришло с этого IP за последние N минут — защита от накрутки */
export async function countLeadsFromIp(ip: string, minutes = 60): Promise<number> {
  if (!ip || ip === 'unknown') return 0
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT count(*)::int AS n
      FROM leads
     WHERE ip = ${ip}
       AND created_at >= now() - make_interval(mins => ${minutes})
  `) as unknown as Array<{ n: number }>
  return rows[0]?.n ?? 0
}

/**
 * Сколько записей на замер сделано с этого IP за последние часы.
 *
 * Время в календаре такая заявка не занимает (слот блокируется после
 * подтверждения), но каждая — это звонок менеджера. Поэтому предел для
 * замеров строже, чем для заявок вообще
 */
export async function countMeasurementsFromIp(ip: string, hours = 24): Promise<number> {
  if (!ip || ip === 'unknown') return 0
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT count(*)::int AS n
      FROM leads
     WHERE ip = ${ip}
       AND type = 'measurement'
       AND status <> 'rejected'
       AND created_at >= now() - make_interval(hours => ${hours})
  `) as unknown as Array<{ n: number }>
  return rows[0]?.n ?? 0
}

/** Сколько ещё не состоявшихся замеров записано на этот телефон, начиная с даты `from` (ГГГГ-ММ-ДД) */
export async function countUpcomingMeasurements(phone: string, from: string): Promise<number> {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return 0
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT count(*)::int AS n
      FROM leads
     WHERE type = 'measurement'
       AND phone_digits = ${digits}
       AND status NOT IN ('rejected', 'done')
       AND COALESCE(details->>'date', '') >= ${from}
  `) as unknown as Array<{ n: number }>
  return rows[0]?.n ?? 0
}

/**
 * Ищет такую же заявку за последние минуты — чтобы двойной клик не плодил дубли.
 * product различает расчёт кухни и шкафа: оба идут типом 'project', и второй
 * квиз сразу после первого — новая заявка, а не повтор
 */
export async function findRecentDuplicate(
  phone: string,
  type: LeadType,
  minutes = 10,
  product = 'kitchen'
): Promise<Lead | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT * FROM leads
     WHERE phone = ${phone}
       AND type = ${type}
       AND COALESCE(details->>'product', 'kitchen') = ${product}
       AND created_at >= now() - make_interval(mins => ${minutes})
     ORDER BY created_at DESC
     LIMIT 1
  `) as unknown as Lead[]
  return rows[0] ?? null
}

export async function getLead(id: string): Promise<Lead | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`SELECT * FROM leads WHERE id = ${id}`) as unknown as Lead[]
  return rows[0] ?? null
}

/**
 * Меняет статус и пишет запись в историю. Вызывается и из бота MAX, и из веб-панели,
 * поэтому история заявки единая независимо от того, где менеджер нажал кнопку.
 */
export async function setLeadStatus(
  id: string,
  status: LeadStatus,
  by: string,
  options: { rejectReason?: string | null; comment?: string | null } = {}
): Promise<Lead | null> {
  await ensureSchema()
  const sql = client()

  const before = await getLead(id)
  if (!before) return null

  // Первый уход со статуса «новая» = момент, когда менеджер отреагировал.
  // COALESCE не даст перезаписать отметку, если она уже стоит.
  const respondedAt = before.status === 'new' && status !== 'new' ? new Date().toISOString() : null

  const rows = (await sql`
    UPDATE leads
       SET status            = ${status},
           status_by         = ${by},
           reject_reason     = ${status === 'rejected' ? (options.rejectReason ?? before.reject_reason) : null},
           first_response_at = COALESCE(first_response_at, ${respondedAt}::timestamptz),
           updated_at        = now()
     WHERE id = ${id}
     RETURNING *
  `) as unknown as Lead[]

  await addLeadEvent({
    leadId: id,
    actor: by,
    kind: 'status',
    fromStatus: before.status,
    toStatus: status,
    comment: options.comment ?? options.rejectReason ?? null,
  })

  return rows[0] ?? null
}

/** Добавляет запись в историю заявки. Молча игнорирует ошибку — история не должна ломать основное действие. */
export async function addLeadEvent(event: {
  leadId: string
  actor: string
  kind: LeadEvent['kind']
  fromStatus?: string | null
  toStatus?: string | null
  comment?: string | null
}): Promise<void> {
  try {
    const sql = client()
    await sql`
      INSERT INTO lead_events (lead_id, actor, kind, from_status, to_status, comment)
      VALUES (${event.leadId}, ${event.actor}, ${event.kind},
              ${event.fromStatus ?? null}, ${event.toStatus ?? null}, ${event.comment ?? null})
    `
  } catch (error) {
    console.error('[DB] Не удалось записать событие заявки:', error)
  }
}

export async function listLeadEvents(leadId: string): Promise<LeadEvent[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM lead_events WHERE lead_id = ${leadId} ORDER BY created_at ASC, id ASC
  `) as unknown as LeadEvent[]
}

/** Заметка менеджера — свободный текст в истории заявки */
export async function addLeadNote(leadId: string, actor: string, comment: string): Promise<void> {
  await ensureSchema()
  await addLeadEvent({ leadId, actor, kind: 'note', comment })
  const sql = client()
  await sql`UPDATE leads SET updated_at = now() WHERE id = ${leadId}`
}

/** Назначает ответственного менеджера */
export async function assignLead(leadId: string, assignee: string | null, actor: string): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE leads SET assigned_to = ${assignee}, updated_at = now() WHERE id = ${leadId}`
  await addLeadEvent({ leadId, actor, kind: 'assign', comment: assignee || 'снято назначение' })
}

/** Сумма сделки — заполняется при закрытии, питает отчёт по выручке */
export async function setDealAmount(leadId: string, amount: number | null, actor: string): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE leads SET deal_amount = ${amount}, updated_at = now() WHERE id = ${leadId}`
  await addLeadEvent({
    leadId,
    actor,
    kind: 'amount',
    comment: amount === null ? 'сумма очищена' : `${amount.toLocaleString('ru-RU')} ₽`,
  })
}

/** Напоминание «связаться такого-то числа» */
export async function setNextContact(leadId: string, when: string | null, actor: string): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE leads SET next_contact_at = ${when}::timestamptz, updated_at = now() WHERE id = ${leadId}`
  await addLeadEvent({ leadId, actor, kind: 'reminder', comment: when ?? 'напоминание снято' })
}

export interface LeadQuery {
  status?: LeadStatus | 'all'
  type?: LeadType | 'all'
  sort?: 'new_first' | 'old_first'
  search?: string
  limit?: number
  offset?: number
  /** ISO-дата включительно, фильтр по created_at */
  from?: string
  /** ISO-дата включительно */
  to?: string
  source?: string
  assignedTo?: string
}

export async function listLeads(query: LeadQuery = {}): Promise<{ rows: Lead[]; total: number }> {
  await ensureSchema()
  const sql = client()

  const where: string[] = []
  const params: unknown[] = []

  if (query.status && query.status !== 'all') {
    params.push(query.status)
    where.push(`status = $${params.length}`)
  }
  if (query.type && query.type !== 'all') {
    params.push(query.type)
    where.push(`type = $${params.length}`)
  }
  if (query.search) {
    const digits = query.search.replace(/\D/g, '')
    if (digits.length >= 3) {
      params.push(`%${digits}%`)
      where.push(`phone_digits LIKE $${params.length}`)
    } else {
      params.push(`%${query.search.toLowerCase()}%`)
      where.push(`(lower(name) LIKE $${params.length} OR lower(id) LIKE $${params.length})`)
    }
  }

  if (query.from) {
    params.push(query.from)
    where.push(`created_at >= $${params.length}::date`)
  }
  if (query.to) {
    params.push(query.to)
    // + 1 день, чтобы верхняя граница была включительной
    where.push(`created_at < ($${params.length}::date + interval '1 day')`)
  }
  if (query.source) {
    params.push(query.source)
    where.push(`COALESCE(utm->>'source', '') = $${params.length}`)
  }
  if (query.assignedTo) {
    params.push(query.assignedTo)
    where.push(`assigned_to = $${params.length}`)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const order = query.sort === 'old_first' ? 'ASC' : 'DESC'
  const limit = Math.min(Math.max(query.limit ?? 5, 1), 200)
  const offset = Math.max(query.offset ?? 0, 0)

  const countRows = (await sql.query(`SELECT count(*)::int AS total FROM leads ${whereSql}`, params)) as Array<{
    total: number
  }>

  const rows = (await sql.query(
    `SELECT * FROM leads ${whereSql} ORDER BY created_at ${order} LIMIT ${limit} OFFSET ${offset}`,
    params
  )) as unknown as Lead[]

  return { rows, total: countRows[0]?.total ?? 0 }
}

export interface LeadStats {
  today: number
  week: number
  month: number
  total: number
  byStatus: Record<string, number>
  byType: Record<string, number>
}

export async function getStats(): Promise<LeadStats> {
  await ensureSchema()
  const sql = client()

  // Двойное AT TIME ZONE обязательно: первое переводит now() в московское
  // стенное время, второе возвращает полученную полночь обратно в timestamptz.
  // Без второго граница «сегодня» уезжает на 3 часа.
  const totals = (await sql`
    SELECT
      count(*) FILTER (
        WHERE created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow'
      )::int AS today,
      count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int  AS week,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS month,
      count(*)::int AS total
    FROM leads
  `) as unknown as Array<{ today: number; week: number; month: number; total: number }>

  const statuses = (await sql`SELECT status, count(*)::int AS n FROM leads GROUP BY status`) as unknown as Array<{
    status: string
    n: number
  }>
  const types = (await sql`SELECT type, count(*)::int AS n FROM leads GROUP BY type`) as unknown as Array<{
    type: string
    n: number
  }>

  return {
    today: totals[0]?.today ?? 0,
    week: totals[0]?.week ?? 0,
    month: totals[0]?.month ?? 0,
    total: totals[0]?.total ?? 0,
    byStatus: Object.fromEntries(statuses.map((r) => [r.status, r.n])),
    byType: Object.fromEntries(types.map((r) => [r.type, r.n])),
  }
}

/** Заявки за последние сутки — для утренней сводки */
export async function getDigestLeads(): Promise<Lead[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM leads
     WHERE created_at >= now() - interval '24 hours'
     ORDER BY created_at DESC
  `) as unknown as Lead[]
}

/** Запоминает того, кто написал боту — чтобы было видно кандидатов в получатели */
export async function rememberBotUser(userId: string, name: string | null, chatId: string | null): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    INSERT INTO bot_users (user_id, name, chat_id)
    VALUES (${userId}, ${name}, ${chatId})
    ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name, chat_id = EXCLUDED.chat_id, seen_at = now()
  `
}

export async function listBotUsers(): Promise<Array<{ user_id: string; name: string | null; chat_id: string | null }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`SELECT user_id, name, chat_id FROM bot_users ORDER BY seen_at DESC`) as unknown as Array<{
    user_id: string
    name: string | null
    chat_id: string | null
  }>
}

/* ══════════════════════════════════════════════════════════════════════
   Аналитика админ-панели
   ══════════════════════════════════════════════════════════════════════ */

/** Сводка для дашборда: то, на что менеджер смотрит первым делом */
export interface DashboardSummary extends LeadStats {
  /** Заявки в статусе «новая», которым больше SLA-порога */
  overdue: number
  /** Средняя скорость первого ответа в часах */
  avgResponseHours: number | null
  /** Сумма закрытых сделок за 30 дней */
  revenueMonth: number
  /** Конверсия «новая → закрыта» за 30 дней, % */
  conversionMonth: number
  yesterday: number
}

export async function getDashboardSummary(slaHours = 2): Promise<DashboardSummary> {
  const base = await getStats()
  const sql = client()

  const rows = (await sql`
    SELECT
      count(*) FILTER (
        WHERE status = 'new' AND created_at < now() - make_interval(hours => ${slaHours})
      )::int AS overdue,
      count(*) FILTER (
        WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') - interval '1 day')
                            AT TIME ZONE 'Europe/Moscow'
          AND created_at <  date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'Europe/Moscow'
      )::int AS yesterday,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0)
        FILTER (WHERE first_response_at IS NOT NULL
                  AND created_at >= now() - interval '30 days') AS avg_response_hours,
      COALESCE(SUM(deal_amount) FILTER (
        WHERE status = 'done' AND updated_at >= now() - interval '30 days'
      ), 0)::float AS revenue_month,
      count(*) FILTER (WHERE created_at >= now() - interval '30 days')::int AS month_total,
      count(*) FILTER (WHERE status = 'done' AND created_at >= now() - interval '30 days')::int AS month_done
    FROM leads
  `) as unknown as Array<{
    overdue: number
    yesterday: number
    avg_response_hours: number | null
    revenue_month: number
    month_total: number
    month_done: number
  }>

  const r = rows[0]
  return {
    ...base,
    overdue: r?.overdue ?? 0,
    yesterday: r?.yesterday ?? 0,
    avgResponseHours: r?.avg_response_hours != null ? Number(r.avg_response_hours) : null,
    revenueMonth: Number(r?.revenue_month ?? 0),
    conversionMonth: r && r.month_total > 0 ? Math.round((r.month_done / r.month_total) * 100) : 0,
  }
}

/** Заявки по дням — для графика. Пустые дни заполняются нулями через generate_series. */
export async function getLeadsByDay(days = 30): Promise<Array<{ day: string; total: number; measurement: number; project: number }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      COALESCE(count(l.id), 0)::int AS total,
      COALESCE(count(l.id) FILTER (WHERE l.type = 'measurement'), 0)::int AS measurement,
      COALESCE(count(l.id) FILTER (WHERE l.type = 'project'), 0)::int AS project
    FROM generate_series(
           date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') - make_interval(days => ${days - 1}),
           date_trunc('day', now() AT TIME ZONE 'Europe/Moscow'),
           interval '1 day'
         ) AS d(day)
    LEFT JOIN leads l
      ON l.created_at >= d.day AT TIME ZONE 'Europe/Moscow'
     AND l.created_at <  (d.day + interval '1 day') AT TIME ZONE 'Europe/Moscow'
    GROUP BY d.day
    ORDER BY d.day
  `) as unknown as Array<{ day: string; total: number; measurement: number; project: number }>
}

/** Откуда пришли заявки: utm_source, а без метки — по referrer */
export async function getSourceStats(days = 30): Promise<Array<{ source: string; total: number; done: number }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT
      COALESCE(NULLIF(utm->>'source', ''),
               CASE WHEN referrer IS NULL OR referrer = '' THEN 'Прямой заход'
                    ELSE split_part(split_part(referrer, '//', 2), '/', 1) END) AS source,
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'done')::int AS done
    FROM leads
    WHERE created_at >= now() - make_interval(days => ${days})
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 15
  `) as unknown as Array<{ source: string; total: number; done: number }>
}

/**
 * Популярность ответов в квизе. Читает details->answers->>key прямо из JSONB —
 * поэтому не требует ни отдельных колонок, ни миграции старых заявок.
 */
export async function getQuizAnswerStats(
  key: string,
  days = 90
): Promise<Array<{ value: string; total: number }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT details->'answers'->>${key} AS value, count(*)::int AS total
      FROM leads
     WHERE type = 'project'
       AND COALESCE(details->>'product', 'kitchen') = 'kitchen'
       AND created_at >= now() - make_interval(days => ${days})
       AND NULLIF(details->'answers'->>${key}, '') IS NOT NULL
     GROUP BY 1
     ORDER BY total DESC
     LIMIT 12
  `) as unknown as Array<{ value: string; total: number }>
}

/** Эффективность менеджеров: сколько взял, сколько закрыл, как быстро отвечает */
export async function getManagerStats(days = 30): Promise<
  Array<{ manager: string; handled: number; done: number; rejected: number; avg_hours: number | null; revenue: number }>
> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT
      COALESCE(NULLIF(status_by, ''), '— не назначен') AS manager,
      count(*)::int AS handled,
      count(*) FILTER (WHERE status = 'done')::int AS done,
      count(*) FILTER (WHERE status = 'rejected')::int AS rejected,
      -- ::float обязателен: AVG даёт numeric, а драйвер отдаёт numeric строкой,
      -- и форматирование в панели молча показывало бы прочерк
      (AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600.0)
        FILTER (WHERE first_response_at IS NOT NULL))::float AS avg_hours,
      COALESCE(SUM(deal_amount) FILTER (WHERE status = 'done'), 0)::float AS revenue
    FROM leads
    WHERE created_at >= now() - make_interval(days => ${days})
      AND status_by IS NOT NULL
    GROUP BY 1
    ORDER BY handled DESC
  `) as unknown as Array<{
    manager: string
    handled: number
    done: number
    rejected: number
    avg_hours: number | null
    revenue: number
  }>
}

/** В какие часы приходят заявки — подсказывает, когда менеджер должен быть на линии */
export async function getHourlyDistribution(days = 90): Promise<Array<{ hour: number; total: number }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT h.hour::int AS hour, COALESCE(count(l.id), 0)::int AS total
      FROM generate_series(0, 23) AS h(hour)
      LEFT JOIN leads l
        ON EXTRACT(HOUR FROM l.created_at AT TIME ZONE 'Europe/Moscow') = h.hour
       AND l.created_at >= now() - make_interval(days => ${days})
     GROUP BY h.hour
     ORDER BY h.hour
  `) as unknown as Array<{ hour: number; total: number }>
}

/** Почему отказывают — прямой сигнал, что чинить в продукте или цене */
export async function getRejectReasonStats(days = 90): Promise<Array<{ reason: string; total: number }>> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT COALESCE(NULLIF(reject_reason, ''), 'Не указана') AS reason, count(*)::int AS total
      FROM leads
     WHERE status = 'rejected' AND created_at >= now() - make_interval(days => ${days})
     GROUP BY 1
     ORDER BY total DESC
  `) as unknown as Array<{ reason: string; total: number }>
}

/** Просроченные: «новые» старше SLA. Главный рабочий список на дашборде. */
export async function getOverdueLeads(slaHours = 2, limit = 10): Promise<Lead[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM leads
     WHERE status = 'new' AND created_at < now() - make_interval(hours => ${slaHours})
     ORDER BY created_at ASC
     LIMIT ${limit}
  `) as unknown as Lead[]
}

/** Напоминания, которые пора выполнить */
export async function getDueReminders(limit = 10): Promise<Lead[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM leads
     WHERE next_contact_at IS NOT NULL
       AND next_contact_at <= now() + interval '1 day'
       AND status NOT IN ('done', 'rejected')
     ORDER BY next_contact_at ASC
     LIMIT ${limit}
  `) as unknown as Lead[]
}

/** Все заявки под текущий фильтр — для выгрузки в CSV. Без лимита страницы. */
export async function exportLeads(query: LeadQuery = {}): Promise<Lead[]> {
  const { rows } = await listLeads({ ...query, limit: 200, offset: 0 })
  if (rows.length < 200) return rows
  // Больше 200 — добираем страницами, чтобы не держать всё одним запросом
  const all = [...rows]
  let offset = 200
  while (offset < 10_000) {
    const page = await listLeads({ ...query, limit: 200, offset })
    all.push(...page.rows)
    if (page.rows.length < 200) break
    offset += 200
  }
  return all
}

/* ══════════════════════════════════════════════════════════════════════
   Воронка квиза
   ══════════════════════════════════════════════════════════════════════ */

export const QUIZ_TOTAL_STEPS = 6
/**
 * Попытки нынешней версии квиза. У старых десятишаговых id — чистый hex из
 * UUID, буквы «v» в нём не бывает, поэтому префикс отделяет их надёжно.
 * Синхронизировано с SESSION_PREFIX в lib/quiz-tracking.ts
 */
const QUIZ_SESSION_PREFIX = 'v2'

/**
 * Отмечает, до какого шага дошёл посетитель.
 *
 * GREATEST при обновлении: шаги можно листать назад, и возврат на второй шаг
 * не должен «понижать» достигнутый максимум — иначе воронка занизит прогресс.
 */
export async function trackQuizStep(sessionId: string, step: number, utm: LeadUtm | null): Promise<void> {
  await ensureSchema()
  const sql = client()
  const bounded = Math.min(Math.max(Math.trunc(step), 1), QUIZ_TOTAL_STEPS)
  await sql`
    INSERT INTO quiz_sessions (id, max_step, utm)
    VALUES (${sessionId}, ${bounded}, ${utm ? JSON.stringify(utm) : null}::jsonb)
    ON CONFLICT (id) DO UPDATE
      SET max_step   = GREATEST(quiz_sessions.max_step, EXCLUDED.max_step),
          utm        = COALESCE(quiz_sessions.utm, EXCLUDED.utm),
          updated_at = now()
  `
}

export async function markQuizCompleted(sessionId: string, leadId: string): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    UPDATE quiz_sessions
       SET completed = true, lead_id = ${leadId}, max_step = ${QUIZ_TOTAL_STEPS}, updated_at = now()
     WHERE id = ${sessionId}
  `
}

export interface QuizFunnelStep {
  step: number
  reached: number
  /** Сколько человек остановились именно на этом шаге и дальше не пошли */
  droppedHere: number
}

export async function getQuizFunnel(days = 30): Promise<{ steps: QuizFunnelStep[]; started: number; completed: number }> {
  await ensureSchema()
  const sql = client()

  const rows = (await sql`
    SELECT s.step::int AS step,
           count(q.id) FILTER (WHERE q.max_step >= s.step)::int AS reached,
           count(q.id) FILTER (WHERE q.max_step = s.step AND NOT q.completed)::int AS dropped_here
      FROM generate_series(1, ${QUIZ_TOTAL_STEPS}) AS s(step)
      LEFT JOIN quiz_sessions q ON q.started_at >= now() - make_interval(days => ${days})
                               AND q.id LIKE ${QUIZ_SESSION_PREFIX + '%'}
     GROUP BY s.step
     ORDER BY s.step
  `) as unknown as Array<{ step: number; reached: number; dropped_here: number }>

  const totals = (await sql`
    SELECT count(*)::int AS started,
           count(*) FILTER (WHERE completed)::int AS completed
      FROM quiz_sessions
     WHERE started_at >= now() - make_interval(days => ${days})
       AND id LIKE ${QUIZ_SESSION_PREFIX + '%'}
  `) as unknown as Array<{ started: number; completed: number }>

  return {
    steps: rows.map((r) => ({ step: r.step, reached: r.reached, droppedHere: r.dropped_here })),
    started: totals[0]?.started ?? 0,
    completed: totals[0]?.completed ?? 0,
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Клиент: все обращения с одного номера
   ══════════════════════════════════════════════════════════════════════ */

export interface ClientSummary {
  phone: string
  phoneDigits: string
  names: string[]
  leads: Lead[]
  firstAt: string
  lastAt: string
  totalAmount: number
  hasDeal: boolean
}

/**
 * Собирает историю клиента по цифрам номера.
 *
 * Сопоставление именно по phone_digits, а не по phone: один и тот же человек
 * мог написать +7..., 8... и 7... — для базы это разные строки, для менеджера
 * один клиент.
 */
export async function getClientByPhone(phoneDigits: string): Promise<ClientSummary | null> {
  await ensureSchema()
  const sql = client()
  const digits = phoneDigits.replace(/\D/g, '')
  if (digits.length < 5) return null

  const leads = (await sql`
    SELECT * FROM leads WHERE phone_digits = ${digits} ORDER BY created_at DESC
  `) as unknown as Lead[]

  if (leads.length === 0) return null

  const names = [...new Set(leads.map((l) => l.name.trim()).filter(Boolean))]
  const totalAmount = leads.reduce((sum, l) => sum + Number(l.deal_amount ?? 0), 0)

  return {
    phone: leads[0].phone,
    phoneDigits: digits,
    names,
    leads,
    firstAt: leads[leads.length - 1].created_at,
    lastAt: leads[0].created_at,
    totalAmount,
    hasDeal: leads.some((l) => l.status === 'done'),
  }
}

/** Сколько ещё заявок у этого номера, кроме текущей — для метки в карточке */
export async function countLeadsByPhone(phoneDigits: string): Promise<number> {
  await ensureSchema()
  const sql = client()
  const digits = phoneDigits.replace(/\D/g, '')
  if (digits.length < 5) return 0
  const rows = (await sql`
    SELECT count(*)::int AS n FROM leads WHERE phone_digits = ${digits}
  `) as unknown as Array<{ n: number }>
  return rows[0]?.n ?? 0
}

/* ══════════════════════════════════════════════════════════════════════
   Календарь замеров
   ══════════════════════════════════════════════════════════════════════ */

export interface ScheduledMeasurement {
  id: string
  name: string
  phone: string
  status: LeadStatus
  /** YYYY-MM-DD из details */
  date: string
  /** morning | day | evening */
  slot: string
  address: string
  city: string
}

/**
 * Замеры, назначенные в указанном диапазоне дат.
 *
 * Дата лежит в JSONB строкой, поэтому перед приведением к date проверяем формат
 * регуляркой: одна кривая запись иначе уронит запрос целиком.
 */
export async function getMeasurementsInRange(from: string, to: string): Promise<ScheduledMeasurement[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT id, name, phone, status,
           details->>'date'    AS date,
           COALESCE(details->>'time', '')    AS slot,
           COALESCE(details->>'address', '') AS address,
           COALESCE(details->>'city', '')    AS city
      FROM leads
     WHERE type = 'measurement'
       AND status <> 'rejected'
       AND details->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$'
       AND (details->>'date')::date BETWEEN ${from}::date AND ${to}::date
     ORDER BY (details->>'date')::date, details->>'time'
  `) as unknown as ScheduledMeasurement[]
}

/**
 * Сколько ПОДТВЕРЖДЁННЫХ замеров стоит на каждую пару «дата + слот».
 *
 * Время в календаре занимает только замер, который менеджер подтвердил
 * в панели (статус «Замер назначен»). Заявка с сайта, пока её не подтвердили,
 * слот не блокирует: иначе расписание можно занять одним нажатием кнопки,
 * не дожидаясь ни звонка, ни согласия менеджера.
 *
 * Возвращается плоская карта `{ '2026-09-20': { morning: 1 } }` — форма записи
 * на сайте по ней сразу видит, что предлагать нельзя.
 */
export async function getSlotOccupancy(from: string, to: string): Promise<Record<string, Record<string, number>>> {
  await ensureSchema()
  const sql = client()

  const rows = (await sql`
    SELECT details->>'date' AS date,
           COALESCE(NULLIF(details->>'time', ''), 'unknown') AS slot,
           count(*)::int AS taken
      FROM leads
     WHERE type = 'measurement'
       AND status = ${CONFIRMED_STATUS}
       AND details->>'date' ~ '^\\d{4}-\\d{2}-\\d{2}$'
       AND (details->>'date')::date BETWEEN ${from}::date AND ${to}::date
     GROUP BY 1, 2
  `) as unknown as Array<{ date: string; slot: string; taken: number }>

  const map: Record<string, Record<string, number>> = {}
  for (const row of rows) {
    map[row.date] ??= {}
    map[row.date][row.slot] = row.taken
  }
  return map
}

/**
 * Занят ли конкретный слот подтверждёнными замерами.
 *
 * excludeLeadId нужен при переносе и подтверждении: заявка не должна считать
 * занятым слот, который занимает она сама, иначе перенос «на тот же день,
 * другое время» упрётся в собственную запись.
 */
export async function isSlotFull(
  date: string,
  slot: string,
  capacity: number,
  excludeLeadId?: string
): Promise<boolean> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT count(*)::int AS taken
      FROM leads
     WHERE type = 'measurement'
       AND status = ${CONFIRMED_STATUS}
       AND details->>'date' = ${date}
       AND COALESCE(details->>'time', '') = ${slot}
       AND id <> COALESCE(${excludeLeadId ?? null}, '')
  `) as unknown as Array<{ taken: number }>
  return (rows[0]?.taken ?? 0) >= capacity
}

/**
 * Почему замер нельзя подтвердить — или null, если можно.
 *
 * Общая проверка для панели и бота: подтверждение занимает время
 * в календаре, поэтому у заявки должны быть дата и время, а слот — свободен.
 * К заявкам-расчётам из квиза не относится: у них нет времени в расписании.
 */
export async function measurementConfirmError(lead: Lead): Promise<string | null> {
  if (lead.type !== 'measurement') return null

  const details = (lead.details ?? {}) as Record<string, unknown>
  const date = typeof details.date === 'string' ? details.date : ''
  const slot = typeof details.time === 'string' ? details.time : ''

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOT_VALUES.includes(slot)) {
    return 'Сначала укажите дату и время замера — без них его нельзя поставить в календарь.'
  }
  if (await isSlotFull(date, slot, slotCapacity(), lead.id)) {
    return `${slotLabel(slot)} на ${describeBooking(date, '')} уже занято другим подтверждённым замером. Перенесите этот замер на свободное время и подтвердите снова.`
  }
  return null
}

/**
 * Переносит замер на другую дату и время.
 *
 * Пишет прямо в details через jsonb_set, чтобы не перетереть остальные поля
 * заявки — адрес и город должны остаться нетронутыми.
 */
export async function rescheduleMeasurement(
  leadId: string,
  date: string,
  slot: string,
  actor: string
): Promise<Lead | null> {
  await ensureSchema()
  const sql = client()

  const before = await getLead(leadId)
  if (!before) return null

  const details = (before.details ?? {}) as Record<string, unknown>
  const oldDate = typeof details.date === 'string' ? details.date : ''
  const oldSlot = typeof details.time === 'string' ? details.time : ''

  const rows = (await sql`
    UPDATE leads
       SET details = jsonb_set(jsonb_set(details, '{date}', to_jsonb(${date}::text)), '{time}', to_jsonb(${slot}::text)),
           updated_at = now()
     WHERE id = ${leadId}
     RETURNING *
  `) as unknown as Lead[]

  // В историю пишем то, что прочитает человек, а не коды слотов из JSON
  await addLeadEvent({
    leadId,
    actor,
    kind: 'reschedule',
    comment: `${describeBooking(oldDate, oldSlot)} → ${describeBooking(date, slot)}`,
  })

  return rows[0] ?? null
}

/** «23.09.2026, Утро (09:00 — 12:00)» */
function describeBooking(date: string, slot: string): string {
  if (!date) return 'дата не была указана'
  const [y, m, d] = date.split('-')
  const readableDate = y && m && d ? `${d}.${m}.${y}` : date
  return slot ? `${readableDate}, ${slotLabel(slot)}` : readableDate
}

/**
 * Заявки, по которым пора связаться, и о которых ещё не напоминали.
 * Порог берётся на конец дня: напоминание на сегодня должно прийти утром.
 */
export async function getRemindersDue(): Promise<Lead[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM leads
     WHERE next_contact_at IS NOT NULL
       AND next_contact_at < (date_trunc('day', now() AT TIME ZONE 'Europe/Moscow') + interval '1 day')
                             AT TIME ZONE 'Europe/Moscow'
       AND reminder_sent_at IS DISTINCT FROM next_contact_at
       AND status NOT IN ('done', 'rejected')
     ORDER BY next_contact_at ASC
     LIMIT 25
  `) as unknown as Lead[]
}

/**
 * Отмечает, что о напоминании уже сообщили.
 *
 * Запоминаем не время отправки, а само значение next_contact_at: если менеджер
 * передвинет напоминание, отметка перестанет совпадать и бот напомнит снова.
 */
export async function markReminderSent(leadId: string, when: string): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE leads SET reminder_sent_at = ${when}::timestamptz WHERE id = ${leadId}`
}

/* ══════════════════════════════════════════════════════════════════════
   Файлы менеджера
   ══════════════════════════════════════════════════════════════════════ */

export const FILE_KINDS = [
  { value: 'project', label: 'Дизайн-проект' },
  { value: 'contract', label: 'Договор' },
  { value: 'invoice', label: 'Счёт' },
  { value: 'measurement', label: 'Замер' },
  { value: 'other', label: 'Другое' },
] as const

export type FileKind = (typeof FILE_KINDS)[number]['value']

export interface LeadFileRow {
  id: string
  lead_id: string
  pathname: string
  name: string
  size: string
  content_type: string
  kind: FileKind
  uploaded_by: string
  created_at: string
}

export function fileKindLabel(kind: string): string {
  return FILE_KINDS.find((k) => k.value === kind)?.label ?? kind
}

export async function listLeadUploads(leadId: string): Promise<LeadFileRow[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT * FROM lead_files WHERE lead_id = ${leadId} ORDER BY created_at DESC
  `) as unknown as LeadFileRow[]
}

export async function addLeadUpload(file: {
  leadId: string
  pathname: string
  name: string
  size: number
  contentType: string
  kind: string
  uploadedBy: string
}): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    INSERT INTO lead_files (lead_id, pathname, name, size, content_type, kind, uploaded_by)
    VALUES (${file.leadId}, ${file.pathname}, ${file.name}, ${file.size},
            ${file.contentType}, ${file.kind}, ${file.uploadedBy})
  `
  await addLeadEvent({
    leadId: file.leadId,
    actor: file.uploadedBy,
    kind: 'file',
    comment: `${fileKindLabel(file.kind)}: ${file.name}`,
  })
}

/** Возвращает путь удалённой записи, чтобы вызывающий мог стереть и сам объект */
export async function removeLeadUpload(id: string, actor: string): Promise<LeadFileRow | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`DELETE FROM lead_files WHERE id = ${id} RETURNING *`) as unknown as LeadFileRow[]
  const file = rows[0]
  if (file) {
    await addLeadEvent({
      leadId: file.lead_id,
      actor,
      kind: 'file',
      comment: `удалён файл «${file.name}»`,
    })
  }
  return file ?? null
}

/**
 * Удаляет заявку целиком: историю и файлы менеджера база стирает сама
 * (ON DELETE CASCADE). Возвращает пути всех файлов заявки — и клиентских,
 * и менеджерских, — чтобы вызывающий убрал их из хранилища.
 */
export async function deleteLead(id: string): Promise<{ lead: Lead; pathnames: string[] } | null> {
  await ensureSchema()
  const sql = client()
  const uploads = (await sql`SELECT pathname FROM lead_files WHERE lead_id = ${id}`) as unknown as Array<{
    pathname: string
  }>
  const rows = (await sql`DELETE FROM leads WHERE id = ${id} RETURNING *`) as unknown as Lead[]
  const lead = rows[0]
  if (!lead) return null

  // В квизе ссылка на заявку без внешнего ключа — отвязываем вручную,
  // сама попытка прохождения остаётся в воронке
  await sql`UPDATE quiz_sessions SET lead_id = NULL WHERE lead_id = ${id}`

  const clientFiles = (lead.details as Record<string, unknown> | null)?.files
  const clientPaths = Array.isArray(clientFiles)
    ? clientFiles
        .map((file) => (file && typeof file === 'object' ? (file as { pathname?: unknown }).pathname : null))
        .filter((p): p is string => typeof p === 'string' && p.startsWith('leads/') && !p.includes('..'))
    : []

  return { lead, pathnames: [...clientPaths, ...uploads.map((u) => u.pathname)] }
}

/* ══════════════════════════════════════════════════════════════════════
   Портфолио
   ══════════════════════════════════════════════════════════════════════ */

export interface PortfolioPhotoRow {
  src: string
  alt: string
}

export interface PortfolioRow {
  id: string
  title: string
  tag: string
  alt: string
  cover_src: string
  size: 'tall' | 'short'
  style: string
  area: string
  duration: string
  description: string
  materials: string[]
  features: string[]
  photos: PortfolioPhotoRow[]
  position: number
  published: boolean
  created_at: string
  updated_at: string
}

/** Данные проекта без служебных полей — то, что приходит из формы панели */
export interface PortfolioInput {
  id: string
  title: string
  tag: string
  alt: string
  coverSrc: string
  size: 'tall' | 'short'
  style: string
  area: string
  duration: string
  description: string
  materials: string[]
  features: string[]
  photos: PortfolioPhotoRow[]
  published: boolean
}

export async function listPortfolio(options: { includeHidden?: boolean } = {}): Promise<PortfolioRow[]> {
  await ensureSchema()
  const sql = client()
  const rows = options.includeHidden
    ? await sql`SELECT * FROM portfolio_projects ORDER BY position, created_at`
    : await sql`SELECT * FROM portfolio_projects WHERE published ORDER BY position, created_at`
  return rows as unknown as PortfolioRow[]
}

export interface PortfolioSummary {
  id: string
  title: string
  tag: string
  cover_src: string
  style: string
  area: string
  published: boolean
  photo_count: number
}

/**
 * Список для панели — без описаний, материалов и путей к фотографиям.
 *
 * Полные проекты весят десятки килобайт, а списку нужны только обложка,
 * название и счётчик: незачем гонять остальное на каждое открытие раздела.
 */
export async function listPortfolioSummaries(): Promise<PortfolioSummary[]> {
  await ensureSchema()
  const sql = client()
  return (await sql`
    SELECT id, title, tag, cover_src, style, area, published,
           jsonb_array_length(photos) AS photo_count
    FROM portfolio_projects
    ORDER BY position, created_at
  `) as unknown as PortfolioSummary[]
}

/** Только адреса — чтобы подобрать свободный для нового проекта */
export async function listPortfolioIds(): Promise<string[]> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`SELECT id FROM portfolio_projects`) as unknown as Array<{ id: string }>
  return rows.map((row) => row.id)
}

export async function getPortfolioProject(id: string): Promise<PortfolioRow | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`SELECT * FROM portfolio_projects WHERE id = ${id}`) as unknown as PortfolioRow[]
  return rows[0] ?? null
}

export async function countPortfolio(): Promise<number> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`SELECT COUNT(*)::int AS total FROM portfolio_projects`) as unknown as Array<{ total: number }>
  return rows[0]?.total ?? 0
}

/**
 * Создаёт или обновляет проект.
 *
 * Новый проект встаёт в конец списка, у существующего порядок не трогаем —
 * иначе любое сохранение перекидывало бы его в хвост галереи.
 */
export async function upsertPortfolioProject(project: PortfolioInput): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    INSERT INTO portfolio_projects (
      id, title, tag, alt, cover_src, size, style, area, duration, description,
      materials, features, photos, published, position
    )
    VALUES (
      ${project.id}, ${project.title}, ${project.tag}, ${project.alt}, ${project.coverSrc},
      ${project.size}, ${project.style}, ${project.area}, ${project.duration}, ${project.description},
      ${JSON.stringify(project.materials)}::jsonb,
      ${JSON.stringify(project.features)}::jsonb,
      ${JSON.stringify(project.photos)}::jsonb,
      ${project.published},
      COALESCE((SELECT MAX(position) + 1 FROM portfolio_projects), 0)
    )
    ON CONFLICT (id) DO UPDATE SET
      title       = EXCLUDED.title,
      tag         = EXCLUDED.tag,
      alt         = EXCLUDED.alt,
      cover_src   = EXCLUDED.cover_src,
      size        = EXCLUDED.size,
      style       = EXCLUDED.style,
      area        = EXCLUDED.area,
      duration    = EXCLUDED.duration,
      description = EXCLUDED.description,
      materials   = EXCLUDED.materials,
      features    = EXCLUDED.features,
      photos      = EXCLUDED.photos,
      published   = EXCLUDED.published,
      updated_at  = now()
  `
}

/** Возвращает удалённую строку, чтобы вызывающий мог стереть и сами файлы */
export async function deletePortfolioProject(id: string): Promise<PortfolioRow | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`DELETE FROM portfolio_projects WHERE id = ${id} RETURNING *`) as unknown as PortfolioRow[]
  return rows[0] ?? null
}

export async function setPortfolioPublished(id: string, published: boolean): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE portfolio_projects SET published = ${published}, updated_at = now() WHERE id = ${id}`
}

/**
 * Меняет проект местами с соседним.
 *
 * Позиции пересчитываем от нуля перед обменом: у проектов, пришедших из
 * старого файла или созданных до появления сортировки, position могли
 * совпасть, и тогда «поменять местами» ничего бы не изменило.
 */
export async function movePortfolioProject(id: string, direction: -1 | 1): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    WITH ordered AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY position, created_at) - 1)::int AS rn
      FROM portfolio_projects
    )
    UPDATE portfolio_projects p SET position = ordered.rn
    FROM ordered WHERE p.id = ordered.id AND p.position IS DISTINCT FROM ordered.rn
  `

  const rows = (await sql`SELECT position FROM portfolio_projects WHERE id = ${id}`) as unknown as Array<{
    position: number
  }>
  const current = rows[0]?.position
  if (current === undefined) return

  const target = current + direction
  const neighbour = (await sql`
    SELECT id FROM portfolio_projects WHERE position = ${target}
  `) as unknown as Array<{ id: string }>
  if (neighbour.length === 0) return

  await sql`UPDATE portfolio_projects SET position = ${current} WHERE id = ${neighbour[0].id}`
  await sql`UPDATE portfolio_projects SET position = ${target}, updated_at = now() WHERE id = ${id}`
}

/**
 * Переносит проекты из файла в базу — один раз, пока таблица пуста.
 *
 * Нужен, чтобы при первом открытии раздела в панели уже лежали те восемь
 * проектов, которые сейчас видит посетитель, и их можно было править,
 * а не заводить заново.
 */
export async function seedPortfolioIfEmpty(projects: PortfolioInput[]): Promise<boolean> {
  if ((await countPortfolio()) > 0) return false
  if (projects.length === 0) return false

  await ensureSchema()
  const sql = client()

  // Весь список уходит одним запросом: каждое обращение к базе по HTTP —
  // отдельный round trip, и восемь вставок подряд заметно дольше одной
  const payload = JSON.stringify(
    projects.map((project) => ({
      id: project.id,
      title: project.title,
      tag: project.tag,
      alt: project.alt,
      cover_src: project.coverSrc,
      size: project.size,
      style: project.style,
      area: project.area,
      duration: project.duration,
      description: project.description,
      materials: project.materials,
      features: project.features,
      photos: project.photos,
      published: project.published,
    }))
  )

  await sql`
    INSERT INTO portfolio_projects (
      id, title, tag, alt, cover_src, size, style, area, duration, description,
      materials, features, photos, published, position
    )
    SELECT p.id, p.title, p.tag, p.alt, p.cover_src, p.size, p.style, p.area, p.duration,
           p.description, p.materials, p.features, p.photos, p.published,
           (ROW_NUMBER() OVER () - 1)::int
    FROM jsonb_to_recordset(${payload}::jsonb) AS p(
      id TEXT, title TEXT, tag TEXT, alt TEXT, cover_src TEXT, size TEXT, style TEXT,
      area TEXT, duration TEXT, description TEXT,
      materials JSONB, features JSONB, photos JSONB, published BOOLEAN
    )
    ON CONFLICT (id) DO NOTHING
  `
  return true
}

/* ══════════════════════════════════════════════════════════════════════
   Каталог: наполнение, фасады, столешницы
   ══════════════════════════════════════════════════════════════════════ */

export const CATALOG_SECTIONS = [
  { value: 'filling', label: 'Наполнение', path: '/filling' },
  { value: 'facades', label: 'Фасады', path: '/facades' },
  { value: 'countertops', label: 'Столешницы', path: '/countertops' },
] as const

export type CatalogSection = (typeof CATALOG_SECTIONS)[number]['value']

export function isCatalogSection(value: string): value is CatalogSection {
  return CATALOG_SECTIONS.some((section) => section.value === value)
}

export function catalogSectionLabel(value: string): string {
  return CATALOG_SECTIONS.find((section) => section.value === value)?.label ?? value
}

export interface CatalogRow {
  id: string
  section: CatalogSection
  group_title: string
  name: string
  meta: string
  description: string
  image: string
  position: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface CatalogInput {
  id: string
  section: CatalogSection
  groupTitle: string
  name: string
  meta: string
  description: string
  image: string
  published: boolean
}

export async function listCatalogItems(
  section: CatalogSection,
  options: { includeHidden?: boolean } = {}
): Promise<CatalogRow[]> {
  await ensureSchema()
  const sql = client()
  const rows = options.includeHidden
    ? await sql`
        SELECT * FROM catalog_items WHERE section = ${section}
        ORDER BY position, created_at
      `
    : await sql`
        SELECT * FROM catalog_items WHERE section = ${section} AND published
        ORDER BY position, created_at
      `
  return rows as unknown as CatalogRow[]
}

export async function getCatalogItem(id: string): Promise<CatalogRow | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`SELECT * FROM catalog_items WHERE id = ${id}`) as unknown as CatalogRow[]
  return rows[0] ?? null
}

/** Сколько позиций в каждом разделе — для вкладок в панели */
export async function countCatalogBySection(): Promise<Record<string, number>> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT section, COUNT(*)::int AS total FROM catalog_items GROUP BY section
  `) as unknown as Array<{ section: string; total: number }>
  return Object.fromEntries(rows.map((row) => [row.section, row.total]))
}

/** Ключ группы: раздел и название вместе, потому что «ПВХ» может быть в обоих */
function groupKey(section: CatalogSection, title: string): string {
  return `${section}:${title.trim().toLowerCase()}`
}

/** Описания групп раздела: { 'Освещение': 'Устанавливается под…' } */
export async function getCatalogGroupNotes(section: CatalogSection): Promise<Record<string, string>> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT title, description FROM catalog_groups
    WHERE section = ${section} AND NULLIF(description, '') IS NOT NULL
  `) as unknown as Array<{ title: string; description: string }>
  return Object.fromEntries(rows.map((row) => [row.title.trim().toLowerCase(), row.description]))
}

export async function setCatalogGroupNote(
  section: CatalogSection,
  title: string,
  description: string
): Promise<void> {
  const name = title.trim()
  if (!name) return

  await ensureSchema()
  const sql = client()
  await sql`
    INSERT INTO catalog_groups (id, section, title, description)
    VALUES (${groupKey(section, name)}, ${section}, ${name}, ${description})
    ON CONFLICT (id) DO UPDATE SET
      title       = EXCLUDED.title,
      description = EXCLUDED.description,
      updated_at  = now()
  `
}

/** Названия групп, которые уже есть в разделе — подсказки в поле ввода */
export async function listCatalogGroups(section: CatalogSection): Promise<string[]> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT DISTINCT group_title FROM catalog_items
    WHERE section = ${section} AND NULLIF(group_title, '') IS NOT NULL
    ORDER BY group_title
  `) as unknown as Array<{ group_title: string }>
  return rows.map((row) => row.group_title)
}

export async function listCatalogIds(section: CatalogSection): Promise<string[]> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT id FROM catalog_items WHERE section = ${section}
  `) as unknown as Array<{ id: string }>
  return rows.map((row) => row.id)
}

export async function upsertCatalogItem(item: CatalogInput): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`
    INSERT INTO catalog_items (
      id, section, group_title, name, meta, description, image, published, position
    )
    VALUES (
      ${item.id}, ${item.section}, ${item.groupTitle}, ${item.name}, ${item.meta},
      ${item.description}, ${item.image}, ${item.published},
      COALESCE((SELECT MAX(position) + 1 FROM catalog_items WHERE section = ${item.section}), 0)
    )
    ON CONFLICT (id) DO UPDATE SET
      group_title = EXCLUDED.group_title,
      name        = EXCLUDED.name,
      meta        = EXCLUDED.meta,
      description = EXCLUDED.description,
      image       = EXCLUDED.image,
      published   = EXCLUDED.published,
      updated_at  = now()
  `
}

/** Возвращает удалённую строку, чтобы вызывающий мог стереть и само фото */
export async function deleteCatalogItem(id: string): Promise<CatalogRow | null> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`DELETE FROM catalog_items WHERE id = ${id} RETURNING *`) as unknown as CatalogRow[]
  return rows[0] ?? null
}

export async function setCatalogPublished(id: string, published: boolean): Promise<void> {
  await ensureSchema()
  const sql = client()
  await sql`UPDATE catalog_items SET published = ${published}, updated_at = now() WHERE id = ${id}`
}

/**
 * Меняет позицию местами с соседней внутри своего раздела.
 *
 * Нумерация пересчитывается от нуля перед обменом: позиции, созданные
 * в разное время, могли совпасть, и обмен местами ничего бы не дал.
 */
export async function moveCatalogItem(id: string, direction: -1 | 1): Promise<void> {
  await ensureSchema()
  const sql = client()

  const owner = (await sql`SELECT section FROM catalog_items WHERE id = ${id}`) as unknown as Array<{
    section: CatalogSection
  }>
  const section = owner[0]?.section
  if (!section) return

  await sql`
    WITH ordered AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY position, created_at) - 1)::int AS rn
      FROM catalog_items WHERE section = ${section}
    )
    UPDATE catalog_items c SET position = ordered.rn
    FROM ordered WHERE c.id = ordered.id AND c.position IS DISTINCT FROM ordered.rn
  `

  const current = (await sql`SELECT position FROM catalog_items WHERE id = ${id}`) as unknown as Array<{
    position: number
  }>
  const from = current[0]?.position
  if (from === undefined) return

  const to = from + direction
  const neighbour = (await sql`
    SELECT id FROM catalog_items WHERE section = ${section} AND position = ${to}
  `) as unknown as Array<{ id: string }>
  if (neighbour.length === 0) return

  await sql`UPDATE catalog_items SET position = ${from} WHERE id = ${neighbour[0].id}`
  await sql`UPDATE catalog_items SET position = ${to}, updated_at = now() WHERE id = ${id}`
}

/** Заполняет раздел стартовым набором — один раз, пока он пуст */
export async function seedCatalogIfEmpty(
  section: CatalogSection,
  items: CatalogInput[]
): Promise<boolean> {
  await ensureSchema()
  const sql = client()

  const existing = (await sql`
    SELECT COUNT(*)::int AS total FROM catalog_items WHERE section = ${section}
  `) as unknown as Array<{ total: number }>
  if ((existing[0]?.total ?? 0) > 0 || items.length === 0) return false

  const payload = JSON.stringify(
    items.map((item) => ({
      id: item.id,
      section: item.section,
      group_title: item.groupTitle,
      name: item.name,
      meta: item.meta,
      description: item.description,
      image: item.image,
      published: item.published,
    }))
  )

  await sql`
    INSERT INTO catalog_items (
      id, section, group_title, name, meta, description, image, published, position
    )
    SELECT i.id, i.section, i.group_title, i.name, i.meta, i.description, i.image, i.published,
           (ROW_NUMBER() OVER () - 1)::int
    FROM jsonb_to_recordset(${payload}::jsonb) AS i(
      id TEXT, section TEXT, group_title TEXT, name TEXT, meta TEXT,
      description TEXT, image TEXT, published BOOLEAN
    )
    ON CONFLICT (id) DO NOTHING
  `
  return true
}

/** Список менеджеров, которые уже что-то обрабатывали — для фильтра «ответственный» */
export async function listKnownManagers(): Promise<string[]> {
  await ensureSchema()
  const sql = client()
  const rows = (await sql`
    SELECT DISTINCT name FROM (
      SELECT status_by   AS name FROM leads WHERE NULLIF(status_by, '')   IS NOT NULL
      UNION
      SELECT assigned_to AS name FROM leads WHERE NULLIF(assigned_to, '') IS NOT NULL
    ) t ORDER BY name
  `) as unknown as Array<{ name: string }>
  return rows.map((r) => r.name)
}
