'use client'

import { useEffect, useState } from 'react'
import { Phone, Ruler } from 'lucide-react'
import { MaxSocialIcon } from '@/components/max-social-icon'
import { useFloatingHidden } from '@/lib/use-floating-hidden'
import { cn } from '@/lib/utils'

/** Подсказка слева от кнопки: колонка стоит у правого края экрана */
function Tooltip({ children }: { children: React.ReactNode }) {
  return (
    <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-foreground px-3 py-1.5 text-xs font-semibold text-background opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  )
}

export function DesktopFloatingWidget() {
  const [scrolled, setScrolled] = useState(false)
  const nearFooter = useFloatingHidden()
  const visible = scrolled && !nearFooter

  useEffect(() => {
    const handleScroll = () => {
      // Показывать после скролла за пределы первого экрана
      setScrolled(window.scrollY > 400)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Вертикальная колонка у самого края: горизонтальная плашка шириной
  // ~190px заходила на контент (стрелки FAQ, подписи проектов)
  return (
    <aside
      aria-label="Быстрая связь"
      aria-hidden={!visible}
      className={cn(
        'fixed bottom-6 right-6 z-40 hidden flex-col items-center gap-2 rounded-full border border-primary/20 bg-background/80 p-1.5 shadow-2xl backdrop-blur-md transition-all duration-300 md:flex',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'
      )}
    >
      {/* Кнопка записи на замер */}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event('measurement-booking:open'))}
        aria-label="Записаться на бесплатный замер"
        tabIndex={visible ? 0 : -1}
        className="group relative flex h-16 w-11 flex-col items-center justify-center gap-1 rounded-full border border-primary bg-primary font-bold text-primary-foreground shadow-md transition-all duration-300 hover:scale-105 hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <Tooltip>Записаться на замер</Tooltip>
        <Ruler className="size-4 shrink-0" aria-hidden="true" />
        <span className="text-[9px] uppercase tracking-wider">Замер</span>
      </button>

      {/* Кнопка прямого звонка */}
      <a
        href="tel:+79253401211"
        aria-label="Позвонить в Модуль Эстет: +7 925 340-12-11"
        tabIndex={visible ? 0 : -1}
        className="group relative flex size-11 items-center justify-center rounded-full border border-primary/30 bg-foreground text-background shadow-md transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Tooltip>+7 925 340-12-11</Tooltip>
        <Phone className="size-4 text-primary transition-colors group-hover:text-primary-foreground" aria-hidden="true" />
      </a>

      {/* Кнопка соцсети Макс */}
      <a
        href="https://web.max.ru/93711404"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Написать нам в Макс: web.max.ru/93711404"
        tabIndex={visible ? 0 : -1}
        className="group relative flex size-11 items-center justify-center rounded-full border border-primary/30 bg-foreground text-primary shadow-md transition-all duration-300 hover:scale-105 hover:border-primary hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Tooltip>Написать в Max</Tooltip>
        <MaxSocialIcon className="size-5 transition-transform group-hover:scale-110" />
      </a>
    </aside>
  )
}
