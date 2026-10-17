/**
 * Слоты замера — общие для сайта, панели и проверки на сервере.
 *
 * Лежат отдельным модулем без зависимостей, потому что нужны и клиентской
 * форме записи, и серверным маршрутам: любой импорт из lib/db.ts сюда
 * затащил бы драйвер базы в браузерный бандл.
 */

export const MEASUREMENT_SLOTS = [
  { value: 'morning', label: 'Утро', time: '09:00 — 12:00', startsHour: 9, endsHour: 12 },
  { value: 'day', label: 'День', time: '13:00 — 16:00', startsHour: 13, endsHour: 16 },
  { value: 'evening', label: 'Вечер', time: '17:00 — 20:00', startsHour: 17, endsHour: 20 },
] as const

export type SlotValue = (typeof MEASUREMENT_SLOTS)[number]['value']

export const SLOT_VALUES = MEASUREMENT_SLOTS.map((s) => s.value) as readonly string[]

/**
 * Сколько замеров помещается в один слот.
 *
 * По умолчанию один: слот длится три часа, а замер с дорогой занимает
 * примерно столько же. Три слота в день дают три замера — это и есть
 * обычная дневная норма. Если бригад больше, поднимите значение
 * переменной MEASUREMENT_SLOT_CAPACITY.
 */
export function slotCapacity(): number {
  const raw = Number(process.env.MEASUREMENT_SLOT_CAPACITY)
  return Number.isFinite(raw) && raw >= 1 ? Math.trunc(raw) : 1
}

/** На сколько дней вперёд открыта запись */
export const BOOKING_HORIZON_DAYS = 60

export function slotByValue(value: string) {
  return MEASUREMENT_SLOTS.find((s) => s.value === value)
}

export function slotLabel(value: string): string {
  const slot = slotByValue(value)
  return slot ? `${slot.label} (${slot.time})` : value
}

/** Дата в формате YYYY-MM-DD по московскому времени */
export function moscowToday(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Moscow' })
}

/** Текущий час в Москве — нужен, чтобы не предлагать уже прошедший слот */
export function moscowHour(): number {
  return Number(
    new Date().toLocaleString('en-US', { timeZone: 'Europe/Moscow', hour: '2-digit', hour12: false })
  )
}
