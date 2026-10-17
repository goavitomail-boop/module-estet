'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { CropMarks, PlanLabel, PlanTag } from '@/components/plan'
import { cn } from '@/lib/utils'

/**
 * Этапы монтажа кухни — семь кадров с одного объекта.
 *
 * На широком экране фото закреплено слева и сменяется вслед за этапом,
 * который сейчас читают справа. На планшете и телефоне закреплять нечего:
 * у каждого этапа своё фото над текстом.
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

export function AssemblySection() {
  const [active, setActive] = useState(0)
  const items = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    // Следим за прокруткой только там, где фото закреплено сбоку
    const wide = window.matchMedia('(min-width: 1024px)')
    let observer: IntersectionObserver | null = null

    const setup = () => {
      observer?.disconnect()
      observer = null
      if (!wide.matches) return
      // Узкая полоса по центру экрана: активен тот этап, который её пересекает
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(Number((entry.target as HTMLElement).dataset.step))
          }
        },
        { rootMargin: '-45% 0px -45% 0px' },
      )
      for (const item of items.current) if (item) observer.observe(item)
    }

    setup()
    wide.addEventListener('change', setup)
    return () => {
      observer?.disconnect()
      wide.removeEventListener('change', setup)
    }
  }, [])

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
                <div className="relative aspect-square overflow-hidden rounded-3xl border-2 border-primary bg-foreground shadow-xl">
                  {steps.map((step, index) => (
                    <Image
                      key={step.image}
                      src={step.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 560px, 1px"
                      className={cn(
                        'object-cover transition-opacity duration-700 motion-reduce:transition-none',
                        index === active ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                  ))}
                  <PlanTag
                    title={`Этап ${pad(active + 1)} из ${pad(steps.length)}`}
                    value={steps[active].title}
                    dot
                    className="absolute bottom-4 left-4"
                  />
                </div>
              </div>
              {/* Сколько пройдено: по отрезку на этап */}
              <div className="mt-6 flex gap-1.5">
                {steps.map((step, index) => (
                  <span
                    key={step.title}
                    className={cn('h-0.5 flex-1 rounded-full transition-colors duration-500', index <= active ? 'bg-primary' : 'bg-border')}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Телефон и планшет — лента карточек, которую листают вбок: семь
              фото друг под другом растянули бы секцию на несколько экранов.
              Широкий экран — обычный список рядом с закреплённым фото */}
          <ol className="-mx-4 flex min-w-0 snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 md:-mx-6 md:scroll-px-6 md:px-6 lg:mx-0 lg:snap-none lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 lg:pb-0">
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
                  <Image src={step.image} alt={step.alt} fill sizes="(max-width: 1023px) 82vw, 1px" className="object-cover" />
                  {/* Название этапа стоит сразу под фото — в бирке только номер */}
                  <PlanTag value={`Этап ${pad(index + 1)} из ${pad(steps.length)}`} dot className="absolute bottom-3 left-3" />
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
