'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ArrowUpRight } from 'lucide-react'

const proofItems = [
  {
    src: '/images/hero-client-kitchen.webp',
    alt: 'Реализованная кухня клиента: графит и светлый дуб, тёплый вечерний свет',
    caption: 'Кухня Анны, Мытищи',
    days: '32 дня',
    detail: 'от проекта до готовой кухни',
  },
  {
    src: '/images/hero-client-kitchen-2.webp',
    alt: 'Светлая скандинавская кухня клиента: белые фасады и столешница из светлого дерева',
    caption: 'Кухня Марины, Химки',
    days: '27 дней',
    detail: 'от проекта до готовой кухни',
  },
  {
    src: '/images/hero-client-kitchen-3.webp',
    alt: 'Тёмно-зелёная кухня клиента с латунными ручками и мраморной столешницей',
    caption: 'Кухня Сергея и Ольги, Москва',
    days: '35 дней',
    detail: 'от проекта до готовой кухни',
  },
]

const ROTATE_MS = 5000

/**
 * Живое доказательство стоит в потоке чтения — сразу под кнопкой, где взгляд
 * уже находится. Раньше это была карточка в углу: на узких экранах она вообще
 * не выводилась, а на широких читалась как случайный декор.
 */
export function HeroProofCard() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % proofItems.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [paused])

  return (
    <div
      className="hero-life__proof-in mt-5 border-t border-background/40 pt-4 md:mt-9 md:border-background/20 md:pt-5"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* На мобильном доказательство становится одной компактной строкой. */}
      <div className="flex items-center gap-3 md:hidden">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl ring-1 ring-primary/70">
          <Image
            src={proofItems[active].src}
            alt={proofItems[active].alt}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-primary">
            Реальная кухня
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-background">
            {proofItems[active].caption}
          </p>
          <p className="mt-0.5 text-xs text-background/75">
            <span className="font-bold text-background">{proofItems[active].days}</span>{' '}
            от проекта до монтажа
          </p>
        </div>
        <a
          href="#gallery"
          aria-label="Посмотреть все реализованные интерьеры"
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-background/35 text-background transition-colors hover:border-primary hover:text-primary"
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </a>
      </div>

      <div className="hidden md:block">
        <p className="flex items-center gap-2.5 text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
          <span className="h-px w-5 shrink-0 bg-primary" aria-hidden="true" />
          Уже живут своей жизнью
        </p>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5 lg:flex-1">
          {/* Кадры клиентов — они же переключатели */}
          <div
            className="flex shrink-0 items-center gap-2.5"
            role="tablist"
            aria-label="Реализованные кухни клиентов"
          >
            {proofItems.map((item, i) => (
              <button
                key={item.src}
                type="button"
                role="tab"
                aria-selected={i === active}
                aria-label={item.caption}
                onClick={() => setActive(i)}
                onFocus={() => setActive(i)}
                className={`relative size-16 shrink-0 overflow-hidden rounded-xl transition-all duration-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  i === active
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-foreground'
                    : 'opacity-85 hover:opacity-100 md:opacity-55'
                }`}
              >
                <Image
                  src={item.src || '/placeholder.svg'}
                  alt={item.alt}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>

          {/* Слайды лежат в одной ячейке grid: высота блока всегда равна самой
              высокой подписи, поэтому переключение не дёргает вёрстку и текст
              не наползает — без магических min-height */}
          <div className="grid min-w-0 flex-1">
            {proofItems.map((item, i) => (
              <div
                key={item.caption}
                className={`col-start-1 row-start-1 transition-opacity duration-700 ${
                  i === active ? 'opacity-100' : 'pointer-events-none opacity-0'
                }`}
                aria-hidden={i !== active}
              >
                <p className="flyer-script text-pretty text-xl leading-tight text-primary sm:text-2xl">
                  {item.caption}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase leading-snug tracking-[0.08em] text-background sm:text-xs sm:tracking-[0.12em] md:text-background/65">
                  <span className="text-background">{item.days}</span> {item.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <a
          href="#gallery"
          className="group inline-flex min-h-11 shrink-0 items-center gap-1.5 self-start text-xs font-bold uppercase tracking-[0.16em] text-background transition-colors hover:text-primary md:text-background/75 lg:min-h-0 lg:self-auto"
        >
          Все интерьеры
          <ArrowUpRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </a>
        </div>
      </div>
    </div>
  )
}
