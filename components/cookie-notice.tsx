'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { readConsent, writeConsent, type ConsentChoice } from '@/lib/consent'

/**
 * Баннер выбора: принять необязательную аналитику или обойтись необходимым.
 *
 * Обе кнопки одного размера и стоят рядом — отказ не должен быть спрятан
 * глубже согласия. И отказ здесь настоящий: он выключает сбор источника
 * перехода и учёт шагов квиза (см. lib/consent.ts).
 */

/** Уход полосы. Совпадает с длительностью transition ниже. */
const LEAVE_DURATION = 300

export function CookieNotice() {
  const [mounted, setMounted] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (readConsent() !== null) return

    const root = document.documentElement

    // Пока играет заставка, она закрывает экран целиком — баннер поверх неё
    // выглядел бы как ошибка. Прелоадер держит на <html> data-preloader и
    // снимает его, когда уходит; ждём именно этого момента.
    if (!root.dataset.preloader) {
      setMounted(true)
      return
    }

    const observer = new MutationObserver(() => {
      if (!root.dataset.preloader) {
        setMounted(true)
        observer.disconnect()
      }
    })
    observer.observe(root, { attributes: true, attributeFilter: ['data-preloader'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => window.clearTimeout(leaveTimer.current), [])

  function choose(choice: ConsentChoice) {
    writeConsent(choice)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setMounted(false)
      return
    }

    setLeaving(true)
    leaveTimer.current = window.setTimeout(() => setMounted(false), LEAVE_DURATION)
  }

  if (!mounted) return null

  return (
    <div
      role="region"
      aria-label="Использование файлов cookie"
      className={cn(
        // Снизу слева: правый нижний угол занят плавающим виджетом связи.
        // На мобильных виджета нет, поэтому там полоса во всю ширину.
        'fixed inset-x-0 bottom-0 z-40 md:inset-x-auto md:bottom-6 md:left-6 md:max-w-lg',
        'border-t border-primary/20 bg-background/85 shadow-2xl backdrop-blur-md',
        'md:rounded-2xl md:border',
        'motion-safe:transition-all motion-safe:duration-300',
        leaving ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      )}
    >
      <div className="flex flex-col gap-4 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 md:pb-4">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Мы используем куки и «Яндекс.Метрику», чтобы понимать, как сделать сайт удобнее.{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            Подробнее
          </a>
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="h-11 rounded-full bg-primary px-6 text-xs font-bold uppercase tracking-wider text-primary-foreground shadow-md transition-all duration-300 hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Принимаю
          </button>
          <button
            type="button"
            onClick={() => choose('necessary')}
            className="h-11 rounded-full border-2 border-border px-6 text-xs font-bold uppercase tracking-wider text-foreground transition-all duration-300 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Только необходимые
          </button>
        </div>
      </div>
    </div>
  )
}
