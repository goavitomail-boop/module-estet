'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { CropMarks, PlanLabel, PlanTag } from '@/components/plan'
import { enter, leave, POP } from '@/components/scene-kit'
import { cn } from '@/lib/utils'

/**
 * Этапы монтажа кухни — семь кадров с одного объекта.
 *
 * На широком экране фото закреплено слева и сменяется вслед за этапом,
 * который сейчас читают справа: новый кадр въезжает шторкой с латунной
 * кромкой по ходу прокрутки, как в «Как мы работаем», и на нём встаёт бирка
 * этапа. На планшете и телефоне закреплять нечего: у каждого этапа своё фото
 * над текстом, и карточка, ставшая текущей в ленте, оживает так же.
 * В конце рядом с готовой кухней встаёт первый кадр — с чего начинали.
 *
 * Тексты описывают только то, что видно на снимках и что мы действительно
 * делаем на монтаже, — без сроков и цифр, которых в фотографиях нет.
 */
const steps = [
  {
    title: 'Корпуса нижнего ряда',
    text: 'Застилаем пол плёнкой, собираем корпуса нижних модулей и выставляем их по уровню. От этой линии зависит всё остальное: столешница, зазоры, стыки.',
    image: '/images/assembly/01-carcasses.webp',
    alt: 'Собранные корпуса нижних модулей на застеленном плёнкой полу',
  },
  {
    title: 'Верхние шкафы и колонна',
    text: 'Навешиваем верхний ряд, ставим высокую колонну и встраиваем в неё технику — духовой шкаф и микроволновую печь.',
    image: '/images/assembly/02-uppers-columns.webp',
    alt: 'Корпуса верхних шкафов на стене и колонна со встроенной техникой',
  },
  {
    title: 'Фасады',
    text: 'Ставим фасады на нижние модули и ящики. Каждую дверцу регулируем, чтобы зазоры были одинаковыми по всей линии.',
    image: '/images/assembly/03-fronts.webp',
    alt: 'Синие глянцевые фасады на нижних модулях, часть корпусов ещё открыта',
  },
  {
    title: 'Верх до потолка',
    text: 'Закрываем верхний ряд: высокие фасады под потолок и бирюзовый ряд над рабочей зоной. Кухня уже выглядит цельной — остаётся рабочая поверхность.',
    image: '/images/assembly/04-upper-fronts.webp',
    alt: 'Кухня с установленными фасадами верхнего ряда, столешницы ещё нет',
  },
  {
    title: 'Столешница и мойка',
    text: 'Укладываем столешницу и подгоняем её к стенам. На этом объекте мойка сделана из того же материала и составляет со столешницей одно целое — без шва.',
    image: '/images/assembly/05-countertop.webp',
    alt: 'Угловая столешница с мойкой из того же материала',
  },
  {
    title: 'Барная стойка',
    text: 'Ставим барную стойку на опору и выверяем горизонт. Она продолжает рабочую поверхность и отделяет кухню от комнаты.',
    image: '/images/assembly/06-bar.webp',
    alt: 'Барная стойка на хромированной опоре, продолжающая столешницу',
  },
  {
    title: 'Готовая кухня',
    text: 'Подключаем технику, проверяем каждый ящик и дверцу и сдаём кухню. Первый и последний кадр сняты в одной и той же комнате.',
    image: '/images/assembly/07-done.webp',
    alt: 'Готовая угловая кухня с барной стойкой, столешницей и встроенной техникой',
  },
]

const pad = (value: number) => String(value).padStart(2, '0')
const LAST = steps.length - 1

/** Бирка этапа встаёт, когда шторка уже прошла левый нижний угол */
const TAG_AT = 0.85
/** Первый кадр рядом с готовой кухней — следом за биркой, не вместе с ней */
const START_AT = 1.4

/**
 * Первый кадр монтажа в углу готовой кухни: с чего начинали. Подпись под
 * снимком, а не поверх: снимок маленький, и бирка закрыла бы половину
 */
function StartInset({ d, className }: { d: number; className?: string }) {
  return (
    <span className={cn('hs-in absolute flex w-[38%] flex-col overflow-hidden rounded-xl border-2 border-primary bg-foreground shadow-[0_12px_30px_-10px_rgba(0,0,0,0.6)] lg:w-[32%]', className)} style={enter(d, { t: 0.8, from: 'translateY(12px) scale(0.9)' })}>
      <span className="relative block aspect-[4/3] lg:aspect-square">
        <Image src={steps[0].image} alt="" fill sizes="(min-width: 1024px) 180px, 32vw" className="object-cover" />
      </span>
      <span className="plan-tag rounded-none border-0">
        <span className="plan-tag__title hidden lg:block">Этап 01</span>
        <span className="plan-tag__value">Начало монтажа</span>
      </span>
    </span>
  )
}

/** Кадр этапа на закреплённом фото: снимок, бирка, а в конце — первый кадр */
function StageFrame({ step, play }: { step: number; play: boolean }) {
  return (
    <>
      <Image src={steps[step].image} alt="" fill sizes="(min-width: 1024px) 560px, 1px" className="object-cover" />
      {/* Бирка встаёт, когда фото увидели: иначе она отыграла бы, пока человек ещё наверху */}
      {play && (
        <span className="hs-in absolute bottom-4 left-4" style={enter(TAG_AT, POP)}>
          <PlanTag title={`Этап ${pad(step + 1)} из ${pad(steps.length)}`} value={steps[step].title} dot />
        </span>
      )}
      {play && step === LAST && <StartInset d={START_AT} className="bottom-4 right-4" />}
    </>
  )
}

export function AssemblySection() {
  // i — текущий этап, prev — уходящий (виден под шторкой), n — счётчик смен,
  // dir — куда листают
  const [view, setView] = useState({ i: 0, prev: -1, n: 0, dir: 1 })
  // Закреплённое фото увидели — бирки этапов встают только после этого
  const [seen, setSeen] = useState(false)
  // Текущая карточка в ленте на телефоне; -1 — лента ещё не на экране
  const [card, setCard] = useState(-1)
  const items = useRef<(HTMLLIElement | null)[]>([])
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)')
    let observers: IntersectionObserver[] = []

    const setup = () => {
      observers.forEach((observer) => observer.disconnect())
      observers = []
      const stage = stageRef.current

      if (wide.matches && stage) {
        const go = (k: number) => setView((v) => (v.i === k ? v : { i: k, prev: v.i, n: v.n + 1, dir: k > v.i ? 1 : -1 }))
        // Сцена оживает, когда фото видно: иначе бирка встала бы, пока человек ещё наверху
        const start = new IntersectionObserver(([entry]) => entry.isIntersecting && setSeen(true), { threshold: 0.35 })
        // Узкая полоса по центру экрана: активен тот этап, который её пересекает
        const band = new IntersectionObserver(
          (entries) => entries.forEach((entry) => entry.isIntersecting && go(Number((entry.target as HTMLElement).dataset.step))),
          { rootMargin: '-45% 0px -45% 0px' },
        )
        start.observe(stage)
        for (const item of items.current) if (item) band.observe(item)
        observers = [start, band]
        return
      }

      // Лента: текущая — карточка, которую видно хотя бы на 60 %. Видимость
      // считается и по экрану, и по ленте, поэтому за краем ленты или ниже
      // экрана карточка текущей не станет
      const strip = new IntersectionObserver(
        (entries) => entries.forEach((entry) => entry.isIntersecting && setCard(Number((entry.target as HTMLElement).dataset.step))),
        { threshold: 0.6 },
      )
      for (const item of items.current) if (item) strip.observe(item)
      observers = [strip]
    }

    setup()
    wide.addEventListener('change', setup)
    return () => {
      observers.forEach((observer) => observer.disconnect())
      wide.removeEventListener('change', setup)
    }
  }, [])

  const clearPrev = () => setView((v) => (v.prev === -1 ? v : { ...v, prev: -1 }))
  const active = view.i

  return (
    <section id="assembly" className="paper scroll-mt-24 px-4 py-16 md:px-6 md:py-24" aria-labelledby="assembly-title">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10 flex flex-col gap-2 md:mb-14 md:max-w-3xl" data-anim>
          <PlanLabel index={3} className="mb-2">Монтаж</PlanLabel>
          <h2 id="assembly-title" className="flyer-title text-balance text-4xl text-foreground md:text-6xl">
            Как кухня собирается у вас дома
          </h2>
          <p className="max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Семь шагов одного монтажа: от корпусов на плёнке до готовой кухни. Все фото сняты на одном объекте — так это выглядит вживую.
          </p>
        </div>

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Закреплённое фото — только на широком экране */}
          <div className="hidden lg:block" aria-hidden="true">
            <div className="sticky top-28">
              <div className="relative">
                <CropMarks />
                <div ref={stageRef} className="hs relative aspect-square overflow-hidden rounded-3xl border-2 border-primary bg-foreground shadow-xl">
                  {/* Уходящий кадр лежит под шторкой, пока она не дошла */}
                  {[view.prev, view.i]
                    .filter((k) => k >= 0)
                    .map((k) => {
                      const current = k === view.i
                      const wipe = current && view.prev >= 0
                      return (
                        <div
                          key={`${k}-${current ? view.n : view.n - 1}`}
                          className={cn('absolute inset-0 overflow-hidden', current ? 'z-[2]' : 'z-[1]', wipe && 'hs-wipe', wipe && view.dir < 0 && 'hs-wipe--back')}
                          onAnimationEnd={(event) => event.target === event.currentTarget && clearPrev()}
                        >
                          <div className={cn('absolute inset-0', wipe && 'hs-wipe-img')}>
                            <StageFrame step={k} play={seen} />
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
              </div>
              {/* Сколько пройдено: по отрезку на этап, отрезок прочерчивается */}
              <div className="mt-6 flex gap-1.5">
                {steps.map((step, index) => (
                  <span key={step.title} className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border">
                    <span
                      className={cn(
                        'absolute inset-0 origin-left bg-primary transition-transform duration-500 ease-out motion-reduce:transition-none',
                        index <= active ? 'scale-x-100' : 'scale-x-0',
                      )}
                    />
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Телефон и планшет — лента карточек, которую листают вбок: семь
              фото друг под другом растянули бы секцию на несколько экранов.
              Широкий экран — обычный список рядом с закреплённым фото */}
          <ol className="hs -mx-4 flex min-w-0 snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:snap-none lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
            {steps.map((step, index) => (
              <li
                key={step.title}
                ref={(element) => { items.current[index] = element }}
                data-step={index}
                className={cn(
                  'flex w-[82vw] max-w-sm shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-background transition-opacity duration-500 motion-reduce:transition-none',
                  'lg:w-auto lg:max-w-none lg:shrink lg:overflow-visible lg:rounded-none lg:border-0 lg:border-t lg:bg-transparent lg:py-12 lg:first:border-t-0 lg:first:pt-0',
                  index !== active && 'lg:opacity-45',
                )}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted lg:hidden">
                  {/* Карточка стала текущей: фото мягко встаёт на место
                      с лёгкого приближения, бирка этапа выскакивает */}
                  <Image
                    src={step.image}
                    alt={step.alt}
                    fill
                    sizes="(max-width: 1023px) 82vw, 1px"
                    className={cn('object-cover', index === card && 'assembly-settle')}
                  />
                  {/* Название этапа стоит сразу под фото — в бирке только номер */}
                  <span className={cn('absolute bottom-3 left-3', index === card && 'hs-in')} style={enter(0.3, POP)}>
                    <PlanTag value={`Этап ${pad(index + 1)} из ${pad(steps.length)}`} dot />
                  </span>
                  {index === LAST && index === card && <StartInset d={0.9} className="right-3 top-3" />}
                </div>
                <div className="flex gap-4 p-5 md:gap-5 lg:gap-7 lg:p-0">
                  <span className="flyer-title text-4xl tabular-nums leading-none text-primary lg:text-5xl" aria-hidden="true">
                    {pad(index + 1)}
                  </span>
                  <div className="flex flex-col gap-2">
                    <h3 className="flyer-title text-xl leading-tight text-foreground md:text-2xl lg:text-3xl">{step.title}</h3>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground lg:text-base">{step.text}</p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="-mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground lg:hidden">
            Листайте вбок · {steps.length} этапов
          </p>
        </div>
      </div>
    </section>
  )
}
