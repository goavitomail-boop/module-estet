'use client'

import { useEffect, useState } from 'react'
import { COMPANY } from '@/lib/company'
import { cn } from '@/lib/utils'

/** Текущий час по Москве — клиенты и менеджеры живут по этому времени */
function moscowHour(): number {
  const hour = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: 'numeric', hourCycle: 'h23' }).format(new Date())
  return Number.parseInt(hour, 10)
}

/**
 * На связи ли мы сейчас. Считается по графику из COMPANY.hours, а не
 * выдумывается, поэтому вечером честно говорит, что ответим утром.
 *
 * До монтирования — null: на сервере другое время и часовой пояс, и текст
 * разошёлся бы с гидратацией. Пока null, строки ниже держат место невидимыми.
 */
function useContactOpen(): boolean | null {
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const update = () => {
      const hour = moscowHour()
      setOpen(hour >= COMPANY.hours.open && hour < COMPANY.hours.close)
    }
    update()
    const id = window.setInterval(update, 60_000)
    return () => window.clearInterval(id)
  }, [])

  return open
}

/** «Сейчас на связи · до 21:00» — в финальном призыве, у кнопки «Позвонить» */
export function ContactStatus() {
  const open = useContactOpen()

  return (
    <p className={cn('hero-life__status', open === null && 'invisible')} aria-live="polite">
      <span className={cn('hero-life__status-dot', open && 'hero-life__status-dot--live')} aria-hidden="true" />
      {open === false
        ? `Сейчас не на связи · ответим с ${COMPANY.hours.open}:00`
        : `Сейчас на связи · до ${COMPANY.hours.close}:00`}
    </p>
  )
}

/**
 * Компактный статус под названием в шапке — на месте подписи «кухни на
 * заказ» (на главной она и так стоит строкой ниже, в hero). Рядом кнопка
 * звонка, так что часы работы читаются вместе с ней
 */
export function HeaderStatus({ className }: { className?: string }) {
  const open = useContactOpen()

  return (
    <span className={cn('flex items-center gap-1.5 transition-opacity duration-500', open === null && 'opacity-0', className)}>
      <span className={cn('site-status-dot', open && 'site-status-dot--live')} aria-hidden="true" />
      {open === false ? `ответим с ${COMPANY.hours.open}:00` : `на связи до ${COMPANY.hours.close}:00`}
    </span>
  )
}
