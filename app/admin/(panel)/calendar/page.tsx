import Link from 'next/link'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-react'
import { getMeasurementsInRange, isDbConfigured, type ScheduledMeasurement } from '@/lib/db'
import { prettyPhone, telHref } from '@/lib/admin-format'
import { MEASUREMENT_SLOTS, slotCapacity } from '@/lib/measurement-slots'
import { EmptyState, Panel, StatusBadge } from '../../_components/ui'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Календарь замеров' }

const MSK = 'Europe/Moscow'

/** Понедельник недели, содержащей указанную дату */
function weekStart(date: Date): Date {
  const d = new Date(date)
  const day = (d.getDay() + 6) % 7 // 0 = понедельник
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function iso(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const weekParam = Array.isArray(params.week) ? params.week[0] : params.week

  if (!isDbConfigured()) {
    return <EmptyState title="Нет подключения к базе" hint="Календарь замеров недоступен." />
  }

  const anchor = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? new Date(weekParam) : new Date()
  const start = weekStart(Number.isNaN(anchor.getTime()) ? new Date() : anchor)
  const end = addDays(start, 6)
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const todayIso = iso(new Date())

  const measurements = await getMeasurementsInRange(iso(start), iso(end))
  const capacity = slotCapacity()

  // Раскладываем по «дата + слот», чтобы сетка строилась без перебора всего массива
  const grid = new Map<string, ScheduledMeasurement[]>()
  for (const m of measurements) {
    const slot = MEASUREMENT_SLOTS.some((s) => s.value === m.slot) ? m.slot : 'unknown'
    const key = `${m.date}|${slot}`
    grid.set(key, [...(grid.get(key) ?? []), m])
  }
  const unslotted = measurements.filter((m) => !MEASUREMENT_SLOTS.some((s) => s.value === m.slot))

  // Время занимают только подтверждённые замеры. Остальные — просьбы клиентов,
  // которые ждут решения менеджера: в сетке они видны, но слот не блокируют
  /** Сколько подтверждённых замеров уже стоит в том же дне и слоте */
  const bookedIn = (m: ScheduledMeasurement) => (grid.get(`${m.date}|${m.slot}`) ?? []).filter(isConfirmed).length
  const confirmedCount = measurements.filter(isConfirmed).length
  const pendingCount = measurements.filter(isPending).length

  const monthLabel = start.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: MSK })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Календарь замеров</h1>
          {/* first-letter, а не capitalize: последний поднимает каждое слово
              и превращает «сентябрь 2026 г.» в «Сентябрь 2026 Г.» */}
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="inline-block first-letter:uppercase">{monthLabel}</span> · подтверждено на неделю:{' '}
            <strong className="text-foreground">{confirmedCount}</strong>
            {pendingCount > 0 && (
              <>
                {' '}· ждут подтверждения:{' '}
                <strong className="text-amber-700">{pendingCount}</strong>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <NavLink href={`/admin/calendar?week=${iso(addDays(start, -7))}`} label="Предыдущая неделя">
            <ChevronLeft className="size-4" aria-hidden />
          </NavLink>
          <Link
            href="/admin/calendar"
            className="flex h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium transition hover:bg-secondary"
          >
            Текущая
          </Link>
          <NavLink href={`/admin/calendar?week=${iso(addDays(start, 7))}`} label="Следующая неделя">
            <ChevronRight className="size-4" aria-hidden />
          </NavLink>
        </div>
      </header>

      {/* ── Телефон: список по дням. Сетка 7×3 на 375px нечитаема ── */}
      <div className="space-y-3 lg:hidden">
        {days.map((day) => {
          const dayIso = iso(day)
          const items = measurements.filter((m) => m.date === dayIso)
          return (
            <section
              key={dayIso}
              className={cn(
                'rounded-xl border bg-card shadow-sm',
                dayIso === todayIso ? 'border-primary' : 'border-border',
                items.length === 0 && 'opacity-60'
              )}
            >
              <header className="flex items-baseline justify-between border-b border-border px-4 py-2.5">
                <h2 className="text-sm font-semibold first-letter:uppercase">
                  {day.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' })}
                </h2>
                {dayIso === todayIso && <span className="text-xs font-medium text-primary">сегодня</span>}
              </header>
              {items.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Замеров нет</p>
              ) : (
                <ul className="divide-y divide-border">
                  {items.map((m) => (
                    <li key={m.id} className="p-4">
                      <SlotCard measurement={m} showSlot slotFull={bookedIn(m) >= capacity} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      {/* ── Десктоп: сетка «день × слот» ── */}
      <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:block">
        <div className="grid grid-cols-[110px_repeat(7,minmax(0,1fr))]">
          <div className="border-b border-r border-border bg-secondary/60" />
          {days.map((day) => {
            const dayIso = iso(day)
            return (
              <div
                key={dayIso}
                className={cn(
                  'border-b border-r border-border px-3 py-2.5 text-center last:border-r-0',
                  dayIso === todayIso ? 'bg-primary/10' : 'bg-secondary/60'
                )}
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {day.toLocaleDateString('ru-RU', { weekday: 'short' })}
                </p>
                <p className={cn('text-sm font-semibold', dayIso === todayIso && 'text-accent-foreground')}>
                  {day.getDate()}
                </p>
              </div>
            )
          })}

          {MEASUREMENT_SLOTS.map((slot) => (
            <div key={slot.value} className="contents">
              <div className="border-b border-r border-border bg-secondary/30 px-3 py-3">
                <p className="text-sm font-medium">{slot.label}</p>
                <p className="text-xs tabular-nums text-muted-foreground">{slot.time}</p>
              </div>
              {days.map((day) => {
                const dayIso = iso(day)
                const items = grid.get(`${dayIso}|${slot.value}`) ?? []
                // Норму слота расходуют только подтверждённые замеры
                const booked = items.filter(isConfirmed).length
                const full = booked >= capacity
                return (
                  <div
                    key={`${dayIso}-${slot.value}`}
                    className={cn(
                      'min-h-[92px] space-y-2 border-b border-r border-border p-2 last:border-r-0',
                      dayIso === todayIso && 'bg-primary/5',
                      // Красным — только сверх нормы. Сколько замеров помещается
                      // в слот, задаёт MEASUREMENT_SLOT_CAPACITY.
                      booked > capacity && 'bg-destructive/5'
                    )}
                  >
                    {items.map((m) => (
                      <SlotCard key={m.id} measurement={m} slotFull={full} />
                    ))}
                    {booked > capacity && (
                      <p className="text-center text-[10px] font-medium text-destructive">
                        сверх нормы: {booked} из {capacity}
                      </p>
                    )}
                    {booked > 0 && booked < capacity && (
                      <p className="text-center text-[10px] text-muted-foreground">
                        свободно ещё {capacity - booked}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {unslotted.length > 0 && (
        <Panel title="Без указанного времени">
          <ul className="space-y-3">
            {unslotted.map((m) => (
              <li key={m.id}>
                <SlotCard measurement={m} showSlot />
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {measurements.length === 0 && (
        <EmptyState
          title="На эту неделю замеров нет"
          hint="Здесь появятся заявки на замер с выбранной клиентом датой. Время занимается после подтверждения в карточке заявки."
        />
      )}
    </div>
  )
}

/** Подтверждён менеджером и занимает время */
function isConfirmed(m: ScheduledMeasurement): boolean {
  return m.status === 'scheduled'
}

/** Клиент попросил время, менеджер ещё не подтвердил */
function isPending(m: ScheduledMeasurement): boolean {
  return m.status === 'new' || m.status === 'in_progress'
}

function SlotCard({
  measurement,
  showSlot = false,
  slotFull = false,
}: {
  measurement: ScheduledMeasurement
  showSlot?: boolean
  /** Слот уже занят подтверждёнными замерами — неподтверждённый сюда не встанет */
  slotFull?: boolean
}) {
  const slot = MEASUREMENT_SLOTS.find((s) => s.value === measurement.slot)
  const pending = isPending(measurement)
  return (
    <div
      className={cn(
        'rounded-lg border bg-background p-2.5',
        // Пунктир — запрос, который ещё не занял время; сплошная рамка — занятое
        pending ? 'border-dashed border-amber-500/60 bg-amber-400/5' : 'border-border'
      )}
    >
      {pending && (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          {slotFull ? 'Не подтверждён · время уже занято' : 'Не подтверждён'}
        </p>
      )}
      <Link href={`/admin/leads/${measurement.id}`} className="block hover:underline">
        <p className="truncate text-sm font-medium">{measurement.name}</p>
      </Link>
      {showSlot && (
        <p className="mt-0.5 text-xs text-muted-foreground">
          {slot ? `${slot.label}, ${slot.time}` : 'время не указано'}
        </p>
      )}
      {measurement.address && (
        <p className="mt-1 flex items-start gap-1 text-xs text-muted-foreground">
          <MapPin className="mt-0.5 size-3 shrink-0" aria-hidden />
          <span className="line-clamp-2">
            {measurement.city ? `${measurement.city}, ` : ''}
            {measurement.address}
          </span>
        </p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={measurement.status} />
      </div>
      <a
        href={telHref(measurement.phone)}
        className="mt-1.5 block text-xs tabular-nums text-muted-foreground hover:text-primary"
      >
        {prettyPhone(measurement.phone)}
      </a>
      {pending && (
        <Link
          href={`/admin/leads/${measurement.id}`}
          className="mt-2 flex h-9 items-center justify-center rounded-md border border-amber-500/60 text-xs font-medium text-amber-800 transition hover:bg-amber-400/15"
        >
          {slotFull ? 'Перенести' : 'Подтвердить'}
        </Link>
      )}
    </div>
  )
}

function NavLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="flex size-11 items-center justify-center rounded-lg border border-border bg-card transition hover:bg-secondary"
    >
      {children}
    </Link>
  )
}
