/**
 * Справочники личного кабинета — общие для сервера, кабинета клиента и панели.
 * Без обращений к базе: модуль можно импортировать в клиентские компоненты.
 */

/** Этапы заказа — те же пять, что в «Как мы работаем» на сайте, и финал */
export const ORDER_STAGES = [
  {
    value: 'consultation',
    label: 'Консультация',
    hint: 'Обсуждаем задачу, планировку и бюджет. Дальше — замер и проект.',
  },
  {
    value: 'project',
    label: 'Замер и проект',
    hint: 'Дизайнер готовит проект по замеру. Когда он будет готов, проект появится здесь на согласование.',
  },
  {
    value: 'contract',
    label: 'Договор',
    hint: 'Проект согласован — фиксируем стоимость и сроки в договоре.',
  },
  {
    value: 'production',
    label: 'Производство',
    hint: 'Изготавливаем корпуса и фасады на производстве. Фото с участка — в фотоотчёте.',
  },
  {
    value: 'installation',
    label: 'Доставка и сборка',
    hint: 'Привозим и собираем у вас дома: корпуса, фасады, столешница, мойка.',
  },
  {
    value: 'done',
    label: 'Готово',
    hint: 'Мебель установлена. Если что-то понадобится отрегулировать — напишите менеджеру.',
  },
] as const

export type OrderStage = (typeof ORDER_STAGES)[number]['value']

export function stageIndex(stage: string): number {
  const index = ORDER_STAGES.findIndex((s) => s.value === stage)
  return index < 0 ? 0 : index
}

export function stageLabel(stage: string): string {
  return ORDER_STAGES[stageIndex(stage)].label
}

export function isOrderStage(value: string): value is OrderStage {
  return ORDER_STAGES.some((s) => s.value === value)
}

/** Срок изготовления — как в договоре и на сайте (lib/company.ts) */
export const PRODUCTION_DAYS = 14

export const PRODUCTS = [
  { value: 'kitchen', label: 'Кухня' },
  { value: 'wardrobe', label: 'Шкаф' },
  { value: 'other', label: 'Мебель' },
] as const

export type Product = (typeof PRODUCTS)[number]['value']

export function productLabel(value: string): string {
  return PRODUCTS.find((p) => p.value === value)?.label ?? 'Мебель'
}

export const VISIT_KINDS = [
  { value: 'measurement', label: 'Замер' },
  { value: 'meeting', label: 'Встреча с дизайнером' },
  { value: 'delivery', label: 'Доставка' },
  { value: 'installation', label: 'Сборка и монтаж' },
  { value: 'other', label: 'Визит' },
] as const

export type VisitKind = (typeof VISIT_KINDS)[number]['value']

export function visitKindLabel(value: string): string {
  return VISIT_KINDS.find((v) => v.value === value)?.label ?? 'Визит'
}

/**
 * Файлы заказа. group решает, где файл виден клиенту:
 * project — галерея проекта, docs — документы, photo — фотоотчёт.
 */
export const ORDER_FILE_KINDS = [
  { value: 'render', label: 'Визуализация', group: 'project' },
  { value: 'project', label: 'Дизайн-проект', group: 'docs' },
  { value: 'contract', label: 'Договор', group: 'docs' },
  { value: 'invoice', label: 'Счёт', group: 'docs' },
  { value: 'measurement', label: 'Замер', group: 'docs' },
  { value: 'act', label: 'Акт', group: 'docs' },
  { value: 'warranty', label: 'Гарантия и уход', group: 'docs' },
  { value: 'photo', label: 'Фотоотчёт', group: 'photo' },
  { value: 'other', label: 'Другое', group: 'docs' },
] as const

export type OrderFileKind = (typeof ORDER_FILE_KINDS)[number]['value']

export function fileKind(value: string) {
  return ORDER_FILE_KINDS.find((k) => k.value === value) ?? ORDER_FILE_KINDS[ORDER_FILE_KINDS.length - 1]
}

/** Согласование проекта: none — проекта ещё нет, sent — ждём ответа клиента */
export const PROJECT_STATUS = {
  none: 'Проект готовится',
  sent: 'Ждёт вашего согласования',
  approved: 'Проект согласован',
  changes: 'Отправлены правки',
} as const

export type ProjectStatus = keyof typeof PROJECT_STATUS

export function isProjectStatus(value: string): value is ProjectStatus {
  return value in PROJECT_STATUS
}

/** Строка спецификации: «Фасады — МДФ эмаль, белый матовый» */
export interface SpecRow {
  label: string
  value: string
}

export interface Client {
  id: string
  name: string
  phone: string
  phone_digits: string
  password_hash: string | null
  max_user_id: string | null
  blocked: boolean
  session_version: number
  created_at: string
  last_login_at: string | null
}

/** Клиент без секретов — то, что можно отдать в браузер */
export type PublicClient = Omit<Client, 'password_hash'> & { has_password: boolean }

export interface Order {
  id: string
  client_id: string
  lead_id: string | null
  title: string
  product: string
  stage: string
  address: string
  ready_date: string | null
  production_started: string | null
  manager_name: string
  manager_phone: string
  project_status: string
  spec: SpecRow[]
  created_at: string
  updated_at: string
}

export interface OrderVisit {
  id: string
  order_id: string
  kind: string
  starts_at: string
  note: string
  created_at: string
}

export interface OrderFile {
  id: string
  order_id: string
  pathname: string
  name: string
  size: string
  content_type: string
  kind: string
  caption: string
  visible: boolean
  created_at: string
}

export interface OrderFeedItem {
  id: string
  order_id: string
  actor: 'manager' | 'client' | 'system'
  kind: string
  text: string
  created_at: string
}

/** Дата производства → сколько дней прошло из PRODUCTION_DAYS (для полосы на этапе «Производство») */
export function productionProgress(order: Pick<Order, 'production_started' | 'ready_date'>, now = new Date()) {
  if (!order.production_started) return null
  const start = new Date(`${order.production_started.slice(0, 10)}T00:00:00+03:00`)
  const end = order.ready_date
    ? new Date(`${order.ready_date.slice(0, 10)}T00:00:00+03:00`)
    : new Date(start.getTime() + PRODUCTION_DAYS * 86_400_000)
  const total = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000))
  const passed = Math.min(total, Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86_400_000)))
  return { passed, total, share: passed / total }
}

/** Человеческая дата «12 декабря» по Москве */
export function formatDay(value: string | null | undefined, withWeekday = false): string {
  if (!value) return ''
  const date = new Date(value.length <= 10 ? `${value}T12:00:00+03:00` : value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    ...(withWeekday ? { weekday: 'long' } : {}),
    timeZone: 'Europe/Moscow',
  })
}

export function formatTime(value: string): string {
  return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' })
}
