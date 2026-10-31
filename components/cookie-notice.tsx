'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { readConsent, writeConsent, type ConsentChoice } from '@/lib/consent'

/**
 * Баннер выбора: принять необязательную аналитику или обойтись необходимым.
 *
 * Обе кнопки одного размера и стоят рядом — отказ не должен быть спрятан
 * глубже согласия. И отказ здесь настоящий: он выключает сбор источника
 * перехода, учёт шагов квиза и «Яндекс.Метрику» (см. lib/consent.ts).
 */

/** Уход полосы. Совпадает с длительностью transition ниже. */
const LEAVE_DURATION = 300

export function CookieNotice() {
  // Баннер есть в разметке с сервера. Тем, кто уже выбирал, его прячет CSS по
  // html[data-consent] (скрипт consentFlagScript в <head>), а пока играет
  // заставка — по html[data-preloader]: баннер поверх неё выглядел бы ошибкой
  const [mounted, setMounted] = useState(true)
  const [leaving, setLeaving] = useState(false)
  const leaveTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (readConsent() !== null) setMounted(false)
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
        'cookie-notice',
        // Снизу слева: правый нижний угол занят плавающим виджетом связи.
        // На мобильных виджета нет, поэтому там полоса во всю ширину.
        'fixed inset-x-0 bottom-0 z-40 md:inset-x-auto md:bottom-6 md:left-6 md:max-w-lg',
        'border-t border-primary/20 bg-background/85 shadow-2xl backdrop-blur-md',
        'md:rounded-2xl md:border',
        'motion-safe:transition-all motion-safe:duration-300',
        leaving ? 'pointer-events-none translate-y-4 opacity-0' : 'translate-y-0 opacity-100'
      )}
    >
      {/* На телефоне компактно: короткий текст и кнопки в ряд. Высокий баннер
          закрывал кнопки первого экрана, а его текст браузер считал главным
          содержимым страницы — и время его появления портило замер скорости */}
      <div className="flex flex-col gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:gap-4 sm:px-6 sm:py-4 md:pb-4">
        <p className="text-xs leading-snug text-muted-foreground sm:text-sm sm:leading-relaxed">
          Используем куки и «Яндекс.Метрику», чтобы делать сайт удобнее.{' '}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-foreground underline underline-offset-2 transition-colors hover:text-primary"
          >
            Подробнее
          </a>
        </p>

        <div className="flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => choose('accepted')}
            className="h-11 flex-1 rounded-full bg-primary px-4 text-xs font-bold sm:flex-none sm:px-6 uppercase tracking-wider text-primary-foreground shadow-md transition-all duration-300 hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Принимаю
          </button>
          <button
            type="button"
            onClick={() => choose('necessary')}
            className="h-11 flex-1 rounded-full border-2 border-border px-4 text-xs font-bold sm:flex-none sm:px-6 uppercase tracking-wider text-foreground transition-all duration-300 hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            Только необходимые
          </button>
        </div>
      </div>
    </div>
  )
}
