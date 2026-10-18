'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'
import { AnimatePresence, m } from 'framer-motion'
import { ProjectQuiz, type QuizProduct } from '@/components/project-quiz'
import { EASE_OUT, FormMotion } from '@/components/form-motion'
import { cn } from '@/lib/utils'
import './quiz-doors.css'

/**
 * Экран выбора открывается как шкаф: блик по рейкам, логотип, свет в щели,
 * защёлка, распахивание с доводчиком. Сама раскадровка — в quiz-doors.css:
 * CSS-анимации transform и opacity идут на видеокарте и держат 60 кадров,
 * даже пока страница догружается. Здесь — только разметка.
 *
 * Когда створки перестают ловить клики, мс: полная и короткая версии
 * (синхронизировано с --qd-swing и --qd-swing-dur в quiz-doors.css)
 */
const DOORS_OPEN_MS = { full: (1.7 + 1.5 * 0.6) * 1000, fast: (0.25 + 1.05 * 0.6) * 1000 }
/** Пауза между выбором и началом вопросов: карточка успевает откликнуться */
const PICK_MS = 450
/** Отметка в sessionStorage: вступление уже показывали в этой вкладке */
const SEEN_KEY = 'me-quiz-doors-seen'

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

/** Пылинки в луче из щели. Координаты фиксированы — одинаково при каждом показе */
const DUST = Array.from({ length: 16 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1
  return { x: (r(1) - 0.5) * 180, y: 30 + r(2) * 60, size: 1.5 + r(3) * 2, drift: 50 + r(4) * 90, delay: r(5) * 0.9, dur: 2.2 + r(6) * 1.4 }
})

/** CSS-переменные в style: TypeScript не знает пользовательских свойств */
const vars = (values: Record<string, string>) => values as CSSProperties

/**
 * Створка: рифлёный антрацит, латунный профиль LINE у стыка и половина
 * логотипа. Без отдельного объёмного торца: створка остаётся одной
 * текстурой, которую видеокарта только поворачивает
 */
function Door({ side }: { side: 'left' | 'right' }) {
  const left = side === 'left'
  const letters = Array.from(left ? 'Модуль' : 'Эстет')
  const offset = left ? 0 : 6

  return (
    <div className={cn('qd-door absolute inset-y-0 w-1/2', left ? 'left-0 origin-left' : 'qd-door--right right-0 origin-right')}>
      <span className="absolute inset-0 overflow-hidden">
        <span className="absolute inset-0" style={FLUTED_FACADE} />
        <span className={cn('absolute inset-0', left ? 'bg-gradient-to-r' : 'bg-gradient-to-l', 'from-black/45 via-black/15 to-transparent')} />
        <span className="qd-sweep absolute inset-y-0 left-0 w-[45%] bg-[linear-gradient(100deg,transparent,rgba(255,236,205,0.13)_50%,transparent)]" />
      </span>

      {/* Латунный профиль LINE у стыка: перед открытием накаляется */}
      <span className={cn('absolute inset-y-0 w-2 bg-gradient-to-r from-[#6f5a35] via-[#d8bf8a] to-[#6f5a35]', left ? 'right-0' : 'left-0')}>
        <span className="qd-profile-glow absolute inset-0 bg-[#ffe3ad] shadow-[0_0_18px_4px_rgba(255,214,150,0.55)]" />
      </span>

      <span className={cn('absolute top-1/2 flex -translate-y-1/2 flex-col gap-3 text-[#f4e7cf]', left ? 'right-8 items-end md:right-14' : 'left-8 items-start md:left-14')}>
        <span className="flex text-xl font-semibold uppercase tracking-[0.32em] [text-shadow:0_2px_6px_rgba(0,0,0,0.55)] md:text-4xl">
          {letters.map((letter, i) => (
            <span
              key={i}
              className="qd-letter"
              style={vars({ '--qd-i': String(offset + i), '--qd-spread': `${((i - (letters.length - 1) / 2) * 0.14).toFixed(2)}em` })}
            >
              {letter}
            </span>
          ))}
        </span>
        <span className={cn('qd-underline h-px w-16 bg-primary md:w-28', left ? 'origin-right' : 'origin-left')} />
      </span>
    </div>
  )
}

/** Свет изнутри: тонкая нить в стыке, ореол на фасадах и пылинки в луче */
function SeamLight({ particles }: { particles: boolean }) {
  return (
    <span className="qd-light pointer-events-none absolute inset-0 z-30" aria-hidden="true">
      <span className="qd-halo absolute inset-y-0 left-1/2 w-[340px] bg-[radial-gradient(ellipse_50%_60%_at_50%_50%,rgba(255,206,140,0.42),transparent_70%)] md:w-[560px]" />
      <span className="qd-core absolute inset-y-0 left-1/2 w-[2px] bg-[#fff1d6] shadow-[0_0_24px_6px_rgba(255,214,150,0.8)]" />
      {particles &&
        DUST.map((d, i) => (
          <span
            key={i}
            className="qd-dust absolute rounded-full bg-[#ffeccb]"
            style={vars({
              left: `calc(50% + ${d.x.toFixed(1)}px)`,
              top: `${d.y.toFixed(1)}%`,
              width: `${d.size.toFixed(1)}px`,
              height: `${d.size.toFixed(1)}px`,
              '--qd-delay': `${d.delay.toFixed(2)}s`,
              '--qd-dur': `${d.dur.toFixed(2)}s`,
              '--qd-drift': `${(-d.drift).toFixed(0)}px`,
            })}
          />
        ))}
    </span>
  )
}

/**
 * Карточка выбора с лёгким наклоном за курсором. Наклон пишется прямо
 * в style, без перерисовки компонента на каждое движение мыши
 */
function TiltCard({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const move = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || !ref.current) return
    const box = ref.current.getBoundingClientRect()
    const dx = (event.clientX - box.left) / box.width - 0.5
    const dy = (event.clientY - box.top) / box.height - 0.5
    ref.current.style.transform = `rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 8).toFixed(2)}deg)`
  }
  const reset = () => {
    if (ref.current) ref.current.style.transform = ''
  }
  return (
    <div className="[perspective:1200px]" onPointerMove={move} onPointerLeave={reset}>
      <div ref={ref} className="transition-transform duration-300 ease-out">
        {children}
      </div>
    </div>
  )
}

/**
 * Первый экран квиза — закрытый шкаф. Блик пробегает по рейкам, проявляется
 * логотип, в щели загорается свет, створки отходят на защёлке и распахиваются
 * внутрь, а в подсвеченном нутре — выбор: кухня или шкаф. На узком экране
 * створки уходят совсем.
 */
function QuizChooser({ onChoose }: { onChoose: (product: QuizProduct) => void }) {
  const [picked, setPicked] = useState<QuizProduct | null>(null)
  const [fast, setFast] = useState(false)
  const doorsRef = useRef<HTMLDivElement>(null)
  const spotRef = useRef<HTMLSpanElement>(null)
  const pickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    try {
      if (sessionStorage.getItem(SEEN_KEY)) setFast(true)
      sessionStorage.setItem(SEEN_KEY, '1')
    } catch {
      // Хранилище закрыто — просто покажем полную версию
    }
    return () => clearTimeout(pickTimer.current)
  }, [])

  // Пока створки закрыты, они ловят клик «открыть сразу»; потом пропускают
  // нажатия к карточкам. Пишем прямо в style, без лишней перерисовки
  useEffect(() => {
    const doors = doorsRef.current
    if (!doors) return
    doors.style.pointerEvents = ''
    const timer = setTimeout(() => {
      doors.style.pointerEvents = 'none'
      doors.style.cursor = ''
    }, fast ? DOORS_OPEN_MS.fast : DOORS_OPEN_MS.full)
    return () => clearTimeout(timer)
  }, [fast])

  const pick = (product: QuizProduct) => {
    if (picked) return
    setPicked(product)
    pickTimer.current = setTimeout(() => onChoose(product), PICK_MS)
  }

  // Мягкий свет внутри шкафа следует за курсором — сдвигом слоя, без перерисовки фона
  const followLight = (event: ReactPointerEvent<HTMLDivElement>) => {
    const spot = spotRef.current
    if (event.pointerType !== 'mouse' || !spot) return
    const box = event.currentTarget.getBoundingClientRect()
    spot.style.transform = `translate3d(${event.clientX - box.left - 520}px, ${event.clientY - box.top - 520}px, 0)`
    spot.style.opacity = '1'
  }

  const at = (seconds: number) => vars({ '--qd-at': `${seconds}s` })

  return (
    <m.section aria-labelledby="quiz-choose-title" data-own-motion className="bg-[#0b0a09] pt-16 md:pt-20" exit={{ opacity: 0, transition: { duration: 0.3 } }}>
      {/* key: при переходе на короткую версию раскадровка начинается заново —
          створки в этот момент ещё закрыты, так что подмены не видно */}
      <div
        key={fast ? 'fast' : 'full'}
        onPointerMove={followLight}
        className={cn('qd relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden bg-[#161412] md:min-h-[calc(100dvh-5rem)]', fast && 'qd--fast')}
      >
        {/* Нутро шкафа: тёплая подсветка сверху, свет за курсором, тень пола */}
        <span
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_0%,color-mix(in_oklab,var(--primary)_32%,transparent),transparent_70%)]"
          aria-hidden="true"
        />
        <span
          ref={spotRef}
          className="pointer-events-none absolute left-0 top-0 size-[1040px] rounded-full bg-[radial-gradient(circle,rgba(255,214,160,0.07),transparent_65%)] opacity-0 transition-opacity duration-500"
          aria-hidden="true"
        />
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
        <span
          className="qd-led pointer-events-none absolute inset-x-[16%] top-0 h-0.5 rounded-full bg-primary shadow-[0_0_48px_14px_color-mix(in_oklab,var(--primary)_55%,transparent)]"
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-[min(58rem,100%)] flex-1 flex-col justify-center px-4 py-8 md:w-[58vw] md:py-12">
          <div className="mb-6 text-center text-background md:mb-10">
            <p className="qd-rise text-[11px] font-bold uppercase tracking-[0.26em] text-primary md:text-xs">Бесплатный расчёт · около минуты</p>
            <h1 id="quiz-choose-title" className="flyer-title mt-3 overflow-hidden pb-1 text-4xl md:text-6xl">
              <span className="qd-mask inline-block">Что рассчитываем?</span>
            </h1>
            <p className="qd-rise mx-auto mt-3 max-w-md text-sm leading-relaxed text-background/60 md:text-base" style={at(0.2)}>
              Выберите — и вопросы подстроятся под вашу задачу.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {options.map((option, index) => {
              const isPicked = picked === option.product
              const dimmed = picked !== null && !isPicked
              const delay = at(0.25 + index * 0.14)
              return (
                <div key={option.product} className="qd-card" style={delay}>
                  <TiltCard>
                    <button
                      type="button"
                      onClick={() => pick(option.product)}
                      className={cn(
                        'group relative flex h-[clamp(14rem,34dvh,18rem)] w-full flex-col justify-end overflow-hidden rounded-3xl border border-primary/30 text-left text-background shadow-[0_24px_48px_-24px_rgba(0,0,0,0.9)] outline-none transition duration-500 ease-out md:h-[min(34rem,56dvh)]',
                        'hover:-translate-y-1.5 hover:border-primary focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/40',
                        isPicked && 'scale-[1.02] border-primary',
                        dimmed && 'opacity-30',
                      )}
                    >
                      <span className="absolute inset-0 transition-transform duration-[1200ms] ease-out group-hover:scale-105">
                        <Image src={option.image} alt={option.alt} fill priority sizes="(max-width: 768px) 100vw, 32vw" className="object-cover" />
                      </span>
                      <span className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/5" aria-hidden="true" />
                      {/* Подсветка по верхнему краю — включается вслед за LED шкафа */}
                      <span className="absolute inset-x-6 top-0 h-px opacity-60 transition-opacity duration-500 group-hover:opacity-100" aria-hidden="true">
                        <span className="qd-card-led block h-full bg-primary shadow-[0_0_24px_6px_color-mix(in_oklab,var(--primary)_60%,transparent)]" style={delay} />
                      </span>

                      <span className="relative flex flex-col gap-2.5 p-5 md:gap-3 md:p-8">
                        <span className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary [text-shadow:0_1px_6px_rgba(0,0,0,0.8)] md:text-xs">{option.meta}</span>
                        <span className="flyer-title text-5xl leading-none md:text-7xl">{option.title}</span>
                        <span className="max-w-sm text-pretty text-sm leading-relaxed text-background/75 max-md:hidden">{option.text}</span>
                        <span className="flex flex-wrap gap-1.5" aria-label="О чём спросим">
                          {option.asks.map((item) => (
                            <span key={item} className="rounded-full border border-background/25 bg-black/35 px-2.5 py-1 text-[11px] text-background/85 md:text-xs">
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
                  </TiltCard>
                </div>
              )
            })}
          </div>

          <p className="qd-rise mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-background/55 md:mt-8" style={at(0.75)}>
            {['Бесплатно', 'Ни к чему не обязывает', 'Ответы сохраняются'].map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <Check className="size-3.5 text-primary" aria-hidden="true" />
                {item}
              </span>
            ))}
          </p>
        </div>

        {/* Темнота внутри закрытого шкафа — уходит, когда створки открываются */}
        <span className="qd-dark pointer-events-none absolute inset-0 z-[15] bg-black" aria-hidden="true" />

        {/* Створки. Пока закрыты, клик по ним открывает шкаф сразу */}
        <div
          ref={doorsRef}
          className="qd-doors absolute inset-0 z-20 cursor-pointer"
          onClick={() => !fast && setFast(true)}
          aria-hidden="true"
        >
          {/* Перспектива — на прямом родителе створок: на более дальних предков CSS её не распространяет */}
          <div className="absolute inset-0 [perspective:1800px]">
            <Door side="left" />
            <Door side="right" />
          </div>
        </div>
        <SeamLight particles={!fast} />
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
