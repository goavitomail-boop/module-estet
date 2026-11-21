'use client'

import { ArrowUp } from 'lucide-react'
import { triggerMeasurementBooking } from '@/lib/booking-events'
import { PlanButton } from '@/components/plan'
import { cn } from '@/lib/utils'

/** Ссылка-кнопка «Записаться на замер»: открывает общую форму из layout */
export function FooterBookingLink({ className }: { className?: string }) {
  return (
    <button type="button" onClick={triggerMeasurementBooking} className={cn('text-left', className)}>
      Записаться на замер
    </button>
  )
}

/** Латунная кнопка «Записаться на замер» для серверных страниц (каталог) */
export function BookingPlanButton({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <PlanButton onDark={onDark} className={className} onClick={triggerMeasurementBooking}>
      Записаться на замер
    </PlanButton>
  )
}

/**
 * «Наверх» — прокрутка текущей страницы, а не ссылка на /#top:
 * та с каталожных страниц уводила на главную.
 */
export function BackToTop({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
      }}
      className={cn('group inline-flex items-center gap-2', className)}
    >
      Наверх
      <span className="flex size-8 items-center justify-center rounded-full border border-background/25 transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <ArrowUp className="size-3.5" aria-hidden="true" />
      </span>
    </button>
  )
}
