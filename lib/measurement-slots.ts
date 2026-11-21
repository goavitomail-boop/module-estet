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

/** Слоты, которые сегодня уже начались или начнутся меньше чем через час */
export function passedSlotsToday(hour: number = moscowHour()): string[] {
  return MEASUREMENT_SLOTS.filter((s) => hour >= s.endsHour - 1).map((s) => s.value)
}

/** Последний день, на который открыта запись, YYYY-MM-DD */
export function bookingLastDay(today: string = moscowToday()): string {
  const last = new Date(`${today}T00:00:00Z`)
  last.setUTCDate(last.getUTCDate() + BOOKING_HORIZON_DAYS)
  return last.toISOString().slice(0, 10)
}

/**
 * Почему на эту дату и время записаться нельзя, или пустая строка.
 *
 * Форма сама не даёт выбрать прошедшее, но запрос можно собрать в обход неё
 * или отправить из вкладки, открытой вчера, — последнее слово за сервером.
 */
export function measurementTimeProblem(date: string, slot: string, today: string = moscowToday(), hour: number = moscowHour()): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !SLOT_VALUES.includes(slot)) return 'Выберите дату и время замера.'
  if (date < today) return 'Эта дата уже прошла — выберите другую.'
  if (date > bookingLastDay(today)) return `Запись открыта на ${BOOKING_HORIZON_DAYS} дней вперёд — выберите дату пораньше.`
  if (date === today && passedSlotsToday(hour).includes(slot)) return 'Это время сегодня уже прошло — выберите другое.'
  return ''
}
