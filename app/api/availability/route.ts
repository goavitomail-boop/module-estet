import { NextResponse } from 'next/server'
import { getSlotOccupancy, isDbConfigured } from '@/lib/db'
import {
  BOOKING_HORIZON_DAYS,
  MEASUREMENT_SLOTS,
  moscowHour,
  moscowToday,
  slotCapacity,
} from '@/lib/measurement-slots'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Занятость слотов замера для формы записи на сайте.
 *
 * Публичный маршрут, поэтому отдаёт только числа: сколько ПОДТВЕРЖДЁННЫХ
 * замеров стоит на дату и слот. Заявки, которые менеджер ещё не подтвердил
 * в панели, время не занимают и сюда не попадают. Ни имён, ни телефонов, ни адресов здесь нет и быть не должно —
 * иначе по открытому адресу утекала бы клиентская база.
 */
export async function GET() {
  const today = moscowToday()
  const horizon = new Date(`${today}T00:00:00Z`)
  horizon.setUTCDate(horizon.getUTCDate() + BOOKING_HORIZON_DAYS)
  const to = horizon.toISOString().slice(0, 10)

  const capacity = slotCapacity()

  // Слоты, которые сегодня уже начались, предлагать нельзя
  const hour = moscowHour()
  const passedToday = MEASUREMENT_SLOTS.filter((s) => hour >= s.endsHour - 1).map((s) => s.value)

  if (!isDbConfigured()) {
    // Без базы занятость неизвестна. Отдаём пустую — потерять запись хуже,
    // чем принять вторую на тот же слот: менеджер разрулит это звонком.
    return NextResponse.json(
      { capacity, taken: {}, passedToday, today, horizonDays: BOOKING_HORIZON_DAYS },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }

  try {
    const taken = await getSlotOccupancy(today, to)
    return NextResponse.json(
      { capacity, taken, passedToday, today, horizonDays: BOOKING_HORIZON_DAYS },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('[Availability] Не удалось получить занятость:', error)
    return NextResponse.json(
      { capacity, taken: {}, passedToday, today, horizonDays: BOOKING_HORIZON_DAYS },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  }
}
