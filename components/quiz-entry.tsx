'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { ProjectQuiz, type QuizProduct } from '@/components/project-quiz'
import { EASE_OUT, FormMotion } from '@/components/form-motion'
import { cn } from '@/lib/utils'

/** Кривая створок: тяжёлая дверца трогается медленно и мягко доходит до упора */
const EASE_DOOR = [0.65, 0, 0.25, 1] as const
/** Когда створки начинают открываться и сколько длится поворот, с */
const DOOR_DELAY = 0.85
const DOOR_SWING = 1.3
/** Угол открытых створок: на широком экране они остаются по краям, как стенки шкафа */
const DOOR_ANGLE = 84
/** Пауза между выбором и началом вопросов: карточка успевает откликнуться */
const PICK_MS = 450

const options: Array<{
  product: QuizProduct
  image: string
  alt: string
  meta: string
  title: string
  text: string
  asks: string[]
  cta: string
}> = [
  {
    product: 'kitchen',
    image: '/quiz-options/choose-kitchen.webp',
    alt: 'Кухня с фасадами под дерево и чёрным мраморным фартуком',
    meta: '5 вопросов · около минуты',
    title: 'Кухня',
    text: 'Дизайнер предложит планировку, материалы и посчитает стоимость.',
    asks: ['Планировка', 'Размер', 'Стиль', 'Техника', 'Сроки'],
    cta: 'Рассчитать кухню',
  },
  {
    product: 'wardrobe',
    image: '/quiz-options/choose-wardrobe.webp',
    alt: 'Шкаф до потолка с подсвеченной нишей',
    meta: '6 вопросов · около минуты',
    title: 'Шкаф',
    text: 'Гардеробная, прихожая, спальня или гостиная — фасады и наполнение под ваши вещи.',
    asks: ['Комната', 'Тип шкафа', 'Ширина', 'Фасады', 'Наполнение'],
    cta: 'Рассчитать шкаф',
  },
]

/**
 * Рифлёный фасад Velvet в цвете «Пула»: тёмная основа и вертикальные рейки —
 * блик на грани, тень в желобке
 */
const FLUTED_FACADE = {
  backgroundColor: '#33302e',
  backgroundImage:
    'repeating-linear-gradient(90deg, rgba(255,255,255,0.09) 0 2px, rgba(0,0,0,0.28) 2px 10px, rgba(255,255,255,0.02) 10px 13px)',
}

/**
 * Створка шкафа: рифлёный антрацит, латунный профиль LINE у стыка и половина
 * логотипа. Пока створка поворачивается, на неё ложится тень
 */
function Door({ side, angle }: { side: 'left' | 'right'; angle: number }) {
  const left = side === 'left'
  return (
    <m.div
      className={cn('absolute inset-y-0 w-1/2', left ? 'left-0 origin-left' : 'right-0 origin-right')}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: left ? angle : -angle }}
      transition={{ duration: DOOR_SWING, ease: EASE_DOOR, delay: DOOR_DELAY }}
    >
      <span className="absolute inset-0" style={FLUTED_FACADE} aria-hidden="true" />
      {/* Объём: свет падает к стыку, края уходят в тень */}
      <span
        className={cn('absolute inset-0', left ? 'bg-gradient-to-r' : 'bg-gradient-to-l', 'from-black/45 via-black/15 to-transparent')}
        aria-hidden="true"
      />
      <m.span
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: DOOR_SWING, ease: EASE_DOOR, delay: DOOR_DELAY }}
        aria-hidden="true"
      />
      {/* Латунный профиль LINE — ручка вдоль всего стыка */}
      <span
        className={cn(
          'absolute inset-y-0 w-2 bg-gradient-to-r from-[#6f5a35] via-[#d8bf8a] to-[#6f5a35] shadow-[0_0_14px_rgba(168,138,92,0.45)]',
          left ? 'right-0' : 'left-0',
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'absolute top-1/2 flex -translate-y-1/2 flex-col gap-3 text-[#f4e7cf]',
          left ? 'right-8 items-end md:right-14' : 'left-8 items-start md:left-14',
        )}
        aria-hidden="true"
      >
        <span className="text-xl font-semibold uppercase tracking-[0.32em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)] md:text-4xl">
          {left ? 'Модуль' : 'Эстет'}
        </span>
        <span className="h-px w-16 bg-primary md:w-28" />
      </span>
    </m.div>
  )
}

/**
 * Первый экран квиза — закрытый шкаф. В щели загорается подсветка, створки
 * распахиваются, внутри — выбор: кухня или шкаф. На узком экране створки
 * уходят совсем, на широком остаются по краям, как стенки шкафа.
 */
function QuizChooser({ onChoose }: { onChoose: (product: QuizProduct) => void }) {
  const [picked, setPicked] = useState<QuizProduct | null>(null)
  const [narrow, setNarrow] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setNarrow(window.matchMedia('(max-width: 767px)').matches)
    return () => clearTimeout(timer.current)
  }, [])

  const pick = (product: QuizProduct) => {
    if (picked) return
    setPicked(product)
    timer.current = setTimeout(() => onChoose(product), PICK_MS)
  }

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 28 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT, delay } },
  })

  return (
    <m.section
      aria-labelledby="quiz-choose-title"
      className="bg-foreground pt-16 md:pt-20"
      exit={{ opacity: 0, transition: { duration: 0.3 } }}
    >
      <div className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#161412] md:min-h-[calc(100dvh-5rem)]">
        {/* Нутро шкафа: тёплая подсветка сверху */}
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_70%)]"
          aria-hidden="true"
        />
        <m.span
          className="pointer-events-none absolute inset-x-[16%] top-0 h-0.5 rounded-full bg-primary shadow-[0_0_48px_14px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8, delay: DOOR_DELAY + 0.3 } }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[min(58rem,100%)] flex-1 flex-col justify-center px-4 py-8 md:w-[58vw] md:py-12">
          <m.div className="mb-6 text-center text-background md:mb-10" {...reveal(DOOR_DELAY + 0.55)}>
            <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-primary md:text-xs">Бесплатный расчёт · около минуты</p>
            <h1 id="quiz-choose-title" className="flyer-title mt-3 text-4xl md:text-6xl">
              Что рассчитываем?
            </h1>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-background/60 md:text-base">
              Выберите — и вопросы подстроятся под вашу задачу.
            </p>
          </m.div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {options.map((option, index) => {
              const isPicked = picked === option.product
              const dimmed = picked !== null && !isPicked
              return (
                <m.div key={option.product} {...reveal(DOOR_DELAY + 0.7 + index * 0.12)}>
                  <button
                    type="button"
                    onClick={() => pick(option.product)}
                    className={cn(
                      'group relative flex h-[clamp(14rem,34dvh,18rem)] w-full flex-col justify-end overflow-hidden rounded-3xl border border-primary/30 text-left text-background shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)] outline-none transition duration-500 ease-out md:h-[min(34rem,56dvh)]',
                      'hover:-translate-y-1.5 hover:border-primary focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/40',
                      isPicked && 'scale-[1.02] border-primary',
                      dimmed && 'opacity-30',
                    )}
                  >
                    <span className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                      <Image src={option.image} alt={option.alt} fill priority sizes="(max-width: 768px) 100vw, 32vw" className="object-cover" />
                    </span>
                    <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" aria-hidden="true" />
                    {/* Подсветка по верхнему краю карточки — как LED в секции шкафа */}
                    <span
                      className="absolute inset-x-6 top-0 h-px bg-primary opacity-0 shadow-[0_0_24px_6px_color-mix(in_oklab,var(--primary)_60%,transparent)] transition-opacity duration-500 group-hover:opacity-100"
                      aria-hidden="true"
                    />

                    <span className="relative flex flex-col gap-2.5 p-5 md:gap-3 md:p-8">
                      <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)] md:text-xs">{option.meta}</span>
                      <span className="flyer-title text-5xl leading-none md:text-7xl">{option.title}</span>
                      <span className="max-w-sm text-pretty text-sm leading-relaxed text-background/75 max-md:hidden">{option.text}</span>
                      <span className="flex flex-wrap gap-1.5" aria-label="О чём спросим">
                        {option.asks.map((item) => (
                          <span key={item} className="rounded-full border border-background/25 bg-black/20 px-2.5 py-1 text-[11px] text-background/85 backdrop-blur-sm md:text-xs">
                            {item}
                          </span>
                        ))}
                      </span>
                      <span className="mt-1.5 inline-flex min-h-12 w-fit items-center gap-3 rounded-full bg-primary pl-6 pr-1.5 text-sm font-bold text-primary-foreground transition-colors duration-300 group-hover:bg-background group-hover:text-foreground md:mt-3 md:text-base">
                        {option.cta}
                        <span className="flex size-9 items-center justify-center rounded-full bg-foreground/15">
                          <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-0.5" aria-hidden="true" />
                        </span>
                      </span>
                    </span>
                  </button>
                </m.div>
              )
            })}
          </div>

          <m.p
            className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-background/55 md:mt-8"
            {...reveal(DOOR_DELAY + 1)}
          >
            {['Бесплатно', 'Ни к чему не обязывает', 'Ответы сохраняются'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {item}
              </span>
            ))}
          </m.p>
        </div>

        {/* Створки поверх нутра. Нажатия не перехватывают: пока они закрыты,
            карточки под ними ещё прозрачны, а потом створки уходят в стороны */}
        <div className="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          {/* Перспектива — на прямом родителе створок: на более дальних предков
              CSS её не распространяет */}
          <m.div
            className="absolute inset-0 [perspective:1800px]"
            initial={{ opacity: 1 }}
            animate={{ opacity: narrow ? 0 : 1 }}
            transition={{ duration: 0.45, delay: DOOR_DELAY + DOOR_SWING * 0.55 }}
          >
            <Door side="left" angle={narrow ? 96 : DOOR_ANGLE} />
            <Door side="right" angle={narrow ? 96 : DOOR_ANGLE} />
          </m.div>
          {/* Свет изнутри пробивается в щель между створками — поверх них */}
          <m.span
            className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-primary shadow-[0_0_28px_8px_color-mix(in_oklab,var(--primary)_70%,transparent)]"
            initial={{ scaleY: 0, opacity: 0 }}
            animate={{ scaleY: [0, 1, 1], opacity: [0, 1, 0] }}
            transition={{ duration: DOOR_DELAY + 0.5, times: [0, 0.55, 1], ease: 'easeOut', delay: 0.15 }}
          />
        </div>
      </div>
    </m.section>
  )
}

/**
 * Квиз со входом через выбор «кухня или шкаф». Выбор пишется в адрес
 * (?type=…), чтобы после обновления страницы человек остался в своём квизе,
 * а ссылки со страницы шкафов вели сразу в нужные вопросы.
 */
export function QuizEntry({ initialProduct }: { initialProduct: QuizProduct | null }) {
  const [product, setProduct] = useState<QuizProduct | null>(initialProduct)

  const choose = (next: QuizProduct) => {
    setProduct(next)
    window.history.replaceState(null, '', `/quiz?type=${next}`)
    window.scrollTo({ top: 0 })
  }

  const changeProduct = () => {
    setProduct(null)
    window.history.replaceState(null, '', '/quiz')
    window.scrollTo({ top: 0 })
  }

  return (
    <FormMotion>
      <AnimatePresence mode="wait">
        {product ? (
          <m.div
            key={product}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.45, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
            <ProjectQuiz product={product} onChangeProduct={changeProduct} />
          </m.div>
        ) : (
          <QuizChooser key="chooser" onChoose={choose} />
        )}
      </AnimatePresence>
    </FormMotion>
  )
}
