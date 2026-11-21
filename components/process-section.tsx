'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { Check, Factory, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PlanLabel } from '@/components/plan'
import { enter, leave, POP } from '@/components/scene-kit'
import { MEASUREMENT_SLOTS } from '@/lib/measurement-slots'

/**
 * «Как мы работаем» — одна история при прокрутке. Слева пять шагов, справа
 * прилипшая сцена: шаг, дошедший до середины экрана, сменяет её шторкой —
 * вперёд справа, назад слева. Каждая сцена отыгрывает свой шаг: переписку,
 * замер с чертежом, договор, цех и сборку на реальных кадрах объекта.
 */

const chip = 'rounded-full border border-background/25 bg-foreground/80 px-2.5 py-1 text-[10px] font-bold tracking-wider text-background md:px-3.5 md:py-1.5 md:text-xs'

function Bubble({ me, d, children }: { me?: boolean; d: number; children: ReactNode }) {
  return (
    <span
      className={cn(
        'hs-in block max-w-[85%] rounded-2xl px-2.5 py-1.5 md:px-3.5 md:py-2',
        me ? 'self-end rounded-br-md bg-primary text-primary-foreground' : 'self-start rounded-bl-md bg-background/10 text-background',
      )}
      style={enter(d, { t: 0.6, from: `translate(${me ? 8 : -8}%, 30%) scale(0.9)` })}
    >
      {children}
    </span>
  )
}

function SceneCall() {
  const day = MEASUREMENT_SLOTS.find((s) => s.value === 'day')
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(216,191,138,0.2),transparent_70%)]">
      <div
        className="hs-in absolute left-1/2 top-1/2 w-[82%] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-background/10 bg-[#211e1b] p-3 shadow-2xl md:w-[66%] md:p-5"
        style={enter(0.15, { t: 0.8, from: 'translateY(8%) scale(0.96)' })}
      >
        <div className="flex items-center gap-2 border-b border-background/10 pb-2 md:gap-3 md:pb-3">
          <span className="flyer-title flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground md:size-9 md:text-lg">М</span>
          <span className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold md:text-sm">Модуль Эстет</span>
            <span className="flex items-center gap-1 text-[8px] text-background/55 md:text-xs">
              <span className="size-1.5 rounded-full bg-primary" />
              на связи
            </span>
          </span>
        </div>
        <div className="mt-2.5 flex flex-col gap-1.5 text-[9px] leading-snug md:mt-4 md:gap-2.5 md:text-sm">
          <Bubble me d={0.6}>
            Здравствуйте! Хотим угловую кухню, около трёх метров
          </Bubble>
          {/* «Печатает…» на месте будущего ответа */}
          <span className="relative flex flex-col">
            <span className="hs-out absolute left-0 top-0" style={leave(1.75, { t: 0.2, to: 'scale(0.8)' })}>
              <span className="hs-in flex gap-1 rounded-2xl rounded-bl-md bg-background/10 px-3 py-2.5 md:py-3" style={enter(1.15, { t: 0.4, from: 'scale(0.6)', ease: 'var(--pop)' })}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="size-1 rounded-full bg-background/60 md:size-1.5" />
                ))}
              </span>
            </span>
            <Bubble d={1.85}>Добрый день! Приедем на бесплатный замер — когда вам удобно?</Bubble>
          </span>
          <Bubble me d={2.6}>
            В субботу днём
          </Bubble>
          <span className="hs-in flex items-center gap-1.5 self-start rounded-full border border-primary/60 px-2.5 py-1 font-semibold text-primary md:px-3.5 md:py-1.5" style={enter(3.25, POP)}>
            <Check className="size-3 md:size-4" aria-hidden="true" />
            Записали: суббота, {day?.time}
          </span>
        </div>
      </div>
    </div>
  )
}

/** Модули на чертеже: доли ширины стены */
const LOWER = [1.1, 1, 1.3, 1, 0.9]
const UPPER = [1.1, 1, 1.3, 1.9]

function SceneMeasure() {
  return (
    <div className="absolute inset-0 bg-[#161412] [background-image:linear-gradient(rgba(216,191,138,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(216,191,138,0.07)_1px,transparent_1px)] [background-size:28px_28px]">
      <span className="hs-fade absolute left-[4%] top-[5%] font-mono text-[8px] uppercase tracking-[0.2em] text-primary/80 md:text-xs" style={{ '--d': '0.2s' } as CSSProperties}>
        Замер · стена с окном
      </span>
      {/* Стена и пол */}
      <span className="hs-fade absolute inset-x-[10%] bottom-[16%] top-[22%] border border-primary/30" style={{ '--d': '0.25s' } as CSSProperties} />
      <span className="hs-draw-x absolute inset-x-[5%] bottom-[16%] h-px bg-primary" style={{ '--d': '0.15s', '--t': '0.7s' } as CSSProperties} />
      {/* Размер вдоль стены: линия растёт из середины, потом число */}
      <span className="absolute inset-x-[10%] top-[12%] h-3 md:h-4">
        <span className="hs-draw-x absolute inset-x-0 top-1/2 h-px bg-primary" style={{ '--d': '0.7s', '--t': '0.9s', '--origin': 'center' } as CSSProperties} />
        <span className="hs-fade absolute inset-y-0 left-0 w-px bg-primary" style={{ '--d': '1.3s' } as CSSProperties} />
        <span className="hs-fade absolute inset-y-0 right-0 w-px bg-primary" style={{ '--d': '1.3s' } as CSSProperties} />
        <span
          className="hs-in absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded bg-[#161412] px-2 font-mono text-[9px] text-primary md:text-sm"
          style={enter(1.45, POP)}
        >
          3 600 мм
        </span>
      </span>
      {/* Модули встают по размерам */}
      <span className="absolute inset-x-[10%] bottom-[16%] flex h-[30%] gap-[1.2%]">
        {LOWER.map((grow, i) => (
          <span
            key={i}
            className="hs-in block h-full rounded-sm border border-primary/80 bg-primary/10"
            style={{ flexGrow: grow, ...enter(1.65 + i * 0.1, { t: 0.6, from: 'translateY(18%) scale(0.95)' }) }}
          />
        ))}
      </span>
      <span className="absolute inset-x-[10%] top-[22%] flex h-[24%] gap-[1.2%]">
        {UPPER.map((grow, i) => (
          <span
            key={i}
            className="hs-in block h-full rounded-sm border border-primary/80 bg-primary/10"
            style={{ flexGrow: grow, ...enter(2.1 + i * 0.1, { t: 0.6, from: 'translateY(-18%) scale(0.95)' }) }}
          />
        ))}
      </span>
      {/* Чертёж становится проектом */}
      <span className="hs-fade absolute inset-0" style={{ '--d': '2.85s', '--t': '0.9s' } as CSSProperties}>
        <Image src="/images/collections/soft-wood.webp" alt="" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
      </span>
      <span className={cn('hs-in absolute left-[4%] top-[5%]', chip, 'border-primary/60')} style={enter(3.35, POP)}>
        3D-проект
      </span>
    </div>
  )
}

const ESTIMATE = ['Корпуса и фасады', 'Столешница', 'Фурнитура и наполнение', 'Доставка и сборка', 'Гарантия 5 лет']

function SceneContract() {
  return (
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_100%,rgba(216,191,138,0.16),transparent_70%)]">
      <div className="hs-in absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2 md:w-[56%]" style={enter(0.15, { t: 0.9, from: 'translateY(14%) rotate(5deg)' })}>
        <div className="-rotate-2 rounded-xl bg-background p-3 text-foreground shadow-2xl md:p-6">
          <span className="block font-mono text-[7px] uppercase tracking-[0.2em] text-primary md:text-[11px]">Смета · договор</span>
          <span className="flyer-title mt-1 block text-sm leading-tight md:text-2xl">Кухня по вашему проекту</span>
          <span className="mt-2 flex flex-col md:mt-4">
            {ESTIMATE.map((row, i) => (
              <span key={row} className="flex items-center justify-between gap-2 border-b border-dotted border-foreground/20 py-1 text-[8px] md:py-2 md:text-sm">
                <span className="text-foreground/75">{row}</span>
                <Check className="hs-in size-2.5 text-primary md:size-4" style={enter(0.75 + i * 0.22, { t: 0.45, from: 'scale(0.3)', ease: 'var(--pop)' })} aria-hidden="true" />
              </span>
            ))}
          </span>
          <span className="mt-2 flex items-end justify-between gap-3 md:mt-4">
            <span className="text-[7px] leading-snug text-foreground/60 md:text-xs">Стоимость и сроки — в договоре</span>
            <span className="relative w-[38%] shrink-0 pb-0.5">
              <span className="flyer-script hs-fade block text-right text-xs leading-none text-foreground/80 md:text-2xl" style={{ '--d': '2.25s' } as CSSProperties}>
                Подпись
              </span>
              <span className="hs-draw-x absolute inset-x-0 bottom-0 h-px bg-foreground/60" style={{ '--d': '2.05s', '--t': '0.5s' } as CSSProperties} />
            </span>
          </span>
        </div>
        {/* Штамп опускается, как настоящий */}
        <span
          className="hs-in absolute -bottom-[9%] -right-[7%] -rotate-12 rounded-lg border-[3px] border-primary bg-[#161412]/85 px-2.5 py-1 text-center text-[9px] font-black uppercase leading-tight tracking-wider text-primary shadow-xl md:px-4 md:py-2 md:text-base"
          style={enter(2.75, { t: 0.55, from: 'scale(1.9)', ease: 'var(--pop)' })}
        >
          Цена
          <br />
          зафиксирована
        </span>
      </div>
    </div>
  )
}

const FACTORY = ['Раскрой плит', 'Кромка на PUR-клей', 'Присадка и фурнитура', 'Контроль качества']

function SceneFactory() {
  return (
    <div className="absolute inset-0">
      <Image src="/images/workshop.webp" alt="" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
      <span className="absolute inset-0 bg-[#161412]/45" />
      <span className={cn('hs-in absolute left-[4%] top-[5%] flex items-center gap-1.5', chip)} style={enter(0.5, POP)}>
        <Factory className="size-3 text-primary md:size-3.5" aria-hidden="true" />
        Своя фабрика · Московская область
      </span>
      <div
        className="hs-in absolute bottom-[6%] right-[4%] w-[58%] rounded-2xl border border-primary/30 bg-[#161412]/90 p-3 md:w-[46%] md:p-5"
        style={enter(0.35, { t: 0.8, from: 'translateY(16%)' })}
      >
        <span className="flyer-title block text-xs md:text-xl">Изготовление</span>
        <span className="mt-2 block h-1 overflow-hidden rounded-full bg-background/15 md:mt-3">
          <span className="hs-draw-x block h-full bg-primary" style={{ '--d': '0.7s', '--t': '2.4s' } as CSSProperties} />
        </span>
        <span className="mt-2 flex flex-col gap-1 md:mt-3 md:gap-2">
          {FACTORY.map((row, i) => (
            <span key={row} className="hs-in flex items-center gap-2 text-[8px] md:text-sm" style={enter(0.95 + i * 0.6, { t: 0.5, from: 'translateX(-8px)', ease: 'var(--out)' })}>
              <span className="flex size-3 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:size-5">
                <Check className="size-2 md:size-3" aria-hidden="true" />
              </span>
              {row}
            </span>
          ))}
        </span>
      </div>
    </div>
  )
}

/** Реальные кадры одного объекта — те же, что в блоке «Сборка» */
const BUILD = [
  { src: '/images/assembly/01-carcasses.webp', label: 'Корпуса' },
  { src: '/images/assembly/03-fronts.webp', label: 'Фасады' },
  { src: '/images/assembly/07-done.webp', label: 'Готово' },
]

function SceneAssembly() {
  const at = [0, 1.3, 2.6]
  return (
    <div className="absolute inset-0">
      {BUILD.map((b, i) => (
        <span key={b.src} className={cn('absolute inset-0', i > 0 && 'hs-fade')} style={{ '--d': `${at[i]}s`, '--t': '0.7s' } as CSSProperties}>
          <Image src={b.src} alt="" fill sizes="(max-width: 1024px) 100vw, 640px" className="object-cover" />
        </span>
      ))}
      <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),transparent_40%)]" />
      {/* Подпись этапа сменяется вместе с кадром */}
      <span className={cn('absolute bottom-[5%] left-[4%] flex items-center gap-1.5', chip)}>
        <span className="relative block h-[1.3em] w-[4.6em] overflow-hidden">
          {BUILD.map((b, i) => (
            <span key={b.label} className={cn('absolute inset-0', i < BUILD.length - 1 && 'hs-out')} style={i < BUILD.length - 1 ? leave(at[i + 1], { t: 0.25, to: 'translateY(-100%)' }) : undefined}>
              <span className="hs-in block" style={enter(at[i] + (i ? 0.1 : 0.4), { t: 0.5, from: 'translateY(100%)', ease: 'var(--out)' })}>
                {b.label}
              </span>
            </span>
          ))}
        </span>
        <Check className="hs-in size-3 text-primary md:size-3.5" style={enter(at[2] + 0.3, { t: 0.5, from: 'scale(0.3)', ease: 'var(--pop)' })} aria-hidden="true" />
      </span>
      <span className={cn('hs-in absolute right-[4%] top-[5%] flex items-center gap-1.5', chip, 'border-primary/60')} style={enter(at[2] + 0.5, POP)}>
        <ShieldCheck className="size-3 text-primary md:size-3.5" aria-hidden="true" />
        Гарантия 5 лет
      </span>
    </div>
  )
}

const steps = [
  {
    number: '01',
    title: 'Звонок и консультация',
    description: 'Обсуждаем пожелания, отвечаем на вопросы и договариваемся о замере.',
    Scene: SceneCall,
  },
  {
    number: '02',
    title: 'Замер и дизайн-проект',
    description: 'Выезжаем к вам домой, делаем замер и готовим проект с 3D-визуализацией.',
    Scene: SceneMeasure,
  },
  {
    number: '03',
    title: 'Расчёт и договор',
    description: 'Фиксируем стоимость и сроки в договоре. Никаких сюрпризов в процессе.',
    Scene: SceneContract,
  },
  {
    number: '04',
    title: 'Производство',
    description: 'Изготавливаем кухню на собственном производстве с контролем качества.',
    Scene: SceneFactory,
  },
  {
    number: '05',
    title: 'Доставка и сборка',
    description: 'Привозим, собираем и подключаем технику. Вы получаете готовую кухню.',
    Scene: SceneAssembly,
  },
]

export function ProcessSection() {
  // i — текущий шаг, prev — уходящий (виден под шторкой), n — счётчик смен
  // (0 — сцена ещё не видна и не начиналась), dir — куда листают
  const [view, setView] = useState({ i: 0, prev: -1, n: 0, dir: 1 })
  const stageRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    const list = listRef.current
    if (!stage || !list || typeof IntersectionObserver === 'undefined') return
    const go = (k: number) =>
      setView((v) => (v.n === 0 ? { i: k, prev: -1, n: 1, dir: 1 } : v.i === k ? v : { i: k, prev: v.i, n: v.n + 1, dir: k > v.i ? 1 : -1 }))
    // Сцена оживает, когда её видно: иначе первая отыграла бы, пока человек ещё наверху
    const start = new IntersectionObserver(([e]) => e.isIntersecting && setView((v) => (v.n === 0 ? { ...v, n: 1 } : v)), { threshold: 0.35 })
    // Шаг текущий, когда пересекает полосу чуть ниже середины экрана —
    // на телефоне это под прилипшей сценой
    const band = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && go(Number((e.target as HTMLElement).dataset.step))),
      { rootMargin: '-55% 0px -44% 0px' },
    )
    start.observe(stage)
    list.querySelectorAll('[data-step]').forEach((el) => band.observe(el))
    return () => {
      start.disconnect()
      band.disconnect()
    }
  }, [])

  const clearPrev = () => setView((v) => (v.prev === -1 ? v : { ...v, prev: -1 }))

  return (
    <section id="process" className="paper py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="mb-8 max-w-2xl md:mb-12" data-anim>
          <PlanLabel index={7} className="mb-4">
            Как мы работаем
          </PlanLabel>
          <h2 className="flyer-title text-balance text-3xl text-foreground md:text-5xl">Пять шагов до кухни вашей мечты</h2>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-14">
          {/* ── Сцена: на телефоне прилипает сверху, на компьютере — справа,
              по центру экрана, на одной линии с текущим шагом ── */}
          <div className="sticky top-16 z-10 -mx-4 bg-[var(--paper)] px-4 pb-4 pt-3 md:top-20 lg:col-start-2 lg:row-start-1 lg:top-[max(7rem,calc(50vh-13rem))] lg:mx-0 lg:self-start lg:bg-transparent lg:p-0">
            <div
              ref={stageRef}
              className="hs relative aspect-[4/3] overflow-hidden rounded-3xl border-2 border-primary bg-[#161412] text-background shadow-[0_30px_60px_-30px_rgba(0,0,0,0.6)]"
              aria-hidden="true"
            >
              {view.n > 0 &&
                [view.prev, view.i]
                  .filter((k) => k >= 0)
                  .map((k) => {
                    const current = k === view.i
                    const wipe = current && view.prev >= 0
                    const Scene = steps[k].Scene
                    return (
                      <div
                        key={`${k}-${current ? view.n : view.n - 1}`}
                        className={cn('absolute inset-0 overflow-hidden', current ? 'z-[2]' : 'z-[1]', wipe && 'hs-wipe', wipe && view.dir < 0 && 'hs-wipe--back')}
                        onAnimationEnd={(e) => e.target === e.currentTarget && clearPrev()}
                      >
                        <div className={cn('absolute inset-0', wipe && 'hs-wipe-img')}>
                          <Scene />
                        </div>
                        {wipe && (
                          <span
                            className={cn('hs-out absolute inset-y-0 z-10 w-0.5 bg-primary shadow-[0_0_18px_4px_rgba(216,191,138,0.55)]', view.dir < 0 ? 'right-0' : 'left-0')}
                            style={leave(0.9, { t: 0.3, to: 'none' })}
                          />
                        )}
                      </div>
                    )
                  })}
            </div>
            {/* На телефоне шаги — полоской под сценой */}
            <div className="mt-3 grid grid-cols-5 gap-1.5 lg:hidden" aria-hidden="true">
              {steps.map((s, k) => (
                <span key={s.number} className={cn('h-0.5 rounded-full transition-colors duration-500', k <= view.i ? 'bg-primary' : 'bg-primary/20')} />
              ))}
            </div>
          </div>

          {/* ── Шаги ── */}
          <ol ref={listRef} className="relative lg:col-start-1 lg:row-start-1">
            {/* Латунная линия пути: заполняется до текущего шага */}
            <span className="absolute inset-y-[6%] left-0 hidden w-px bg-primary/20 lg:block" aria-hidden="true">
              <span
                className="block h-full origin-top bg-primary transition-transform duration-700 ease-out"
                style={{ transform: `scaleY(${(view.i + 1) / steps.length})` }}
              />
            </span>
            {steps.map((s, k) => (
              <li
                key={s.number}
                data-step={k}
                aria-current={k === view.i ? 'step' : undefined}
                className={cn(
                  'flex min-h-[44svh] flex-col justify-center gap-2 py-6 transition-opacity duration-500 md:gap-3 lg:min-h-[64vh] lg:pl-10',
                  k === view.i ? 'opacity-100' : 'opacity-35',
                )}
              >
                <span className="flyer-title text-4xl text-primary md:text-5xl">{s.number}</span>
                <h3 className="flyer-title text-2xl leading-snug text-foreground md:text-3xl">{s.title}</h3>
                <p className="max-w-md text-base leading-relaxed text-muted-foreground">{s.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
