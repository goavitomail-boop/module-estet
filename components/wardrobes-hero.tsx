'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowDown, Pause, Play } from 'lucide-react'
import { CropMarks, PlanLabel } from '@/components/plan'
import { enter, leave, POP } from '@/components/scene-kit'
import { wardrobeCollections, type WardrobeCollection } from '@/lib/wardrobes-data'
import { cn } from '@/lib/utils'
import './hero-showcase.css'

/**
 * Первый экран страницы шкафов — с главами, как на главной
 * (hero-showcase.tsx): слева неподвижные заголовок, вступление и кнопка
 * расчёта, справа по кругу идут коллекции. Каждая входит шторкой с латунной
 * кромкой, на фото встают бирки: серия, характеристики и палитра — всё из
 * каталога (lib/wardrobes-data.ts). Главу сменяет конец полоски во вкладке;
 * пауза — кнопкой и когда экран ушёл из виду. Общие приёмы — scene-kit.
 */

/** Сколько коллекция на экране, с */
const DUR = 4.6

/** Плашка поверх фото */
const chip = 'rounded-full border border-background/25 bg-foreground/75 px-2.5 py-1 text-[10px] font-bold tracking-wider text-background md:px-3.5 md:py-1.5 md:text-xs'

/** Бирки коллекции на фото: серия, палитра, характеристики */
function Scene({ collection }: { collection: WardrobeCollection }) {
  const swatches = collection.colors.slice(0, 6)
  return (
    <>
      <span
        className="hs-in absolute left-[4%] top-[5%] rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-xl md:text-xs"
        style={enter(0.75, POP)}
      >
        Серия {collection.series}
      </span>
      <span className={cn('hs-in absolute right-[4%] top-[5%] flex items-center gap-2 uppercase', chip)} style={enter(0.9, { from: 'translateY(-10px)' })}>
        {collection.colors.length} цветов
        <span className="flex -space-x-1">
          {swatches.map((color, i) => (
            <span
              key={color.name}
              className="hs-in relative size-3.5 overflow-hidden rounded-full border border-background/70 md:size-5"
              style={enter(1.05 + i * 0.06, { t: 0.5, from: 'scale(0.3)', ease: 'var(--pop)' })}
            >
              <Image src={color.image} alt="" fill sizes="20px" className="object-cover" />
            </span>
          ))}
        </span>
      </span>
      <ul className="absolute inset-x-[4%] bottom-[5%] flex flex-wrap gap-1.5 md:gap-2">
        {collection.specs.slice(0, 3).map((spec, i) => (
          <li key={spec} className={cn('hs-in', chip)} style={enter(1.0 + i * 0.09, POP)}>
            {spec}
          </li>
        ))}
      </ul>
    </>
  )
}

export function WardrobesHero({ intro, action, sections }: { intro: string; action?: ReactNode; sections: { id: string; title: string }[] }) {
  // i — текущая коллекция, prev — уходящая (ещё видна под новой), n — счётчик смен
  const [view, setView] = useState({ i: 0, prev: -1, n: 0 })
  const [userPaused, setUserPaused] = useState(false)
  const [inView, setInView] = useState(true)
  const rootRef = useRef<HTMLElement>(null)

  const go = (k: number) => setView((v) => (v.i === k ? v : { i: k, prev: v.i, n: v.n + 1 }))
  const next = () => setView((v) => ({ i: (v.i + 1) % wardrobeCollections.length, prev: v.i, n: v.n + 1 }))
  const clearPrev = () => setView((v) => (v.prev === -1 ? v : { ...v, prev: -1 }))

  // Первый экран ушёл из виду — показ стоит
  useEffect(() => {
    const element = rootRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const collection = wardrobeCollections[view.i]
  const paused = userPaused || !inView

  return (
    <header ref={rootRef} data-own-motion className={cn('hs grain relative isolate overflow-hidden bg-foreground text-background', paused && 'hs-paused')}>
      <CropMarks className="inset-x-4 bottom-4 top-24 md:inset-x-6 md:top-28" />
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 pb-10 pt-28 md:px-8 md:pb-14 md:pt-36 lg:gap-10">
        <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-12">
          {/* ── Текст: неподвижен по смыслу, только входит ── */}
          <div className="flex flex-col gap-5">
            <div className="hs-in" style={enter(0.1, { t: 0.6, ease: 'var(--out)' })}>
              <PlanLabel>Каталог · Шкафы</PlanLabel>
            </div>
            <h1 className="hs-title">
              <span className="hs-line">
                <span style={{ '--d': '0.25s' } as CSSProperties}>Модульные</span>
              </span>
              <span className="hs-line">
                <span className="text-primary" style={{ '--d': '0.35s' } as CSSProperties}>
                  шкафы
                </span>
              </span>
            </h1>
            <p className="hs-in max-w-xl text-pretty text-base leading-relaxed text-background/70 md:text-lg" style={enter(0.6, { t: 0.7, ease: 'var(--out)' })}>
              {intro}
            </p>
            {action && (
              <div className="hs-in" style={enter(0.75, { t: 0.7, ease: 'var(--out)' })}>
                {action}
              </div>
            )}
          </div>

          {/* ── Сцена: коллекции по кругу ── */}
          <div className="hs-in min-w-0" style={enter(0.3, { t: 0.9, from: 'translateY(24px)' })}>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-primary/30 bg-[#161412] shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)]" aria-hidden="true">
              {/* Фото всех коллекций в DOM: так следующее загружено заранее */}
              {wardrobeCollections.map((c, k) => {
                const active = k === view.i
                const under = k === view.prev
                const wipe = active && view.n > 0
                return (
                  <div
                    key={c.id}
                    className={cn('absolute inset-0 overflow-hidden', active ? 'z-[2]' : under ? 'z-[1]' : 'invisible', wipe && 'hs-wipe')}
                    onAnimationEnd={(event) => event.animationName === 'hs-wipe' && clearPrev()}
                  >
                    <div className={cn('absolute inset-0', wipe && 'hs-wipe-img')}>
                      <Image
                        src={c.hero}
                        alt=""
                        fill
                        priority={k === 0}
                        fetchPriority={k === 0 ? 'high' : 'low'}
                        sizes="(max-width: 1024px) 100vw, 680px"
                        className="object-cover"
                      />
                    </div>
                    {wipe && (
                      <span
                        className="hs-out absolute inset-y-0 left-0 z-10 w-0.5 bg-primary shadow-[0_0_18px_4px_rgba(216,191,138,0.55)]"
                        style={leave(0.9, { t: 0.3, to: 'none' })}
                      />
                    )}
                  </div>
                )
              })}

              {/* Низ кадра темнее — бирки читаются на любом фото */}
              <span className="pointer-events-none absolute inset-0 z-[3] bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.35)),linear-gradient(to_top,rgba(0,0,0,0.45),transparent_35%)]" />

              {/* Бирки: уходящие гаснут, новые собираются */}
              {[view.prev, view.i]
                .filter((k) => k >= 0)
                .map((k) => {
                  const leaving = k === view.prev
                  return (
                    <div key={`${k}-${leaving ? view.n - 1 : view.n}`} className={cn('absolute inset-0 z-[4]', leaving && 'hs-leave')}>
                      <Scene collection={wardrobeCollections[k]} />
                    </div>
                  )
                })}
            </div>

            {/* Вкладки: полоска текущей тянется время главы, её конец — следующая коллекция */}
            <div className="mt-4 flex items-center gap-3">
              <div className="grid flex-1 grid-cols-7 gap-1.5 md:gap-2" role="group" aria-label="Коллекции шкафов">
                {wardrobeCollections.map((c, k) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => go(k)}
                    aria-current={k === view.i ? 'true' : undefined}
                    aria-label={c.title}
                    className="group flex min-w-0 flex-col gap-2 py-1 text-left"
                  >
                    <span className="block h-0.5 overflow-hidden rounded-full bg-background/20">
                      {k === view.i && (
                        <span
                          key={view.n}
                          className="hs-progress block h-full bg-primary"
                          style={{ '--t': `${DUR}s` } as CSSProperties}
                          onAnimationEnd={(event) => event.animationName === 'hs-progress' && next()}
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        'truncate text-[10px] font-semibold tabular-nums transition-colors sm:text-[11px]',
                        k === view.i ? 'text-background' : 'text-background/45 group-hover:text-background/80',
                      )}
                    >
                      <span className="md:hidden">{String(k + 1).padStart(2, '0')}</span>
                      <span className="hidden md:inline">{c.title}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setUserPaused((value) => !value)}
                aria-label={userPaused ? 'Продолжить показ' : 'Остановить показ'}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border border-background/25 text-background/75 transition-colors hover:border-primary hover:text-primary"
              >
                {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
              </button>
            </div>

            {/* Подпись коллекции и переход к ней на странице */}
            <div key={view.n} className="mt-3 flex min-h-[4.5rem] flex-wrap items-end justify-between gap-x-6 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="flyer-title text-2xl leading-tight md:text-3xl">
                  <span className="hs-mask">
                    <span style={{ '--d': '0.3s' } as CSSProperties}>{collection.title}</span>
                  </span>
                </p>
                <p className="hs-in mt-1 text-pretty text-sm text-background/65" style={enter(0.45, { t: 0.6, from: 'translateY(6px)', ease: 'var(--out)' })}>
                  {collection.tagline}
                </p>
              </div>
              <a
                href={`#${collection.id}`}
                className="hs-in group inline-flex items-center gap-2 text-sm font-semibold text-primary"
                style={enter(0.55, { t: 0.6, from: 'translateX(-8px)', ease: 'var(--out)' })}
              >
                К коллекции
                <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>

        {sections.length > 1 && (
          <nav aria-label="Разделы страницы" className="hs-in flex gap-2 overflow-x-auto border-t border-background/15 pb-1 pt-6" style={enter(1.0, { t: 0.7, ease: 'var(--out)' })}>
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`} className="plan-chip plan-chip--on-dark">
                <span className="plan-num" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {section.title}
              </a>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}
